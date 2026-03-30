import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { connectSocket, socket } from "../socket";
import { useSelector } from "react-redux";
import { Chessboard } from "@gustavotoyota/react-chessboard";

export const Room = () => {
  const { roomCode } = useParams();
  const [room, setRoom] = useState(null);
  const [fen, setFen] = useState(null);
  const [turn, setTurn] = useState(null);
  const [color, setColor] = useState(null);
  const [whiteMs, setWhiteMs] = useState(null);
  const [blackMs , setBlackMs] = useState(null);
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    connectSocket();

    socket.emit("room:join", roomCode, (response) => {
      if (!response?.ok)
        return alert(response?.message || "Failed to join room");
      setRoom(response.room);
    });

    socket.emit("game:state", roomCode, (response) => {
      if (!response?.ok)
        return alert(response?.message || "Failed to fetch game state");
      setFen(response?.state?.fen);
      setTurn(response?.state?.turn);
       setColor(
        user._id.toString() === response?.state?.whiteId?.toString() ? "White" : "Black",
      );

      setWhiteMs(response?.clock?.whiteMs);
      setBlackMs(response?.clock?.blackMs);
    });

    const onPresence = (data) => {
      setRoom(data);
    };

    socket.on("room:presence", onPresence);

    const onUpdate = (state) => {
      console.log(state.fen);
      setFen(state.fen);
      setTurn(state.turn);
    };

    socket.on("game:update", onUpdate);
    
    // Add "game:over" event listener
    const onEnd = (result) => {
      alert(result);
    };
    socket.on("game:over", onEnd);
   

    function onClock(c){
      if(roomCode !== c.roomCode) return;
      setWhiteMs(c.whiteMs);
      setBlackMs(c.blackMs);
    }

    socket.on("clock:update", onClock)

    return () => {
      socket.off("room:presence", onPresence);
      socket.off("game:update", onUpdate);
      socket.off("game:over", onEnd);
      socket.off("clock:update", onClock);
    };
  }, [roomCode, room?.whiteId, user._id]);

  function leaveRoom() {
    // connect to the socket if not connected -> connectSocket()
    connectSocket();
    // emit a "room:leave" event with roomCode and acknowledgment () as payload
    socket.emit("room:leave", roomCode, (response) => {
      if (!response?.ok)
        return alert(response?.message || "Failed to leave room");
      // redirect to the lobby
      setRoom(response?.room);
      navigate("/lobby");
    });
  }

  // We emit "game:move"
  function onDrop(sourceSquare, targetSquare) {
    connectSocket();
    if (!fen) return false;
    socket.emit(
      "game:move",
      roomCode,
      sourceSquare,
      targetSquare,
      "q",
      (response) => {
        if (!response?.ok) return alert(response?.message || "Invalid move");
      },
    );

    return true;
  }

  function convertTime(ms) {
    if (!ms) return "--:--";
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(Math.floor(total % 60)).padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div>
      <h1 className="text-3xl">Room: {roomCode}</h1>
      <p>Status: {room?.status}</p>
      <ul>
        {room?.players.map((p) => (
          <li>{p.userId === user._id ? p.name + "(Me)" + color : p.name}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        {/* {room?.status === "ready" && (
          <button className="bg-green-400 p-2 rounded">Start Game</button>
        )} */}
        <button onClick={leaveRoom} className="bg-red-400 p-2 rounded">
          Leave
        </button>
      </div>
      {room?.status === "ready" && (
        <div className="w-[480px]">
          <div>Turn: {turn === "w" ? "White" : "Black"}</div>
          <p>White Time left: {convertTime(whiteMs)}</p>
          <p>Black Time left: {convertTime(blackMs)}</p>
          <Chessboard
            id="room-board"
            position={fen || "start"}
            onPieceDrop={onDrop}
          />
        </div>
      )}
    </div>
  );
};
