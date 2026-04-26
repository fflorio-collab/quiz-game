// Helper per descrivere la "modalità di gioco" di una partita con una label human-readable.
// Usato al termine della partita per salvare in Leaderboard.gameMode, così la UI può
// mostrare sotto quale formato il punteggio è stato ottenuto.
//
// Le modalità sono in ordine di priorità: se più flag sono attivi, viene scelto il più specifico.
// Esempio: una partita con jeopardyMode=true viene etichettata "Jeopardy" anche se anche
// lastManStanding è attivo, perché Jeopardy definisce la struttura primaria della partita.

export type GameModeInput = {
  jeopardyMode?: boolean | null;
  tournamentModes?: string | null;
  speedrunDuration?: number | null;
  lastManStanding?: boolean | null;
  livesAllowed?: number | null;
  localPartyMode?: boolean | null;
};

export function describeGameMode(game: GameModeInput): string {
  if (game.jeopardyMode) return "Jeopardy";
  if (game.tournamentModes) {
    const count = game.tournamentModes.split(",").filter(Boolean).length;
    return count > 0 ? `Torneo (${count} round)` : "Torneo";
  }
  if (game.speedrunDuration && game.speedrunDuration > 0) {
    return `Speedrun ${game.speedrunDuration}s`;
  }
  if (game.lastManStanding) return "Ultimo in piedi";
  if (game.livesAllowed && game.livesAllowed > 0) {
    return `Caduta libera (${game.livesAllowed} vite)`;
  }
  if (game.localPartyMode) return "Modalità presentatore";
  return "Classica";
}

// Elenco dei valori canonici che possono apparire nel DB.
// Utile per costruire un filtro dropdown lato leaderboard.
export const GAME_MODE_FAMILIES = [
  "Classica",
  "Jeopardy",
  "Torneo",
  "Speedrun",
  "Ultimo in piedi",
  "Caduta libera",
  "Modalità presentatore",
] as const;

export type GameModeFamily = typeof GAME_MODE_FAMILIES[number];

// Estrae la "famiglia" di una label (es. "Speedrun 60s" → "Speedrun", "Torneo (3 round)" → "Torneo").
// Così il filtro UI può raggruppare varianti dello stesso formato.
export function gameModeFamily(mode: string | null | undefined): GameModeFamily | null {
  if (!mode) return null;
  for (const fam of GAME_MODE_FAMILIES) {
    if (mode === fam || mode.startsWith(`${fam} `) || mode.startsWith(`${fam}(`)) return fam;
  }
  return null;
}
