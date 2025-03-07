// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false,
  transports: ["websocket"],
});

export default function useSocket(userId) {
  const socketRef = useRef(socket);

  useEffect(() => {
    if (!userId) return;

    if (!socketRef.current.connected) {
      socketRef.current.connect();
      socketRef.current.emit("registerUser", userId);
    }

    return () => {
    };
  }, [userId]);

  return socketRef.current;
};
