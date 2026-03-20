import { useState } from "react";
import { connectSocket, socket } from "../socket";
import { useNavigate } from "react-router-dom";

export const Lobby = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  function createRoom() {
    connectSocket();
    socket.emit("room:create", (response) => {
      if (!response?.ok) return alert(response.message);
      // navigate to -> /rooms/:roomCode
      navigate(`/rooms/${response.room.roomCode}`);
    });
  }

  function joinRoom() {
    connectSocket();
    socket.emit("room:join", roomCode, (response) => {
      if (!response?.ok)
        return alert(response.message || "Failed to join room");
      navigate(`/rooms/${response.room.roomCode}`);
    });
  }

  return (
    <div className="flex flex-col justify-center items-center">
      <button onClick={createRoom} className="bg-blue-400 p-4 rounded">
        Create Room
      </button>
      <p>OR</p>
      <div className="flex gap-2">
        <input
          className="p-2 border rounded"
          type="text"
          placeholder="Enter room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <button onClick={joinRoom} className="bg-blue-400 p-2 rounded">
          Join Room
        </button>
      </div>
    </div>
  );
};