// Configurazione round del torneo (e per riflesso anche della partita singola).
// Sostituisce i 5 campi CSV paralleli (`tournamentModes`, `tournamentTimeLimits`,
// `pointsOverrides`, `tournamentCategoryIds`, `manualQuestionIds`) con un'unica
// struttura JSON serializzata in `Game.roundsConfig`.
//
// Ogni round è auto-contenuto: dichiara il tipo di domanda + tutte le opzioni che
// vuole attive. La UI host filtra le opzioni mostrabili in base alla capability matrix
// (src/lib/questionTypes.ts).

import type { QuestionType } from "./questionTypes";

export type PlayMode = "FREE_FOR_ALL" | "TURN_BASED";
export type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";

export interface RoundConfig {
  // ID univoco lato client (utile per drag&drop / animazioni). Il server può ignorarlo.
  id?: string;

  // Modalità della domanda (filtra il pool del DB)
  type: QuestionType;

  // Difficoltà del round (override del filtro globale)
  difficulty?: DifficultyFilter;

  // Tempo per domanda. 0 = senza limite (host termina manualmente). null = default per tipo.
  timeLimit?: number | null;

  // Punteggio
  pointsExact?: number | null;   // null = default per tipo (100 di base, 0 per Ghigliottina, valore cella per Jeopardy)
  pointsWrong?: number | null;   // null = default per tipo (0)
  // Bonus al vincitore (solo Ghigliottina). null = default (1000).
  winnerBonus?: number | null;

  // Sorgente domande (mutuamente esclusivi nell'ordine: manualQuestionIds > packIds > categoryIds > globale)
  manualQuestionIds?: string[];  // se popolato → uso queste domande, in ordine
  packIds?: string[];            // se popolato → estraggo a caso da queste pack
  categoryIds?: string[];        // se popolato → estraggo a caso da queste categorie

  // Opzioni di gioco — vengono validate contro la capability matrix prima di salvare.
  // Se l'opzione non è compatibile col `type`, lato client va nascosta; il server rifiuta config invalide.
  speedrun?: number | null;      // durata totale in secondi (null/0 = off)
  fiftyFifty?: number;           // numero di aiuti 50/50 per player (0 = off)
  skip?: number;                 // numero di aiuti Salto per player (0 = off)
  lives?: number | null;         // "Caduta libera": errori tollerati (null = off). Reset a inizio round successivo.
  lastManStanding?: boolean;     // un errore = eliminato per questo round (rientri al round successivo)
  categoryPick?: boolean;        // host sceglie la categoria pre-domanda
  jeopardy?: boolean;            // griglia categoria × valore
  localPartyMode?: boolean;      // niente dispositivi, host legge

  // Modalità di gioco del round
  playMode?: PlayMode;           // default: eredita Game.playMode
  passOnWrong?: boolean;         // solo se playMode = TURN_BASED. default: eredita Game.passOnWrong
}

export type RoundsConfig = RoundConfig[];

// Min/max round del torneo (deciso con KING 10/05/2026).
export const TOURNAMENT_MIN_ROUNDS = 2;
export const TOURNAMENT_MAX_ROUNDS = 15;

// Serializzazione/parsing centralizzati.
// Tolleranti: roundsConfig vuoto/malformato → null (la partita ricade sui campi legacy).
export function serializeRoundsConfig(rounds: RoundsConfig | null | undefined): string | null {
  if (!rounds || rounds.length === 0) return null;
  return JSON.stringify(rounds);
}

export function parseRoundsConfig(raw: string | null | undefined): RoundsConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as RoundsConfig;
  } catch {
    return null;
  }
}

// Helper: ricava un RoundConfig "effettivo" applicando i default di Game per i campi non specificati.
// Usato dal server per non duplicare la logica di fallback ovunque.
export function effectiveRound(
  round: RoundConfig,
  gameDefaults: { playMode?: PlayMode; passOnWrong?: boolean }
): RoundConfig {
  return {
    ...round,
    playMode: round.playMode ?? gameDefaults.playMode ?? "FREE_FOR_ALL",
    passOnWrong: round.passOnWrong ?? gameDefaults.passOnWrong ?? false,
  };
}
