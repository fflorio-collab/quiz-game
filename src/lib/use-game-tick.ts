"use client";

import { useEffect, useRef, useState } from "react";
import type { DuelState } from "@/types/socket";

// Migrazione vercel-pusher fase 8.
// Hook di polling sul GET /api/game/[id]/tick. Sostituisce il setInterval lato
// server (250ms in socket.io) che su Vercel serverless non può girare.
// La fetch periodica fa due cose:
//   1. legge i timer aggiornati (questionRemaining, speedrunRemaining, duel);
//   2. innesca l'auto-fine-domanda se il deadline è scaduto (lato server).
//
// Strategia di intervallo: la pagina decide (default 2s). In fase QUESTION/
// DUEL conviene 1-2s, in LOBBY/FINISHED conviene fermare il polling.

export type TickPayload = {
  questionRemaining: number | null;
  speedrunRemaining: number | null;
  duel: DuelState | null;
  status: "LOBBY" | "PLAYING" | "FINISHED";
};

export function useGameTick(
  gameId: string | null | undefined,
  options: { intervalMs?: number; enabled?: boolean } = {},
): TickPayload | null {
  const { intervalMs = 2000, enabled = true } = options;
  const [data, setData] = useState<TickPayload | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!gameId || !enabled) return;

    let cancelled = false;
    const fetchTick = async () => {
      if (inFlight.current) return; // evita pile-up se la rete è lenta
      inFlight.current = true;
      try {
        const r = await fetch(`/api/game/${gameId}/tick`);
        if (!r.ok) return;
        const json = (await r.json()) as TickPayload & { ok: boolean };
        if (cancelled) return;
        setData({
          questionRemaining: json.questionRemaining,
          speedrunRemaining: json.speedrunRemaining,
          duel: json.duel,
          status: json.status,
        });
      } catch { /* swallow: prossimo tick riproverà */ }
      finally { inFlight.current = false; }
    };

    fetchTick(); // tick iniziale immediato
    const id = setInterval(fetchTick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [gameId, intervalMs, enabled]);

  return data;
}
