import { io } from "socket.io-client";

export const socket = io("http://localhost:8000", {
  withCredentials: true,
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) socket.connect();
};