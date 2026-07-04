"use client";

import { Howl } from "howler";

// Sistema audio con doppio canale:
// 1) MP3 in /public/sounds/ caricati via Howler (qualità migliore, opzionale)
// 2) Sintesi Web Audio come fallback (sempre disponibile, suoni semplici)

export type SoundName =
  | "tick" | "correct" | "wrong" | "join" | "start" | "finish"
  | "lifeline" | "streak" | "wager-win" | "wager-lose" | "countdown" | "timeup";

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
  register("timeup", "/sounds/timeup.mp3", 0.6);
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

// Sirena "tempo scaduto": tono che ondeggia su/giù come una sirena da studio.
function siren() {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  const lo = 430, hi = 960;
  osc.frequency.setValueAtTime(lo, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
  const step = 0.4; // durata di una salita+discesa
  let t = t0;
  for (let i = 0; i < 3; i++) {
    osc.frequency.linearRampToValueAtTime(hi, t + step / 2);
    osc.frequency.linearRampToValueAtTime(lo, t + step);
    t += step;
  }
  gain.gain.setValueAtTime(0.22, t - 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t + 0.05);
}

function synth(name: SoundName) {
  switch (name) {
    case "timeup":      siren(); break;
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

// ─── Jingle di categoria (cambio round) ───────────────────────────────
// Nessun MP3 dedicato: sintetizziamo un motivetto breve e allegro. Ogni categoria
// ottiene un jingle CONSISTENTE (derivato dal nome) con un "mood" scelto in base a
// parole chiave, così suona un po' "a tema". Per jingle reali basta aggiungere file
// audio e mapparli qui in futuro.

// Frequenza di una nota espressa in semitoni rispetto ad A4 (440 Hz).
const noteFreq = (semi: number) => 440 * Math.pow(2, semi / 12);

type Jingle = { pattern: number[]; wave: OscillatorType; step: number; vol: number };

const JINGLES: Record<string, Jingle> = {
  energetic: { pattern: [3, 3, 10, 3, 10, 15], wave: "square", step: 120, vol: 0.12 },   // grintoso (sport/giochi)
  fanfare:   { pattern: [3, 7, 10, 15, 10, 15], wave: "square", step: 140, vol: 0.12 },   // trionfale (cinema/tv)
  melodic:   { pattern: [3, 5, 7, 8, 10, 12, 15], wave: "triangle", step: 145, vol: 0.14 }, // melodico (musica)
  regal:     { pattern: [7, 7, 10, 15, 14, 15], wave: "sine", step: 180, vol: 0.16 },     // solenne (storia/arte)
  quirky:    { pattern: [3, 10, 7, 14, 10, 17], wave: "triangle", step: 115, vol: 0.13 }, // saltellante (scienza/natura)
  playful:   { pattern: [8, 3, 8, 12, 8, 15, 19], wave: "square", step: 110, vol: 0.11 }, // giocoso (cibo/varie)
};

// Parola chiave (contenuta nel nome categoria, lowercase) → mood.
const MOOD_KEYWORDS: Array<[string[], keyof typeof JINGLES]> = [
  [["sport", "calcio", "motor", "moto", "auto", "gioch", "videogioch", "esport", "fitness", "olimp"], "energetic"],
  [["cinema", "film", "tv", "serie", "spettacol", "attore", "hollywood", "oscar", "cartoni"], "fanfare"],
  [["music", "canz", "rock", "pop", "cantant", "band", "concert", "rap", "jazz"], "melodic"],
  [["stor", "arte", "letter", "geograf", "mondo", "mitolog", "cultura", "monument"], "regal"],
  [["scienz", "tecnolog", "natura", "animal", "spazio", "biolog", "chimic", "fisic", "matemat", "informat"], "quirky"],
  [["cibo", "cucina", "food", "gastro", "vino", "ricett", "varie", "misto", "general"], "playful"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Jingle MP3 dedicati (opzionali): se metti un file in
//   public/sounds/jingles/<slug>.mp3
// (slug = nome categoria minuscolo, senza accenti, spazi→trattino, es. "Cinema e TV"
// → "cinema-e-tv"), quello sostituisce il jingle sintetizzato per quella categoria.
// Se il file manca, si ricade automaticamente sulla sintesi.
const categoryHowls: Record<string, Howl> = {};
const categoryHowlState: Record<string, "loading" | "ready" | "error"> = {};

function jingleSlug(name: string): string {
  return (name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // via accenti
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureCategoryHowl(slug: string): Howl | null {
  if (!slug) return null;
  if (categoryHowls[slug]) return categoryHowls[slug];
  const h = new Howl({
    src: [`/sounds/jingles/${slug}.mp3`],
    volume: 0.6,
    onload: () => { categoryHowlState[slug] = "ready"; },
    onloaderror: () => { categoryHowlState[slug] = "error"; },
  });
  categoryHowls[slug] = h;
  categoryHowlState[slug] = "loading";
  return h;
}

// Precarica l'eventuale MP3 di una categoria (chiamalo appena sai quale round arriva,
// così il file è pronto quando parte lo splash). Innocuo se il file non esiste.
export function preloadCategoryJingle(categoryName: string) {
  if (typeof window === "undefined") return;
  try { ensureCategoryHowl(jingleSlug(categoryName)); } catch { /* noop */ }
}

// Riproduce il jingle "a tema" per una categoria. Priorità all'MP3 dedicato (se
// presente e già caricato); altrimenti sintesi. Il mood della sintesi è scelto da
// parole chiave, con fallback deterministico dal nome (stessa categoria → stesso motivo).
export function playCategoryJingle(categoryName: string) {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    // 1) MP3 dedicato già caricato → usalo.
    const slug = jingleSlug(categoryName);
    const howl = ensureCategoryHowl(slug);
    if (howl && categoryHowlState[slug] === "ready") { howl.play(); return; }
    // 2) Fallback: jingle sintetizzato (sempre disponibile).
    const ctx = getCtx();
    if (!ctx) return;
    const key = (categoryName || "").toLowerCase();
    let mood: keyof typeof JINGLES | null = null;
    for (const [words, m] of MOOD_KEYWORDS) {
      if (words.some((w) => key.includes(w))) { mood = m; break; }
    }
    const hash = hashStr(key || "x");
    if (!mood) {
      const moods = Object.keys(JINGLES) as Array<keyof typeof JINGLES>;
      mood = moods[hash % moods.length];
    }
    const j = JINGLES[mood];
    // Trasposizione consistente: differenzia categorie con lo stesso mood restando
    // musicali (solo toni interi, nessuna nota "stonata").
    const transpose = [0, 0, -2, 2, 3, 5][hash % 6];
    // Basso iniziale che dà "spinta".
    blip(noteFreq(j.pattern[0] + transpose - 12), j.step * 1.4, "sine", j.vol * 1.1, 0);
    j.pattern.forEach((semi, i) => {
      blip(noteFreq(semi + transpose), j.step * 0.92, j.wave, j.vol, i * j.step);
    });
    // Sparkle finale (due note acute).
    const end = j.pattern.length * j.step;
    const last = j.pattern[j.pattern.length - 1] + transpose;
    blip(noteFreq(last + 12), 240, "sine", j.vol * 0.9, end + 20);
    blip(noteFreq(last + 19), 320, "sine", j.vol * 0.8, end + 160);
  } catch {
    // Silent fail
  }
}
