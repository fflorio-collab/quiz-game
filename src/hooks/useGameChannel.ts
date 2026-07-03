"use client";

import { useEffect, useRef } from "react";
import type { Channel } from "pusher-js";
import { usePusherChannel } from "@/lib/pusher-client";
import type { ServerEventName, ServerEvents } from "@/types/game";

// Sottoscrive il canale realtime della partita ("game-{gameId}") e, se è
// presente un hostToken, anche il canale privato di regia ("host-{gameId}",
// dove il motore emette game:judge-answers e game:local-host-info).
//
// Due stili d'uso (combinabili):
//   useGameChannel(gameId, {
//     handlers: { "game:question": (q) => ..., "game:reveal": (r) => ... },
//   });
//   useGameChannel(gameId, { onEvent: (event, data) => ... });
//
// I bind sono globali e stabili: handlers/onEvent vivono in una ref, quindi
// puoi passare closure fresche a ogni render senza causare rebind.

export type GameEventHandlers = {
  [K in ServerEventName]?: (data: ServerEvents[K]) => void;
};

export type GameEventListener = <K extends ServerEventName>(
  event: K,
  data: ServerEvents[K],
) => void;

export interface UseGameChannelOptions {
  /** Se presente sottoscrive anche il canale host ("host-{gameId}") */
  hostToken?: string | null;
  /** Mappa tipizzata evento → handler (eventi di ServerEvents) */
  handlers?: GameEventHandlers;
  /** Listener unico per tutti gli eventi (alternativa alla mappa) */
  onEvent?: GameEventListener;
}

export interface UseGameChannelResult {
  channel: Channel | null;
  hostChannel: Channel | null;
  /** true quando la sottoscrizione al canale partita è attiva */
  connected: boolean;
}

export function useGameChannel(
  gameId: string | null | undefined,
  options: UseGameChannelOptions = {},
): UseGameChannelResult {
  const { hostToken } = options;

  const channel = usePusherChannel(gameId ? `game-${gameId}` : null);
  const hostChannel = usePusherChannel(
    gameId && hostToken ? `host-${gameId}` : null,
  );

  // Ref sempre aggiornata con gli handler dell'ultimo render:
  // il bind resta stabile, la closure no.
  const latest = useRef<Pick<UseGameChannelOptions, "handlers" | "onEvent">>({});
  latest.current = { handlers: options.handlers, onEvent: options.onEvent };

  useEffect(() => {
    if (!channel && !hostChannel) return;

    const dispatch = (event: string, data: unknown) => {
      // Ignora gli eventi interni di Pusher (pusher:subscription_succeeded, …)
      if (event.startsWith("pusher:")) return;
      const name = event as ServerEventName;
      const handler = latest.current.handlers?.[name] as
        | ((payload: unknown) => void)
        | undefined;
      handler?.(data);
      latest.current.onEvent?.(name, data as ServerEvents[typeof name]);
    };

    channel?.bind_global(dispatch);
    hostChannel?.bind_global(dispatch);
    return () => {
      channel?.unbind_global(dispatch);
      hostChannel?.unbind_global(dispatch);
    };
  }, [channel, hostChannel]);

  return { channel, hostChannel, connected: channel !== null };
}

export default useGameChannel;
