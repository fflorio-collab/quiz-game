import { parseRoundsConfig, effectiveRound } from "@/lib/roundsConfig";
import type { QuestionType } from "@/types/socket";

// Logica dei turni (modalità TURN_BASED). Funzioni pure, niente accesso al DB:
// vengono riusate da answer-route, tick-route, snapshot e game-actions.
//
// Modello:
// - Il giocatore di turno è DERIVATO da turnOrder + currentIndex + numero di
//   risposte già date sulla domanda corrente (nessuna colonna DB dedicata).
// - turnPlayerId = activeOrder[(currentIndex + attempts) % N]:
//     • la componente `currentIndex` ruota il "primo" giocatore tra una domanda
//       e l'altra (D0 → A, D1 → B, ...);
//     • la componente `attempts` fa la staffetta DENTRO la stessa domanda
//       quando passOnWrong è attivo (ogni risposta sbagliata passa al successivo).

type GameTurnFields = {
  playMode: string;
  passOnWrong: boolean;
  roundsConfig: string | null;
  totalQuestions: number;
  currentIndex: number;
};

type PlayerTurnFields = {
  id: string;
  eliminated: boolean;
  joinedAt: Date;
};

// Risolve playMode/passOnWrong EFFETTIVI per la domanda corrente.
// Se la partita usa roundsConfig (torneo moderno), applica l'override del round
// corrente; altrimenti usa i campi di default a livello di Game.
export function resolveTurnConfig(game: GameTurnFields): { turnBased: boolean; passOnWrong: boolean } {
  const rounds = parseRoundsConfig(game.roundsConfig);
  if (rounds && rounds.length > 0) {
    const perRound = Math.max(1, Math.floor(game.totalQuestions / rounds.length));
    const roundIdx = Math.min(rounds.length - 1, Math.floor(game.currentIndex / perRound));
    const eff = effectiveRound(rounds[roundIdx], {
      playMode: game.playMode === "TURN_BASED" ? "TURN_BASED" : "FREE_FOR_ALL",
      passOnWrong: game.passOnWrong,
    });
    return { turnBased: eff.playMode === "TURN_BASED", passOnWrong: !!eff.passOnWrong };
  }
  return { turnBased: game.playMode === "TURN_BASED", passOnWrong: !!game.passOnWrong };
}

// Ordine di turno "attivo": id dei player non eliminati, nell'ordine di turnOrder
// (CSV di Player.id). I player non presenti nel CSV (o se il CSV è vuoto/assente)
// vengono accodati in ordine di ingresso (joinedAt). Robusto a turnOrder incoerente.
export function parseActiveTurnOrder(
  turnOrderCsv: string | null,
  players: PlayerTurnFields[],
): string[] {
  const activeIds = new Set(players.filter((p) => !p.eliminated).map((p) => p.id));
  const ordered: string[] = [];
  const seen = new Set<string>();
  if (turnOrderCsv) {
    for (const id of turnOrderCsv.split(",")) {
      if (activeIds.has(id) && !seen.has(id)) {
        ordered.push(id);
        seen.add(id);
      }
    }
  }
  const rest = players
    .filter((p) => !p.eliminated && !seen.has(p.id))
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  for (const p of rest) ordered.push(p.id);
  return ordered;
}

// Giocatore di turno per la domanda corrente, dato l'ordine attivo, l'indice di
// domanda e quante risposte sono già state date su questa domanda.
export function turnPlayerId(
  activeOrder: string[],
  currentIndex: number,
  attempts: number,
): string | null {
  if (activeOrder.length === 0) return null;
  return activeOrder[(currentIndex + attempts) % activeOrder.length];
}

// ─── Layout dei round (robusto a indici che "saltano": Scegli categoria / Jeopardy) ──
// Sorgente preferita: roundsConfig (ricco di override per-round); fallback: tournamentModes (CSV).
// Entrambi nascono dallo stesso array `modes` in route.ts → stessa lunghezza/ordine.
// null = partita single-round (nessun confine di round).
export function resolveRoundTypes(game: {
  roundsConfig: string | null;
  tournamentModes: string | null;
}): QuestionType[] | null {
  const rounds = parseRoundsConfig(game.roundsConfig);
  if (rounds && rounds.length > 0) return rounds.map((r) => r.type) as QuestionType[];
  if (game.tournamentModes) {
    const modes = game.tournamentModes.split(",").filter(Boolean) as QuestionType[];
    if (modes.length > 0) return modes;
  }
  return null;
}

// roundCount + perRound canonici. perRound = floor(totalQuestions / roundCount).
export function resolveRoundLayout(game: {
  roundsConfig: string | null;
  tournamentModes: string | null;
  totalQuestions: number;
}): { roundTypes: QuestionType[]; roundCount: number; perRound: number } | null {
  const roundTypes = resolveRoundTypes(game);
  if (!roundTypes || roundTypes.length === 0) return null;
  const roundCount = roundTypes.length;
  return { roundTypes, roundCount, perRound: Math.max(1, Math.floor(game.totalQuestions / roundCount)) };
}

// Finestra [lo, hi) di `order` del round CORRENTE = round più basso con almeno una
// domanda non ancora estratta (askedAt == null). Robusto perché si basa su `order`
// (fisso) + askedAt, non su currentIndex (che salta in categoryPick).
// `gameQuestions` DEVE essere ordinato per order asc.
export function currentRoundBounds(
  game: { roundsConfig: string | null; tournamentModes: string | null; totalQuestions: number },
  gameQuestions: { order: number; askedAt: Date | null }[],
): { lo: number; hi: number } {
  const layout = resolveRoundLayout(game);
  if (!layout) return { lo: 0, hi: Number.MAX_SAFE_INTEGER }; // single-round: tutte le domande
  const { roundCount, perRound } = layout;
  const firstUnasked = gameQuestions.find((gq) => !gq.askedAt);
  const currentRound = firstUnasked
    ? Math.min(roundCount - 1, Math.floor(firstUnasked.order / perRound))
    : 0;
  return { lo: currentRound * perRound, hi: (currentRound + 1) * perRound };
}

// Numero di sequenza 0-based della domanda corrente, robusto a indici che "saltano".
// askedCount include la domanda corrente (già marcata askedAt): la sua posizione
// 0-based nella sequenza di gioco è askedCount - 1.
export function questionSeq(askedCount: number): number {
  return Math.max(0, askedCount - 1);
}
