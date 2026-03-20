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
      };
      socket.join(roomCode);
      newRoom.players.push({
        name: socket.user.name,
        socketId: socket.id,
        userId: socket.user._id,
      });
      rooms.set(roomCode, newRoom);
      io.to(roomCode).emit("room:presence", newRoom);
      return ack?.({ ok: true, room: newRoom });
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
      existingRoom.status =
        existingRoom.players.length === 2 ? "ready" : "waiting";
      socket.join(roomCode);
      io.to(roomCode).emit("room:presence", existingRoom);
      return ack?.({ ok: true, room: existingRoom });
    } catch (err) {
      return ack?.({
        ok: false,
        message: err.message || "Failed to join the room",
      });
    }
  });

  // "room:leave" - event handler
  socket.on("room:leave", (roomCode, ack) => {
    // Goal: remove the current user from the room
    // If room does not exist return with error: { ok: false, message: "Room does not exist" }
    // Remove the user by filtering out the player from the room.players
    // If room is empty rooms.delete(roomCode)
  });
});

server.listen(PORT, () => console.log("Sever is listening on port", PORT));
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Successfully connected to DB"))
  .catch((err) => console.log("Failed to connect to DB", err.message));