"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameStateSnapshot } from "@/types/game";

// Fetch dello snapshot di stato (rejoin / refresh) al mount + refetch manuale.
// Tre ruoli, tre endpoint:
//   host       → GET /api/game/{gameId}/snapshot        (header x-host-token)
//   player     → GET /api/player/{playerId}/snapshot?gameId={gameId}
//   spectator  → GET /api/game/{gameId}/snapshot        (senza token)
//
// Passa `null` finché l'identità non è pronta (es. localStorage non ancora
// letto): il fetch parte appena params diventa non-null.

export type SnapshotParams =
  | { role: "host"; gameId: string; hostToken: string }
  | { role: "player"; gameId: string; playerId: string }
  | { role: "spectator"; gameId: string };

export interface UseSnapshotResult {
  snapshot: GameStateSnapshot | null;
  loading: boolean;
  error: string | null;
  /** Rilegge lo snapshot dal server; ritorna il nuovo valore (o null su errore) */
  refetch: () => Promise<GameStateSnapshot | null>;
}

function buildRequest(params: SnapshotParams): { url: string; headers: HeadersInit } {
  switch (params.role) {
    case "host":
      return {
        url: `/api/game/${params.gameId}/snapshot`,
        headers: { "x-host-token": params.hostToken },
      };
    case "player":
      return {
        url: `/api/player/${params.playerId}/snapshot?gameId=${encodeURIComponent(params.gameId)}`,
        headers: {},
      };
    case "spectator":
      return { url: `/api/game/${params.gameId}/snapshot`, headers: {} };
  }
}

export function useSnapshot(params: SnapshotParams | null): UseSnapshotResult {
  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(params !== null);
  const [error, setError] = useState<string | null>(null);

  // Dipendenze primitive: evita refetch a ogni render se il chiamante
  // costruisce l'oggetto params inline.
  const role = params?.role ?? null;
  const gameId = params?.gameId ?? null;
  const hostToken = params?.role === "host" ? params.hostToken : null;
  const playerId = params?.role === "player" ? params.playerId : null;

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const refetch = useCallback(async (): Promise<GameStateSnapshot | null> => {
    const current = paramsRef.current;
    if (!current) return null;
    setLoading(true);
    try {
      const { url, headers } = buildRequest(current);
      const res = await fetch(url, { headers, cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { state?: GameStateSnapshot; snapshot?: GameStateSnapshot; error?: string }
        | null;
      if (!res.ok) {
        setError(json?.error ?? `Errore snapshot (${res.status})`);
        setSnapshot(null);
        return null;
      }
      const state = json?.state ?? json?.snapshot ?? null;
      setSnapshot(state);
      setError(state ? null : "Snapshot vuoto");
      return state;
    } catch {
      setError("Rete non raggiungibile");
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, gameId, hostToken, playerId]);

  useEffect(() => {
    if (!role) return;
    void refetch();
  }, [role, refetch]);

  return { snapshot, loading, error, refetch };
}

export default useSnapshot;
