"use client";

import { Howl } from "howler";

// I file audio andranno messi in /public/sounds/ (vedi README per suggerimenti)
let sounds: Record<string, Howl> | null = null;
let enabled = true;

function initSounds() {
  if (sounds) return sounds;
  sounds = {
    tick: new Howl({ src: ["/sounds/tick.mp3"], volume: 0.3 }),
    correct: new Howl({ src: ["/sounds/correct.mp3"], volume: 0.5 }),
    wrong: new Howl({ src: ["/sounds/wrong.mp3"], volume: 0.5 }),
    join: new Howl({ src: ["/sounds/join.mp3"], volume: 0.4 }),
    start: new Howl({ src: ["/sounds/start.mp3"], volume: 0.5 }),
    finish: new Howl({ src: ["/sounds/finish.mp3"], volume: 0.6 }),
  };
  return sounds;
}

export function playSound(name: "tick" | "correct" | "wrong" | "join" | "start" | "finish") {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    const s = initSounds();
    s[name]?.play();
  } catch {
    // I file audio potrebbero non esistere: fail silently
  }
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (typeof window !== "undefined") {
    localStorage.setItem("sound-enabled", String(value));
  }
}

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("sound-enabled");
  if (stored === null) return true;
  return stored === "true";
}
