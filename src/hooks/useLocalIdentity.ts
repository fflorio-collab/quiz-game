"use client";

import { useCallback, useEffect, useState } from "react";

// Helper unificato per l'identità persistita in localStorage nei tre ruoli
// (host / player / spectator). Sopravvive al refresh e abilita il rejoin.
//
// Chiavi (allineate a quelle già in uso nel resto dell'app):
//   host       → hostGameId, hostCode, hostName + `hostToken:{gameId}` (per-partita)
//   player     → playerId, playerGameId, playerGameCode, playerNickname,
//                playerEmoji, playerAvatarUrl
//   spectator  → spectatorGameId, spectatorCode
//
// L'hostToken è segreto e per-partita: lo teniamo su una chiave namespaced così
// più partite ospitate dallo stesso browser non si sovrascrivono a vicenda.
//
// SSR-safe: ogni accesso è protetto da `typeof window` + try/catch (localStorage
// può essere assente su SSR o disabilitato in navigazione privata). L'hook legge
// solo dopo il mount (evita hydration mismatch) ed espone `ready`.

// ─── Storage primitives (SSR-safe) ──────────────────────────────────────────

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null || value === "") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage pieno / disabilitato: no-op */
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}

// ─── Chiavi ─────────────────────────────────────────────────────────────────

const HOST_KEYS = {
  gameId: "hostGameId",
  code: "hostCode",
  name: "hostName",
} as const;

const PLAYER_KEYS = {
  playerId: "playerId",
  gameId: "playerGameId",
  gameCode: "playerGameCode",
  nickname: "playerNickname",
  emoji: "playerEmoji",
  avatarUrl: "playerAvatarUrl",
} as const;

const SPECTATOR_KEYS = {
  gameId: "spectatorGameId",
  code: "spectatorCode",
} as const;

/** Chiave namespaced del token host per una specifica partita. */
export function hostTokenKey(gameId: string): string {
  return `hostToken:${gameId}`;
}

// ─── Tipi ───────────────────────────────────────────────────────────────────

export interface HostIdentity {
  gameId: string | null;
  code: string | null;
  name: string | null;
}

export interface PlayerIdentity {
  playerId: string | null;
  gameId: string | null;
  gameCode: string | null;
  nickname: string | null;
  emoji: string | null;
  avatarUrl: string | null;
}

export interface SpectatorIdentity {
  gameId: string | null;
  code: string | null;
}

const EMPTY_HOST: HostIdentity = { gameId: null, code: null, name: null };
const EMPTY_PLAYER: PlayerIdentity = {
  playerId: null,
  gameId: null,
  gameCode: null,
  nickname: null,
  emoji: null,
  avatarUrl: null,
};
const EMPTY_SPECTATOR: SpectatorIdentity = { gameId: null, code: null };

// ─── Host ───────────────────────────────────────────────────────────────────

export function getHostToken(gameId: string): string | null {
  if (!gameId) return null;
  return read(hostTokenKey(gameId));
}

export function setHostToken(gameId: string, token: string | null | undefined): void {
  if (!gameId) return;
  write(hostTokenKey(gameId), token);
}

export function clearHostToken(gameId: string): void {
  if (!gameId) return;
  remove(hostTokenKey(gameId));
}

export function getHostIdentity(): HostIdentity {
  return {
    gameId: read(HOST_KEYS.gameId),
    code: read(HOST_KEYS.code),
    name: read(HOST_KEYS.name),
  };
}

export function setHostIdentity(patch: Partial<HostIdentity>): void {
  if ("gameId" in patch) write(HOST_KEYS.gameId, patch.gameId);
  if ("code" in patch) write(HOST_KEYS.code, patch.code);
  if ("name" in patch) write(HOST_KEYS.name, patch.name);
}

/** Rimuove l'identità host; se `gameId` è fornito rimuove anche il suo token. */
export function clearHost(gameId?: string): void {
  remove(HOST_KEYS.gameId);
  remove(HOST_KEYS.code);
  remove(HOST_KEYS.name);
  if (gameId) clearHostToken(gameId);
}

// ─── Player ─────────────────────────────────────────────────────────────────

export function getPlayerIdentity(): PlayerIdentity {
  return {
    playerId: read(PLAYER_KEYS.playerId),
    gameId: read(PLAYER_KEYS.gameId),
    gameCode: read(PLAYER_KEYS.gameCode),
    nickname: read(PLAYER_KEYS.nickname),
    emoji: read(PLAYER_KEYS.emoji),
    avatarUrl: read(PLAYER_KEYS.avatarUrl),
  };
}

export function setPlayerIdentity(patch: Partial<PlayerIdentity>): void {
  if ("playerId" in patch) write(PLAYER_KEYS.playerId, patch.playerId);
  if ("gameId" in patch) write(PLAYER_KEYS.gameId, patch.gameId);
  if ("gameCode" in patch) write(PLAYER_KEYS.gameCode, patch.gameCode);
  if ("nickname" in patch) write(PLAYER_KEYS.nickname, patch.nickname);
  if ("emoji" in patch) write(PLAYER_KEYS.emoji, patch.emoji);
  if ("avatarUrl" in patch) write(PLAYER_KEYS.avatarUrl, patch.avatarUrl);
}

export function clearPlayer(): void {
  remove(PLAYER_KEYS.playerId);
  remove(PLAYER_KEYS.gameId);
  remove(PLAYER_KEYS.gameCode);
  remove(PLAYER_KEYS.nickname);
  remove(PLAYER_KEYS.emoji);
  remove(PLAYER_KEYS.avatarUrl);
}

// ─── Spectator ──────────────────────────────────────────────────────────────

export function getSpectatorIdentity(): SpectatorIdentity {
  return {
    gameId: read(SPECTATOR_KEYS.gameId),
    code: read(SPECTATOR_KEYS.code),
  };
}

export function setSpectatorIdentity(patch: Partial<SpectatorIdentity>): void {
  if ("gameId" in patch) write(SPECTATOR_KEYS.gameId, patch.gameId);
  if ("code" in patch) write(SPECTATOR_KEYS.code, patch.code);
}

export function clearSpectator(): void {
  remove(SPECTATOR_KEYS.gameId);
  remove(SPECTATOR_KEYS.code);
}

// ─── Hook opzionale ──────────────────────────────────────────────────────────

export interface LocalIdentitySnapshot {
  host: HostIdentity;
  /** Token host della partita richiesta all'hook (null se non passato/assente). */
  hostToken: string | null;
  player: PlayerIdentity;
  spectator: SpectatorIdentity;
}

export interface UseLocalIdentityResult extends LocalIdentitySnapshot {
  /** true quando localStorage è stato letto (post-mount): identità affidabile. */
  ready: boolean;
  setHostToken: (gameId: string, token: string | null) => void;
  setHost: (patch: Partial<HostIdentity>) => void;
  clearHost: (gameId?: string) => void;
  setPlayer: (patch: Partial<PlayerIdentity>) => void;
  clearPlayer: () => void;
  setSpectator: (patch: Partial<SpectatorIdentity>) => void;
  clearSpectator: () => void;
  /** Rilegge tutte le identità da localStorage. */
  refresh: () => void;
}

/**
 * Hook opzionale: espone le tre identità (lette post-mount) + setter che
 * aggiornano storage e stato React. `gameId` opzionale serve solo a risolvere
 * l'hostToken per-partita.
 */
export function useLocalIdentity(gameId?: string | null): UseLocalIdentityResult {
  const [snapshot, setSnapshot] = useState<LocalIdentitySnapshot>({
    host: { ...EMPTY_HOST },
    hostToken: null,
    player: { ...EMPTY_PLAYER },
    spectator: { ...EMPTY_SPECTATOR },
  });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setSnapshot({
      host: getHostIdentity(),
      hostToken: gameId ? getHostToken(gameId) : null,
      player: getPlayerIdentity(),
      spectator: getSpectatorIdentity(),
    });
  }, [gameId]);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  const setHostTokenCb = useCallback((gid: string, token: string | null) => {
    setHostToken(gid, token);
    setSnapshot((prev) => ({
      ...prev,
      hostToken: gameId && gid === gameId ? token : prev.hostToken,
    }));
  }, [gameId]);

  const setHostCb = useCallback((patch: Partial<HostIdentity>) => {
    setHostIdentity(patch);
    setSnapshot((prev) => ({ ...prev, host: { ...prev.host, ...patch } }));
  }, []);

  const clearHostCb = useCallback((gid?: string) => {
    clearHost(gid);
    setSnapshot((prev) => ({
      ...prev,
      host: { ...EMPTY_HOST },
      hostToken: gid && gameId && gid === gameId ? null : prev.hostToken,
    }));
  }, [gameId]);

  const setPlayerCb = useCallback((patch: Partial<PlayerIdentity>) => {
    setPlayerIdentity(patch);
    setSnapshot((prev) => ({ ...prev, player: { ...prev.player, ...patch } }));
  }, []);

  const clearPlayerCb = useCallback(() => {
    clearPlayer();
    setSnapshot((prev) => ({ ...prev, player: { ...EMPTY_PLAYER } }));
  }, []);

  const setSpectatorCb = useCallback((patch: Partial<SpectatorIdentity>) => {
    setSpectatorIdentity(patch);
    setSnapshot((prev) => ({ ...prev, spectator: { ...prev.spectator, ...patch } }));
  }, []);

  const clearSpectatorCb = useCallback(() => {
    clearSpectator();
    setSnapshot((prev) => ({ ...prev, spectator: { ...EMPTY_SPECTATOR } }));
  }, []);

  return {
    ...snapshot,
    ready,
    setHostToken: setHostTokenCb,
    setHost: setHostCb,
    clearHost: clearHostCb,
    setPlayer: setPlayerCb,
    clearPlayer: clearPlayerCb,
    setSpectator: setSpectatorCb,
    clearSpectator: clearSpectatorCb,
    refresh,
  };
}

export default useLocalIdentity;
