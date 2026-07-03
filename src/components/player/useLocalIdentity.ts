"use client";

import { useCallback, useEffect, useState } from "react";

// Identità del giocatore persistita in localStorage: sopravvive al refresh e
// permette il recovery (rejoin) della partita. Chiavi allineate al brief PLAYER:
// playerId, playerGameId, playerGameCode, playerNickname, playerEmoji.
//
// SSR-safe: legge localStorage solo dopo il mount (evita hydration mismatch);
// `ready` diventa true quando la lettura è avvenuta, così i consumer sanno
// quando l'identità è affidabile (es. per far partire useSnapshot).

export interface LocalIdentity {
  playerId: string | null;
  playerGameId: string | null;
  playerGameCode: string | null;
  playerNickname: string | null;
  playerEmoji: string | null;
}

const KEYS: Record<keyof LocalIdentity, string> = {
  playerId: "playerId",
  playerGameId: "playerGameId",
  playerGameCode: "playerGameCode",
  playerNickname: "playerNickname",
  playerEmoji: "playerEmoji",
};

const EMPTY: LocalIdentity = {
  playerId: null,
  playerGameId: null,
  playerGameCode: null,
  playerNickname: null,
  playerEmoji: null,
};

function readFromStorage(): LocalIdentity {
  if (typeof window === "undefined") return { ...EMPTY };
  const out = { ...EMPTY };
  (Object.keys(KEYS) as (keyof LocalIdentity)[]).forEach((k) => {
    out[k] = window.localStorage.getItem(KEYS[k]);
  });
  return out;
}

export interface UseLocalIdentityResult {
  identity: LocalIdentity;
  /** true quando localStorage è stato letto (post-mount) */
  ready: boolean;
  /** Salva (merge) l'identità: aggiorna localStorage e lo stato React */
  save: (patch: Partial<LocalIdentity>) => void;
  /** Cancella l'identità (uscita dalla partita) */
  clear: () => void;
}

export function useLocalIdentity(): UseLocalIdentityResult {
  const [identity, setIdentity] = useState<LocalIdentity>({ ...EMPTY });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIdentity(readFromStorage());
    setReady(true);
  }, []);

  const save = useCallback((patch: Partial<LocalIdentity>) => {
    setIdentity((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") {
        (Object.keys(patch) as (keyof LocalIdentity)[]).forEach((k) => {
          const v = next[k];
          if (v == null) window.localStorage.removeItem(KEYS[k]);
          else window.localStorage.setItem(KEYS[k], v);
        });
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      (Object.keys(KEYS) as (keyof LocalIdentity)[]).forEach((k) =>
        window.localStorage.removeItem(KEYS[k]),
      );
    }
    setIdentity({ ...EMPTY });
  }, []);

  return { identity, ready, save, clear };
}

export default useLocalIdentity;
