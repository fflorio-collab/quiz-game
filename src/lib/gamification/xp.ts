/**
 * Motore XP: conversione da risultato partita a XP e livello.
 * Formule volutamente semplici per tenere la progressione leggibile.
 */

export type DifficultyKey = "EASY" | "MEDIUM" | "HARD";

export interface GameResultForXp {
  correctAnswers: number;
  bestStreak: number;
  isWin: boolean;        // vincitore assoluto (top-1)
  isPodium: boolean;     // top-3
  livesRemaining: number; // vite residue (Caduta libera); 0 altrove
  difficulty: string;     // EASY | MEDIUM | HARD | ALL/MIXED (fallback MEDIUM)
}

function difficultyMultiplier(d: string): number {
  if (d === "EASY") return 1.0;
  if (d === "HARD") return 1.6;
  return 1.3; // MEDIUM o ALL/MIXED
}

/**
 * XP guadagnata al termine di una partita.
 * Base: 10×corrette + 2×bestStreak + 50 vittoria + 20 podio + 5×viteResidue.
 * Moltiplicatore per difficoltà. Nessuna penalità in caso di sconfitta.
 */
export function xpForGame(r: GameResultForXp): number {
  const base =
    10 * r.correctAnswers +
    2 * r.bestStreak +
    (r.isWin ? 50 : 0) +
    (r.isPodium && !r.isWin ? 20 : 0) +
    5 * Math.max(0, r.livesRemaining);
  return Math.max(0, Math.round(base * difficultyMultiplier(r.difficulty)));
}

/** XP cumulativa necessaria per raggiungere un dato livello (L1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.6));
}

const MAX_LEVEL = 50;

/** Calcola il livello corrispondente a una XP totale cumulata. */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** XP mancante per raggiungere il livello successivo (0 se al max). */
export function xpToNextLevel(xp: number): { current: number; next: number; progress: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { current: xp - xpForLevel(MAX_LEVEL), next: 0, progress: 1 };
  const baseXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const current = xp - baseXp;
  const next = nextXp - baseXp;
  return { current, next, progress: next > 0 ? current / next : 0 };
}
