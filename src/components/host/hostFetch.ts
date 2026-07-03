"use client";

import { getHostToken } from "./hostIdentity";

// Helper fetch per le azioni di regia: inietta sempre l'header x-host-token
// (letto da localStorage) richiesto dalle route host per autorizzare le mutazioni.

export interface HostActionResult<T = unknown> {
  ok: boolean;
  status: number;
  error?: string;
  data?: T;
}

async function request<T>(
  gameId: string,
  path: string,
  init: RequestInit,
): Promise<HostActionResult<T>> {
  const token = getHostToken(gameId);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["x-host-token"] = token;

  try {
    const res = await fetch(`/api/game/${gameId}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | (T & { error?: string })
      | null;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json?.error ?? `Errore (${res.status})`,
      };
    }
    return { ok: true, status: res.status, data: (json as T) ?? undefined };
  } catch {
    return { ok: false, status: 0, error: "Rete non raggiungibile" };
  }
}

/** POST a /api/game/{gameId}{path} con header host + body JSON. */
export function hostPost<T = unknown>(
  gameId: string,
  path: string,
  body?: unknown,
): Promise<HostActionResult<T>> {
  return request<T>(gameId, path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** DELETE a /api/game/{gameId}{path} con header host. */
export function hostDelete<T = unknown>(
  gameId: string,
  path: string,
): Promise<HostActionResult<T>> {
  return request<T>(gameId, path, { method: "DELETE" });
}
