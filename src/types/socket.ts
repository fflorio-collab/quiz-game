// Tipi condivisi tra client e server per Socket.io
// QuestionType è definito in un unico posto: src/lib/questionTypes.ts
// (contratto unico per validazione, dispatcher, UI).

import type { QuestionType } from "../lib/questionTypes.js";
export type { QuestionType };
export type DifficultyFilter = "EASY" | "MEDIUM" | "HARD" | "ALL";

export interface ServerToClientEvents {
  // Eventi della lobby
  "lobby:updated": (data: { players: PlayerInfo[]; hostConnected: boolean }) => void;
  "lobby:started": () => void;

  // Eventi di gioco
  "game:question": (data: QuestionData) => void;
  "game:timer": (data: { remaining: number }) => void;
  "game:answer-received": (data: { playerId: string }) => void;
  "game:reveal": (data: RevealData) => void;
  "game:leaderboard": (data: { players: PlayerInfo[] }) => void;
  "game:finished": (data: { players: PlayerInfo[] }) => void;
  "game:speedrun-timer": (data: { remaining: number }) => void;
  // Jeopardy: stato della griglia inviato a tutti quando la partita aspetta la scelta dell'host
  "game:jeopardy-grid": (data: JeopardyGridData) => void;
  // "Scegli categoria": griglia categorie con domande rimanenti, host sceglie quale giocare
  "game:category-grid": (data: CategoryGridData) => void;

  // Modalità "In presenza": stato del round corrente (chi è stato giudicato e come)
  "game:local-state": (data: LocalRoundState) => void;
  // Solo host (in presenza): soluzione della domanda corrente, così l'host sa cosa giudicare
  "game:local-host-info": (data: { correctAnswerText: string }) => void;

  // Solo host: richiesta giudizio risposte aperte
  "game:judge-answers": (data: JudgeAnswersData) => void;

  // 100 Secondi (duello 1v1)
  "duel:state": (data: DuelState) => void;
  "duel:host-info": (data: { correctAnswer: string }) => void; // solo host: soluzione della domanda corrente
  "duel:ended": (data: { winnerId: string; loserId: string; winnerNickname: string; loserNickname: string }) => void;

  // Eventi di errore
  error: (data: { message: string }) => void;
  "player:joined": (data: { player: PlayerInfo }) => void;
  "player:left": (data: { playerId: string }) => void;
}

export interface ClientToServerEvents {
  // Host
  "host:create": (
    data: {
      hostName: string;
      difficulty: string;                // "EASY" | "MEDIUM" | "HARD" | "ALL"
      totalQuestions: number;
      questionType: QuestionType;
      tournamentModes?: QuestionType[];  // se presente, attiva torneo; totalQuestions è per ogni modalità
      tournamentTimeLimits?: number[];   // allineato a tournamentModes: secondi per round (0 = senza limite)
      categoryIds?: string[];            // se presente, filtra le domande a queste categorie
      timeLimitOverride?: number | null; // null/undefined = usa timeLimit della domanda; 0 = senza limite; 10-60 = secondi
      lastManStanding?: boolean;         // modalità "Ultimo in piedi": risposta sbagliata = eliminato
      speedrunDuration?: number | null;  // modalità "Speedrun": secondi totali (30/60/90/120); null = off
      livesAllowed?: number | null;      // modalità "Caduta libera": errori tollerati (1-5); null = off
      jeopardyMode?: boolean;            // modalità "Jeopardy": griglia categorie × valori scelti dall'host
      fiftyFiftyCount?: number;          // aiuti 50/50 per player (0-3); 0 = disabilitato
      skipCount?: number;                // aiuti Salto per player (0-3); 0 = disabilitato
      localPartyMode?: boolean;          // "Modalità presentatore": niente dispositivi, host gestisce giocatori e giudizi a voce
      pointsOverrides?: number[];        // punti per round (allineato a tournamentModes; lunghezza 1 per singola modalità). 0/mancante = usa il base della domanda.
      tournamentCategoryIds?: string[][]; // categorie per round (uno array per round); array vuoto = nessun filtro per quel round
      categoryPickMode?: boolean;        // se true: l'host sceglie la CATEGORIA prima di ogni domanda (griglia con rimanenti)
      // Selezione manuale delle domande per round (allineato a tournamentModes; length 1 per singola modalità).
      // Se presente e con length == totalQuestions per quel round, sovrascrive il picking casuale.
      manualQuestionIds?: string[][];
    },
    callback: (response: { code: string; gameId: string } | { error: string }) => void
  ) => void;
  "host:join": (
    data: { gameId: string },
    callback: (response: { success: true; state: GameStateSnapshot } | { success: false; error: string }) => void
  ) => void;
  "host:start": (data: { gameId: string }) => void;
  "host:next": (data: { gameId: string }) => void;
  // Termina manualmente la domanda corrente (utile quando timeLimit=0 / senza limite)
  "host:endQuestion": (data: { gameId: string }) => void;
  // Jeopardy: l'host sceglie una cella (= gameQuestionId) della griglia
  "host:jeopardy-pick": (data: { gameId: string; gameQuestionId: string }) => void;

  // Host giudica le risposte aperte
  "host:judge": (data: {
    gameId: string;
    judgments: { playerId: string; isCorrect: boolean }[];
  }) => void;

  // Modalità presentatore: host aggiunge un giocatore manualmente (senza dispositivo)
  "host:local-add-player": (
    data: { gameId: string; nickname: string; emoji?: string },
    callback: (response: { ok: true; playerId: string } | { error: string }) => void
  ) => void;
  // Modalità presentatore: host rimuove un giocatore dalla lobby
  "host:local-remove-player": (data: { gameId: string; playerId: string }) => void;
  // Modalità presentatore: host giudica la risposta data a voce da un singolo giocatore
  "host:local-judge": (data: { gameId: string; playerId: string; isCorrect: boolean }) => void;
  // Modalità presentatore: host imposta il "giocatore di turno" (playerId = null → nessuno).
  // Utile per evidenziare chi deve rispondere alla domanda corrente.
  "host:local-set-turn": (data: { gameId: string; playerId: string | null }) => void;
  // Host termina la partita prima del previsto (ignora domande rimanenti)
  "host:finish": (data: { gameId: string }) => void;
  // Modalità "Scegli categoria": host sceglie una categoria dalla griglia per la prossima domanda
  "host:category-pick": (data: { gameId: string; categoryId: string }) => void;

  // Player
  "player:join": (
    data: { code: string; nickname: string; emoji?: string; avatarUrl?: string },
    callback: (response: { playerId: string; gameId: string } | { error: string }) => void
  ) => void;
  "player:rejoin": (
    data: { gameId: string; playerId: string },
    callback: (response: { success: true; state: GameStateSnapshot } | { success: false; error: string }) => void
  ) => void;
  "player:answer": (data: {
    playerId: string;
    gameId: string;
    answerId?: string;      // per MULTIPLE_CHOICE
    answerText?: string;    // per OPEN_ANSWER, WORD_COMPLETION, IMAGE_GUESS
    timeTaken: number;
    skipped?: boolean;      // aiuto "Salto": nessun punto ma non elimina
  }) => void;

  // Scommessa "doppio o niente": player decide quanto rischiare sulla prossima domanda
  "player:wager": (
    data: { playerId: string; gameId: string; amount: number }, // amount in punti; 0 = annulla
    callback: (response: { ok: true; wager: number } | { error: string }) => void
  ) => void;

  // Aiuto "50/50": chiede al server di rivelare 2 risposte sbagliate da nascondere
  "player:fifty-fifty": (
    data: { playerId: string; gameId: string; gameQuestionId: string },
    callback: (response: { hideIds: string[] } | { error: string }) => void
  ) => void;

  // Spettatore (schermo proiezione / TV): si collega con codice, vede lo stato pubblico senza la soluzione
  "spectator:join": (
    data: { code: string },
    callback: (response: { success: true; gameId: string; state: GameStateSnapshot } | { success: false; error: string }) => void
  ) => void;

  // 100 Secondi: host avvia il duello scegliendo i 2 sfidanti
  "duel:start": (
    data: { gameId: string; playerAId: string; playerBId: string; durationSec?: number },
    callback: (response: { ok: true } | { error: string }) => void
  ) => void;
  // 100 Secondi: host ferma anticipatamente
  "duel:stop": (data: { gameId: string }) => void;
  // 100 Secondi: host giudica la risposta (detta a voce dal player attivo)
  "duel:judge": (data: { gameId: string; isCorrect: boolean }) => void;
  // 100 Secondi: host mette in pausa / riprende il duello
  "duel:pause": (data: { gameId: string; paused: boolean }) => void;
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  score: number;
  emoji?: string | null;
  avatarUrl?: string | null;
  eliminated?: boolean; // modalità "Ultimo in piedi" / "Caduta libera"
  wrongCount?: number;  // errori commessi (per "Caduta libera")
  fiftyFiftyUsed?: number; // aiuti 50/50 usati
  skipUsed?: number;       // aiuti Salto usati
  streak?: number;         // streak corrente (risposte corrette consecutive)
  bestStreak?: number;     // miglior streak raggiunto in partita
  pendingWager?: number;   // scommessa attiva per la prossima domanda
}

export interface QuestionData {
  questionId: string;
  gameQuestionId: string;
  text: string;
  questionType: QuestionType;
  answers: Array<{ id: string; text: string }>;
  timeLimit: number;
  questionNumber: number;
  totalQuestions: number;
  category?: { name: string; icon?: string | null; color?: string | null };
  imageUrl?: string | null;       // URL immagine o video allegato
  mediaType?: string | null;      // "image" | "video"
  wordTemplate?: string | null;   // per WORD_COMPLETION
}

export interface RevealData {
  questionType: QuestionType;
  correctAnswerId?: string;       // per MULTIPLE_CHOICE
  correctAnswerText: string;
  playerResults: Array<{
    playerId: string;
    nickname: string;
    wasCorrect: boolean;
    pointsEarned: number;
    totalScore: number;
    answerText?: string;          // per tipi testuali
  }>;
  nextRound?: {                   // presente se la prossima domanda cambia modalità (torneo)
    modeType: QuestionType;
    modeLabel: string;
    roundNumber: number;          // 2 = secondo round, 3 = terzo...
    totalRounds: number;
  };
}

export interface JudgeAnswersData {
  gameQuestionId: string;
  questionId: string;
  answers: Array<{
    playerId: string;
    nickname: string;
    answerText: string;
  }>;
}

// Modalità presentatore: stato dei giudizi sulla domanda corrente
export interface LocalRoundState {
  gameQuestionId: string;
  // Per ogni giocatore: non ancora giudicato (null), corretto (true) o sbagliato (false)
  judgments: Record<string, boolean | null>;
  // Giocatore di turno (highlight): null = nessuno evidenziato
  activePlayerId?: string | null;
}

// "Scegli categoria": griglia di categorie con numero di domande rimanenti
export interface CategoryGridData {
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    remaining: number; // domande ancora disponibili in questa categoria per la partita
  }>;
  // Informazioni sul round corrente in torneo (per contesto UI); undefined se singola modalità
  roundInfo?: {
    modeType: QuestionType;
    modeLabel: string;
    roundNumber: number;
    totalRounds: number;
    questionIndexInRound: number;
    questionsPerRound: number;
  };
}

// 100 Secondi: stato del duello 1v1
export interface DuelPlayer {
  id: string;
  nickname: string;
  emoji?: string | null;
  avatarUrl?: string | null;
  timeLeftMs: number;
}

export interface DuelState {
  playerA: DuelPlayer;
  playerB: DuelPlayer;
  activePlayerId: string;
  question: { text: string; masked: string; length: number } | null;
  lastResult?: {
    playerId: string;
    correct: boolean;
    correctAnswer: string;
  };
  turnSeq: number;
  durationSec: number;
  finished: boolean;
  paused: boolean; // true = timer fermo e rivelazione lettere sospesa
}

// Jeopardy: griglia delle celle disponibili/consumate
export interface JeopardyGridData {
  cells: Array<{
    gameQuestionId: string;
    categoryId: string;
    categoryName: string;
    categoryIcon?: string | null;
    categoryColor?: string | null;
    value: number;              // 100, 200, 300, 400, 500
    consumed: boolean;
  }>;
}

// Snapshot dello stato per rientrare in partita
export type GameStateSnapshot = {
  gameStatus: "LOBBY" | "PLAYING" | "FINISHED";
  code: string;
  players: PlayerInfo[];
  // Solo se PLAYING
  currentQuestion?: QuestionData;
  remainingTime?: number;              // secondi rimanenti sulla domanda corrente
  alreadyAnswered?: boolean;           // solo per il player: ha già risposto alla corrente
  isRevealing?: boolean;               // true se la domanda corrente è già in fase reveal
  reveal?: RevealData;                 // dati del reveal in corso
  judging?: JudgeAnswersData;          // solo host: dati di giudizio risposte aperte in corso
  speedrunRemaining?: number;          // secondi rimanenti al timer globale speedrun
  livesAllowed?: number | null;        // Caduta libera: vite consentite
  jeopardyGrid?: JeopardyGridData;     // Jeopardy: griglia corrente (se mode attivo, tra una domanda e l'altra)
  fiftyFiftyCount?: number;            // aiuti 50/50 consentiti per player
  skipCount?: number;                  // aiuti Salto consentiti per player
  duel?: DuelState;                    // 100 Secondi: duello in corso
  localPartyMode?: boolean;            // Modalità presentatore: host gestisce tutto a voce
  localState?: LocalRoundState;        // Modalità presentatore: stato giudizi della domanda corrente
  correctAnswerText?: string;          // Modalità presentatore: soluzione della domanda corrente (solo host)
  categoryPickMode?: boolean;          // "Scegli categoria" abilitato
  categoryGrid?: CategoryGridData;     // Se l'host deve scegliere la categoria ora
  // Solo se FINISHED
  finalRanking?: PlayerInfo[];
};
