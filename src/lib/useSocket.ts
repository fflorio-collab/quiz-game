"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

type SocketClient = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: SocketClient | null = null;

/**
 * Hook socket.io con bridge opzionale al session JWT di NextAuth.
 *
 * Strategia: prima di creare il socket, proviamo a recuperare il token JWT via
 * `/api/auth/session-token` (endpoint custom che restituisce il JWT della sessione
 * corrente, se loggati). Se c'è, lo passiamo al server tramite `auth.token` così
 * il middleware socket può risolvere l'userId del giocatore loggato.
 *
 * Se l'utente non è loggato, il socket si connette comunque senza token — gameplay
 * come ospite (Player.userId resta null).
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<SocketClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSocket() {
      if (sharedSocket) {
        socketRef.current = sharedSocket;
        setIsConnected(sharedSocket.connected);
        return;
      }

      // Recupera token JWT se loggato (best-effort, non bloccante se fallisce)
      let token: string | undefined;
      try {
        const res = await fetch("/api/auth/session-token", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { token?: string };
          token = data.token || undefined;
        }
      } catch {
        // ignore — continua come ospite
      }

      if (cancelled) return;

      const url =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
      sharedSocket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        auth: token ? { token } : undefined,
      });

      socketRef.current = sharedSocket;

      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);

      sharedSocket.on("connect", onConnect);
      sharedSocket.on("disconnect", onDisconnect);

      setIsConnected(sharedSocket.connected);
    }

    ensureSocket();

    return () => {
      cancelled = true;
    };
  }, []);

  return { socket: socketRef.current, isConnected };
}
