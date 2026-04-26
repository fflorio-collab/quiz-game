"use client";

import { Howl } from "howler";

// Sistema audio con doppio canale:
// 1) MP3 in /public/sounds/ caricati via Howler (qualità migliore, opzionale)
// 2) Sintesi Web Audio come fallback (sempre disponibile, suoni semplici)

export type SoundName =
  | "tick" | "correct" | "wrong" | "join" | "start" | "finish"
  | "lifeline" | "streak" | "wager-win" | "wager-lose" | "countdown";

let howls: Partial<Record<SoundName, Howl>> | null = null;
const howlAvailable: Partial<Record<SoundName, boolean>> = {};
let enabled = true;

function initHowls() {
  if (howls) return howls;
  howls = {};
  const register = (name: SoundName, src: string, volume = 0.5) => {
    const h = new Howl({
      src: [src],
      volume,
      onload: () => { howlAvailable[name] = true; },
      onloaderror: () => { howlAvailable[name] = false; },
    });
    howls![name] = h;
  };
  register("tick", "/sounds/tick.mp3", 0.3);
  register("correct", "/sounds/correct.mp3", 0.5);
  register("wrong", "/sounds/wrong.mp3", 0.5);
  register("join", "/sounds/join.mp3", 0.4);
  register("start", "/sounds/start.mp3", 0.5);
  register("finish", "/sounds/finish.mp3", 0.6);
  register("lifeline", "/sounds/lifeline.mp3", 0.4);
  register("streak", "/sounds/streak.mp3", 0.5);
  register("wager-win", "/sounds/wager-win.mp3", 0.5);
  register("wager-lose", "/sounds/wager-lose.mp3", 0.5);
  register("countdown", "/sounds/countdown.mp3", 0.4);
  return howls;
}

// --- Fallback sintetico con Web Audio ---
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function blip(freq: number, durMs: number, type: OscillatorType = "sine", volume = 0.12, atMs = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const startAt = ctx.currentTime + atMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durMs / 1000 + 0.02);
}

function synth(name: SoundName) {
  switch (name) {
    case "tick":        blip(880, 60, "square", 0.08); break;
    case "correct":     blip(523, 120, "sine", 0.12); blip(784, 200, "sine", 0.12, 100); break;                  // C5 → G5
    case "wrong":       blip(200, 150, "sawtooth", 0.15); blip(150, 200, "sawtooth", 0.15, 120); break;
    case "join":        blip(659, 80, "triangle", 0.12); blip(880, 120, "triangle", 0.12, 60); break;
    case "start":       blip(523, 120, "triangle", 0.14); blip(659, 120, "triangle", 0.14, 100); blip(784, 240, "triangle", 0.14, 200); break; // C-E-G
    case "finish":      blip(523, 150, "sine", 0.12); blip(659, 150, "sine", 0.12, 130); blip(784, 150, "sine", 0.12, 260); blip(1046, 380, "sine", 0.14, 390); break;
    case "lifeline":    blip(1200, 80, "sine", 0.1); blip(1600, 120, "sine", 0.1, 70); break;
    case "streak":      blip(784, 80, "triangle", 0.12); blip(988, 80, "triangle", 0.12, 60); blip(1175, 80, "triangle", 0.12, 120); blip(1568, 180, "triangle", 0.14, 180); break;
    case "wager-win":   blip(659, 90, "triangle", 0.14); blip(880, 90, "triangle", 0.14, 70); blip(1318, 200, "triangle", 0.14, 140); break;
    case "wager-lose":  blip(220, 200, "sawtooth", 0.18); blip(174, 260, "sawtooth", 0.18, 180); break;
    case "countdown":   blip(660, 100, "square", 0.1); break;
  }
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    const h = initHowls();
    const howl = h[name];
    if (howl && howlAvailable[name]) {
      howl.play();
      return;
    }
    // Fallback: sintesi
    synth(name);
  } catch {
    // Silent fail
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
