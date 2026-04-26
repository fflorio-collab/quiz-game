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

// Moltiplicatore punti in base alla difficoltà
export function difficultyMultiplier(difficulty: string): number {
  switch (difficulty) {
    case "EASY":   return 0.5;
    case "HARD":   return 2.0;
    case "MEDIUM":
    default:       return 1.0;
  }
}

// Moltiplicatore punti da streak (risposte corrette consecutive).
// La streak passata è il numero DOPO l'incremento (es. 1 = prima risposta della serie).
export function streakMultiplier(streak: number): number {
  if (streak >= 10) return 3.0;
  if (streak >= 7)  return 2.0;
  if (streak >= 4)  return 1.5;
  if (streak >= 2)  return 1.25;
  return 1.0;
}

// Calcola punti in base al tempo di risposta (più veloce = più punti) e moltiplicati per la difficoltà.
// Se timeLimitMs === 0 (senza limite) non c'è bonus tempo: punti pieni per risposta corretta.
export function calculatePoints(
  timeTakenMs: number,
  timeLimitMs: number,
  isCorrect: boolean,
  basePoints: number = 1000,
  difficulty: string = "MEDIUM"
): number {
  if (!isCorrect) return 0;
  if (timeLimitMs <= 0) {
    // Senza limite di tempo: niente bonus velocità, solo moltiplicatore difficoltà
    return Math.round(basePoints * difficultyMultiplier(difficulty));
  }
  const timeRatio = Math.max(0, 1 - timeTakenMs / timeLimitMs);
  // Min metà, max basePoints se istantanea
  const raw = basePoints * 0.5 + basePoints * 0.5 * timeRatio;
  return Math.round(raw * difficultyMultiplier(difficulty));
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
