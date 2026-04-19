import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Genera codice partita di 6 caratteri (lettere maiuscole + numeri, senza caratteri ambigui)
export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Calcola punti in base al tempo di risposta (più veloce = più punti)
export function calculatePoints(
  timeTakenMs: number,
  timeLimitMs: number,
  isCorrect: boolean,
  basePoints: number = 1000
): number {
  if (!isCorrect) return 0;
  const timeRatio = Math.max(0, 1 - timeTakenMs / timeLimitMs);
  // Min 500 punti se risposta corretta, max basePoints se istantanea
  return Math.round(basePoints * 0.5 + basePoints * 0.5 * timeRatio);
}

// Mischia un array (Fisher-Yates)
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type GameStatus = "LOBBY" | "PLAYING" | "FINISHED";
