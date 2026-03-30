const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { authRouter } = require("./routes/auth.routes");
const { Server } = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");
const { User } = require("./models/user.model");
require("dotenv").config();
const { Chess } = require("chess.js");
const { leaderboardRouter } = require("./routes/leaderboard.routes");
const { profile } = require("console");
const parser = require("./utility/upload");
const { verifyAuth } = require("./middleware/verifyAuth");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/leaderboard", leaderboardRouter);
app.post("api/v1/upload", verifyAuth, parser.single("file"), (req, res) => {
  // something inside upload.
  try {
    const url = req.file.path;
    return res.status(200).json({ avatar: url });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});


const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

// Socket.io middleware
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";
    // cookieHeader = "cookie1=value1;cookie2=value2;accessToken=tokenValue;..."
    const cookiesArray = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        let idx = c.indexOf("=");
        //     [cookie name    , cookie value]
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      });
    // cookiesArray = [["cookie1", "value1"], ["cookie2", "value2"], ["accessToken", "tokenValue"] .... ]
    const cookies = Object.fromEntries(cookiesArray);
    // cookies = {cookie1: value1, cookie2: value2, accessToken: tokenValue, .......}
    let { accessToken } = cookies;
    if (!accessToken) {
      return next(new Error("Missing accessToken"));
    }
    const payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    // payload : { sub: value user._id, role: "USER" | "ADMIN" }
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) {
      return next(new Error("Unable to find user"));
    }
    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error("Unauthorized"));
  }
});

// helper function

function getPublicRoom(room) {
  return {
    roomCode: room.roomCode,
    players: room.players.map((p) => ({ userId: p.userId, name: p.name })),
    status: room.status,
    createdAt: room.createdAt,
    fen: room.fen,
    whiteId: room.whiteId,
    blackId: room.blackId,
    lastMove: room.lastMove,
  };
}
function getPublicState(room) {
  return {
    roomCode: room.roomCode,
    fen: room.game.fen(),
    turn: room.game.turn(),
    whiteId: room.whiteId,
    blackId: room.blackId,
    lastMove: room.lastMove,
  };
}

function getPublicClock(room) {
  return {
    ...room.clock,
    roomCode: room.roomCode,
  };
}

// helper function
function getRoomCode(len = 6) {
  let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
// map of all the rooms, stored in memory
const rooms = new Map();
// roomCode -> room
// roomCode -> {roomCode, players: [{userId, socketId, name}], status: "waiting" | "ready", createdAt}

async function saveGameDetailsToUser(room , result, reason) {
   const whiteId = rooms.whiteId;
   const blackId = rooms.blackId;
   const white = await User.findById(whiteId);
   const black = await User.findById(blackId);

    if (result === "draw") {
    white.stats.draws += 1;
    white.stats.gamesPlayed += 1;
    white.stats.currentStreak = 0;
    black.stats.draws += 1;
    black.stats.gamesPlayed += 1;
    black.stats.currentStreak = 0;
  } else if (result === "white") {
    white.stats.wins += 1;
    white.stats.gamesPlayed += 1;
    white.stats.currentStreak += 1;
    white.stats.bestStreak = Math.max(
      white.stats.bestStreak,
      white.stats.currentStreak,
    );
    black.stats.losses += 1;
    black.stats.gamesPlayed += 1;
    black.stats.currentStreak = 0;
  } else if (result === "black") {
    black.stats.wins += 1;
    black.stats.gamesPlayed += 1;
    black.stats.currentStreak += 1;
    black.stats.bestStreak = Math.max(
      black.stats.bestStreak,
      black.stats.currentStreak,
    );
    white.stats.losses += 1;
    white.stats.gamesPlayed += 1;
    white.stats.currentStreak = 0;
  }
  await white.save();
  await black.save();

}

io.on("connection", (socket) => {
  console.log(`A user connected on socket ${socket.id}`);

  // handler for the event -> "room:create"
  socket.on("room:create", (ack) => {
    try {
      let roomCode = getRoomCode();
      // Creating new room code until we get to a unique code
      // Find a better approach for scaling
      while (rooms.has(roomCode)) {
        roomCode = getRoomCode();
      }
      const newRoom = {
        roomCode,
        players: [],
        status: "waiting",
        createdAt: Date.now(),
        game: new Chess(),
        fen: new Chess().fen(),
        whiteId: null,
        blackId: null,
        lastMove: null,
      };
      socket.join(roomCode);
      newRoom.players.push({
        name: socket.user.name,
        socketId: socket.id,
        userId: socket.user._id,
      });

      // All the clock related information
         const baseMs = 5 * 60 * 1000;
         const incremetnMs = 0;
         newRoom.timeControl = {baseMs, incremetnMs};
         newRoom.clock = {
          whiteMs: baseMs,
          blackMs: baseMs,
          active: "w",
          lastSwitchAt: null,
          running: false,
         };

      rooms.set(roomCode, newRoom);
      io.to(roomCode).emit("room:presence", getPublicRoom(newRoom));
      return ack?.({ ok: true, room: getPublicRoom(newRoom) });
    } catch (err) {
      return ack?.({ ok: false, message: err.message || "Create room failed" });
    }
  });

  socket.on("room:join", (roomCode, ack) => {
    try {
      console.log(`A user tried to join the room ${roomCode}`);
      const existingRoom = rooms.get(roomCode);
      if (!existingRoom) {
        return ack?.({ ok: false, message: "Room does not exist" });
      }
      const already = existingRoom.players.some(
        (p) => p.userId.toString() === socket.user._id.toString(),
      );
      if (!already) {
        if (existingRoom.players.length === 2) {
          return ack?.({ ok: false, message: "Room is full" });
        }
        existingRoom.players.push({
          userId: socket.user._id,
          name: socket.user.name,
          socketId: socket.id,
        });
      } else {
        existingRoom.players = existingRoom.players.map((p) => {
          if (p.userId.toString() === socket.user._id.toString()) {
            return { ...p, socketId: socket.id };
          }
          return p;
        });
      }
      // existingRoom.status =
      //   existingRoom.players.length === 2 ? "ready" : "waiting";
      if (existingRoom.players.length === 2) {
        existingRoom.status = "ready";
        existingRoom.whiteId = existingRoom.players[0].userId;
        existingRoom.blackId = existingRoom.players[1].userId;  

        //initializing the clock
        existingRoom.clock.running = true;
        existingRoom.clock.lastSwitchAt = Date.now();
        existingRoom.clock.active = "w";

      }
      socket.join(roomCode);
      io.to(roomCode).emit("clock:update", getPublicClock(existingRoom));
      io.to(roomCode).emit("room:presence", getPublicRoom(existingRoom));
      return ack?.({ ok: true, room: getPublicRoom(existingRoom) });
    } catch (err) {
      return ack?.({
        ok: false,
        message: err.message || "Failed to join the room",
      });
    }
  });

  // "room:leave" - event handler
  socket.on("room:leave", (roomCode, ack) => {
    try {
      // Goal: remove the current user from the room
      // If room does not exist return with error: { ok: false, message: "Room does not exist" }
      const room = rooms.get(roomCode);
      if (!room) {
        return ack?.({ ok: false, message: "Room does not exist" });
      }
      // Remove the user by filtering out the player from the room.players
      room.players = room.players.filter(
        (p) => p.userId.toString() !== socket.user._id.toString(),
      );
      // Update the status of the room
      room.status = room.players.length === 2 ? "ready" : "waiting";
      // If room is empty rooms.delete(roomCode)
      socket.leave(roomCode);
      io.to(roomCode).emit("room:presence", getPublicRoom(room));
      if (room.players.length === 0) {
        rooms.delete(roomCode);
        return ack?.({ ok: true });
      }
      return ack?.({ ok: true, room: getPublicRoom(room) });
    } catch (err) {
      return ack?.({ ok: false, message: "Failed to leave room" });
    }
  });

  // "disconnect"

  // Game related events
  socket.on("game:state", (roomCode, ack) => {
    const room = rooms.get(roomCode);
    if (!room) return ack?.({ ok: false, message: "Room does not exist" });
    return ack?.({ ok: true, 
      state: getPublicState(room), 
      clock: getPublicClock(room),
     });
  });

  socket.on("game:move", async (roomCode, from, to, promotion, ack) => {
    try {
      const room = rooms.get(roomCode);
      if (!room) return ack?.({ ok: false, message: "Room does not exist" });

       if (!room.whiteId || !room.blackId) {
        return ack?.({ ok: false, message: "Wait for other player to join" });
      }
      let player = "none";
      if (socket.user._id.toString() === room.whiteId.toString()) {
        player = "w";
      } else if (socket.user._id.toString() === room.blackId.toString()) {
        player = "b";
      }
      if (player === "none") {
        return ack?.({ ok: false, message: "Invalid user" });
      }
      const turn = room.game.turn(); // 'w' or 'b'
      if (player !== turn) {
        return ack?.({ ok: false, message: "Not your turn" });
      }
      const move = room.game.move({
        from,
        to,
        promotion: "q",
      });
      if (!move) {
        return ack?.({ ok: false, message: "Invalid move" });
      }
      room.lastMove = { from, to, san: move.san };

      // update the clock
         const now = Date.now();
         const elapsed = now - room.clock.lastSwitchAt;
         if(player === "w"){
          room.clock.whiteMs -= elapsed;
          room.clock.whiteMs += room.timeControl.incremetnMs;
          room.clock.active = "b";
         } else {
          room.clock.blackMs -= elapsed;
          room.clock.blackMs += room.timeControl.incremetnMs;
          room.clock.active = "w";
         }

   ///clamp the times
   room.clock.whiteMs = Math.max(0, room.clock.whiteMs);
   room.clock.blackMs = Math.max(0, room.clock.blackMs);
   room.clock.lastSwitchAt = now;

   io.to(roomCode).emit("clock:update", getPublicClock(room));
   if(room.clock.whiteMs === 0 || room.clock.blackMs === 0){

    /// game is over
    room.clock.running = false;
    const result = room.clock.whiteMs === 0 ? "black" : "white";
    const reason = "timeout";
    const game = new game({
         roomCode,
         whiteId: room.whiteId,
         blackId: room.blackId,
         reason,
         result,
         startedAt: new Date(room.createdAt),
         endedAt: Date.now(),
         duration: Date.now() - room.createdAt,

    });

    await game.save();
    await saveGameDetailsToUser(room, result, reason);
    io.to(roomCode).emit("game:over",result);
   }


      io.to(roomCode).emit("game:update", getPublicState(room));
      // check if the game is over or not
      if (room.game.isGameOver()) {
        let reason = "checkmate";
        let result = "draw";
        if (room.game.isCheckmate()) {
          reason = "checkmate";
          result = turn === "w" ? "white" : "black";
        }
        else if (room.game.isDraw()) {
          result = "draw";
          reason = "draw";
        }
        const game = new game({
          roomCode,
          whiteId: room.whiteId,
          blackId: room.blackId,
          reason,
          result,
          startedAt: new Date(room.createdAt),
          endedAt: Date.now(),
          duration: Date.now() - room.createdAt,
        });
        await game.save();

        await saveGameDetailsToUser(room, result, reason);
        io.to(roomCode).emit("game:over", result);
      }
    } catch (err) {
      return ack?.({
        ok: false,
        message: err.message || "Unable to make the move",
      });
    }
  });
});
server.listen(PORT, () => console.log("Sever is listening on port", PORT));
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Successfully connected to DB"))
  .catch((err) => console.log("Failed to connect to DB", err.message));