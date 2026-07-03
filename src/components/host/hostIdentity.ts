"use client";

// Persistenza dell'identità di regia (host) in localStorage.
// useLocalIdentity (previsto dal contratto) non esiste ancora nel repo: questo
// modulo, interno al territorio host, fornisce le stesse primitive per il token.
// Chiavi namespaced così da non collidere con l'identità player/spectator.

const TOKEN_KEY = (gameId: string) => `sfgn:host:token:${gameId}`;
const LAST_GAME_KEY = "sfgn:host:lastGame";

export function setHostToken(gameId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY(gameId), token);
  } catch {
    /* storage non disponibile: la sessione corrente resta comunque in memoria */
  }
}

export function getHostToken(gameId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY(gameId));
  } catch {
    return null;
  }
}

export function setHostGameId(gameId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_GAME_KEY, gameId);
  } catch {
    /* ignore */
  }
}

export function getHostGameId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_GAME_KEY);
  } catch {
    return null;
  }
}
