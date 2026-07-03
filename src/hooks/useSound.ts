"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSoundEnabled,
  playSound,
  setSoundEnabled,
  type SoundName,
} from "@/lib/sound";

// Wrapper React su src/lib/sound.ts (che resta la fonte di verità audio).
// Il toggle è persistito in localStorage con la chiave "sound-enabled"
// (gestita da lib/sound stessa). SSR-safe: parte da true e si allinea al
// valore salvato dopo il mount (evita hydration mismatch).

export type { SoundName };

export interface UseSoundResult {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  /** Riproduce un suono (no-op se disabilitato o SSR) */
  play: (name: SoundName) => void;
}

export function useSound(): UseSoundResult {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    // Allinea lo stato React al valore persistito e sincronizza il modulo audio
    const stored = getSoundEnabled();
    setEnabledState(stored);
    setSoundEnabled(stored);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setSoundEnabled(value); // persiste + aggiorna il gate del modulo audio
    setEnabledState(value);
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  const play = useCallback((name: SoundName) => {
    playSound(name);
  }, []);

  return { enabled, setEnabled, toggle, play };
}

export default useSound;
