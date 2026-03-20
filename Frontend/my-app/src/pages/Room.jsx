import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { connectSocket, socket } from "../socket";
import { useSelector } from "react-redux";

export const Room = () => {
  const { roomCode } = useParams();
  const [room, setRoom] = useState(null);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    connectSocket();

    socket.emit("room:join", roomCode, (response) => {
      if (!response?.ok)
        return alert(response?.message || "Failed to join room");
      setRoom(response.room);
    });

    const onPresence = (data) => {
      setRoom(data);
    };

    socket.on("room:presence", onPresence);

    return () => {
      socket.off("room:presence", onPresence);
    };
  }, [roomCode]);

  function leaveRoom() {
    // connect to the socket if not connected -> connectSocket()
    // emit a "room:leave" event with roomCode and acknowledgment () as payload
    // redirect to the lobby
  }

  return (
    <div>
      <h1 className="text-3xl">Room: {roomCode}</h1>
      <p>Status: {room?.status}</p>
      <ul>
        {room?.players.map((p) => (
          <li>{p.userId === user._id ? p.name + "(Me)" : p.name}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        {room?.status === "ready" && (
          <button className="bg-green-400 p-2 rounded">Start Game</button>
        )}
        <button onClick={leaveRoom} className="bg-red-400 p-2 rounded">
          Leave
        </button>
      </div>
    </div>
  );
};