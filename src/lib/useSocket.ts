"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

type SocketClient = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: SocketClient | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<SocketClient | null>(null);

  useEffect(() => {
    if (!sharedSocket) {
      const url =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
      sharedSocket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = sharedSocket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    sharedSocket.on("connect", onConnect);
    sharedSocket.on("disconnect", onDisconnect);

    setIsConnected(sharedSocket.connected);

    return () => {
      sharedSocket?.off("connect", onConnect);
      sharedSocket?.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, isConnected };
}
