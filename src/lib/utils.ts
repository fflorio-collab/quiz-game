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

// Punti = base × moltiplicatore difficoltà (EASY 0.5 / MEDIUM 1 / HARD 2).
// Niente bonus tempo, niente bonus streak: punteggio piatto e prevedibile
// (base 100 → 50 / 100 / 200). I parametri timeTaken/timeLimit restano nella
// firma per non toccare i call site, ma vengono ignorati.
export function calculatePoints(
  _timeTakenMs: number,
  _timeLimitMs: number,
  isCorrect: boolean,
  basePoints: number = 100,
  difficulty: string = "MEDIUM"
): number {
  if (!isCorrect) return 0;
  return Math.round(basePoints * difficultyMultiplier(difficulty));
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
