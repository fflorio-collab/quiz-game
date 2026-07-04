// Calcolo punti condiviso. Estratto da game-actions per poter essere importato anche
// da game-broadcasts senza creare un ciclo di import (game-actions ↔ game-broadcasts).

// Risolve i punti base per la domanda corrente: pointsOverrides per-round (torneo)
// se presente e > 0, altrimenti il default della Question.
export function resolveBasePoints(
  game: { pointsOverrides: string | null; tournamentModes: string | null; totalQuestions: number; currentIndex: number },
  questionDefault: number,
): number {
  if (!game.pointsOverrides) return questionDefault;
  const values = game.pointsOverrides.split(",").map((n) => Number(n));
  const modes = game.tournamentModes ? game.tournamentModes.split(",") : null;
  if (!modes || modes.length <= 1) {
    const v = values[0];
    return v && v > 0 ? v : questionDefault;
  }
  const perRound = Math.max(1, Math.floor(game.totalQuestions / modes.length));
  const roundIdx = Math.min(modes.length - 1, Math.floor(game.currentIndex / perRound));
  const v = values[roundIdx];
  return v && v > 0 ? v : questionDefault;
}
