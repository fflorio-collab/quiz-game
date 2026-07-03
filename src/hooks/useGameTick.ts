"use client";

import { useEffect, useRef, useState } from "react";
import type { GameStatus } from "@/types/game";

// Polling su GET /api/game/{id}/tick (stessa semantica di
// src/lib/use-game-tick.ts, che resta per il codice legacy):
//   1. legge i secondi rimanenti della domanda corrente;
//   2. innesca lato server la fine automatica della domanda a deadline scaduta.
//
// In più rispetto al legacy: countdown locale fluido — tra un tick di rete e
// l'altro il tempo scala di 1s in locale, senza aspettare la fetch successiva.
//
// Intervallo: default 2000ms; l'host conviene lo tenga a 1000ms (è lui che
// deve innescare la deadline il prima possibile).

export interface GameTickState {
  /** Secondi rimanenti (countdown locale). null = nessuna domanda attiva / senza limite */
  remaining: number | null;
  /** Stato partita dall'ultimo tick. null = nessun tick ancora ricevuto */
  status: GameStatus | null;
}

export interface UseGameTickOptions {
  /** Intervallo di polling in ms (default 2000; host: 1000) */
  intervalMs?: number;
  /** false = polling fermo (es. LOBBY/FINISHED) */
  enabled?: boolean;
}

type TickBase = {
  remaining: number | null; // valore del server
  at: number;               // Date.now() alla ricezione
  status: GameStatus;
};

export function useGameTick(
  gameId: string | null | undefined,
  options: UseGameTickOptions = {},
): GameTickState {
  const { intervalMs = 2000, enabled = true } = options;
  const [state, setState] = useState<GameTickState>({ remaining: null, status: null });
  const base = useRef<TickBase | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!gameId || !enabled) return;

    let cancelled = false;

    const applyBase = () => {
      const b = base.current;
      if (!b) return;
      const remaining =
        b.remaining === null
          ? null
          : Math.max(0, b.remaining - Math.floor((Date.now() - b.at) / 1000));
      setState((prev) =>
        prev.remaining === remaining && prev.status === b.status
          ? prev
          : { remaining, status: b.status },
      );
    };

    const fetchTick = async () => {
      if (inFlight.current) return; // evita pile-up se la rete è lenta
      inFlight.current = true;
      try {
        const r = await fetch(`/api/game/${gameId}/tick`, { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as {
          ok: boolean;
          questionRemaining: number | null;
          status: GameStatus;
        };
        if (cancelled || !json.ok) return;
        base.current = {
          remaining: json.questionRemaining,
          at: Date.now(),
          status: json.status,
        };
        applyBase();
      } catch {
        /* swallow: il prossimo tick riproverà */
      } finally {
        inFlight.current = false;
      }
    };

    fetchTick(); // tick iniziale immediato
    const netId = setInterval(fetchTick, intervalMs);
    // Countdown locale: ricalcola più spesso del secondo per non "saltare"
    const localId = setInterval(applyBase, 250);
    return () => {
      cancelled = true;
      clearInterval(netId);
      clearInterval(localId);
    };
  }, [gameId, intervalMs, enabled]);

  return state;
}

export default useGameTick;
