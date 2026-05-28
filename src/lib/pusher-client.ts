"use client";
import Pusher, { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";

// Singleton Pusher client per evitare connessioni multiple tra page navigations.
// Si configura al primo uso leggendo le env NEXT_PUBLIC_*.
let cached: Pusher | null = null;

function client(): Pusher {
  if (cached) return cached;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";
  if (!key) {
    throw new Error("Pusher client non configurato: manca NEXT_PUBLIC_PUSHER_KEY");
  }
  cached = new Pusher(key, { cluster });
  return cached;
}

export function isPusherClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY);
}

// Hook che sottoscrive un singolo canale e ritorna l'oggetto Channel per fare bind().
// Si occupa di unsubscribe in cleanup. Restituisce null finché Pusher non è connesso.
export function usePusherChannel(channelName: string | null | undefined): Channel | null {
  const [channel, setChannel] = useState<Channel | null>(null);
  const subscribedTo = useRef<string | null>(null);

  useEffect(() => {
    if (!channelName) {
      setChannel(null);
      return;
    }
    if (subscribedTo.current === channelName) return;
    const p = client();
    const ch = p.subscribe(channelName);
    subscribedTo.current = channelName;
    setChannel(ch);
    return () => {
      p.unsubscribe(channelName);
      subscribedTo.current = null;
      setChannel(null);
    };
  }, [channelName]);

  return channel;
}

// Helper imperativo per chi vuole bind/unbind manualmente (non in un hook).
export function getPusher(): Pusher {
  return client();
}
