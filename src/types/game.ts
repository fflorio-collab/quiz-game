// Contratto tipi condiviso del gameshow (rebuild/gameshow).
// Versione slimmata di src/types/socket.ts: motore Pusher + API routes Next.js.
//
// Regole del contratto:
// - SOLO i 3 tipi di domanda attivi (MULTIPLE_CHOICE, OPEN_ANSWER, IMAGE_GUESS).
// - Niente feature eliminate: duello/100 secondi, wager, aiuti 50/50 e skip,
//   speedrun, vite/caduta libera, ultimo in piedi, XP/badge, spettatori con
//   record DB/reazioni. Se ti serve uno di quei campi, la feature non esiste più.
// - Nessun import: questo file è la fonte di verità autonoma per motore e UI.
//   (src/types/socket.ts resta finché il vecchio codice non viene rimosso.)

// ─── Tipi base ────────────────────────────────────────────────────────────────

// Tipi di domanda attivi. Se aggiungi un tipo, lo aggiungi SOLO qui:
// il resto della piattaforma (validazioni, dispatcher, UI) deriva da questa union.
export type QuestionTypeId = "MULTIPLE_CHOICE" | "OPEN_ANSWER" | "IMAGE_GUESS";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
// Filtro difficoltà nelle configurazioni: "ALL" = nessun filtro.
export type DifficultyFilter = Difficulty | "ALL";

export type GameStatus = "LOBBY" | "PLAYING" | "FINISHED";

// Modalità di gioco: tutti rispondono insieme, oppure un giocatore alla volta.
export type PlayMode = "FREE_FOR_ALL" | "TURN_BASED";

// Media allegato alla domanda (Question.mediaType).
export type MediaType = "image" | "video" | "youtube";

// ─── Giocatore ────────────────────────────────────────────────────────────────

export interface PlayerInfo {
  id: string;
  nickname: string;
  score: number;
  emoji?: string | null;
  avatarUrl?: string | null;
  // Sopravvive per compatibilità col DB (Player.eliminated ha default false):
  // nel rebuild nessuna modalità elimina, quindi resta sempre false.
  eliminated: boolean;
  streak: number;     // risposte corrette consecutive (corrente)
  bestStreak: number; // miglior streak raggiunto in partita
}

// ─── Domanda in gioco ─────────────────────────────────────────────────────────

export interface QuestionData {
  questionId: string;
  gameQuestionId: string;
  text: string;
  questionType: QuestionTypeId;
  // Risposte da mostrare: 4 opzioni mescolate per MULTIPLE_CHOICE,
  // array vuoto per OPEN_ANSWER / IMAGE_GUESS (risposte nascoste).
  answers: Array<{ id: string; text: string }>;
  // Secondi a disposizione. 0 = senza limite (l'host chiude manualmente).
  timeLimit: number;
  // Punti in palio per risposta esatta, GIÀ risolti dal motore
  // (override del round / moltiplicatore difficoltà applicati).
  points: number;
  difficulty: Difficulty;
  questionNumber: number;  // progressivo 1-based delle domande servite
  totalQuestions: number;  // totale domande della partita
  category?: { name: string; icon?: string | null; color?: string | null };
  imageUrl?: string | null;         // URL immagine o video allegato
  mediaType?: MediaType | null;
  mediaAudioOnly?: boolean | null;  // YouTube: nascondi video, mostra solo audio
  mediaMaxDuration?: number | null; // YouTube: durata massima riproduzione (secondi)
  // Modalità a turni: chi è di turno su questa domanda. null/assente = FREE_FOR_ALL.
  turnPlayerId?: string | null;
  turnPlayerNickname?: string | null;
}

// ─── Reveal (fine domanda) ────────────────────────────────────────────────────

export interface RevealData {
  questionType: QuestionTypeId;
  correctAnswerId?: string; // solo MULTIPLE_CHOICE
  correctAnswerText: string;
  playerResults: Array<{
    playerId: string;
    nickname: string;
    wasCorrect: boolean;
    pointsEarned: number;
    totalScore: number;
    answerText?: string; // per i tipi testuali (OPEN_ANSWER, IMAGE_GUESS)
  }>;
  // Presente se la prossima domanda apre un nuovo round (confine round del torneo).
  nextRound?: {
    modeType: QuestionTypeId;
    modeLabel: string;
    roundNumber: number; // 2 = secondo round, 3 = terzo...
    totalRounds: number;
  };
}

// ─── Giudizio manuale (OPEN_ANSWER / IMAGE_GUESS) ─────────────────────────────

export interface JudgeAnswersData {
  gameQuestionId: string;
  questionId: string;
  answers: Array<{
    playerId: string;
    nickname: string;
    answerText: string;
  }>;
}

// ─── Modalità presentatore (localPartyMode) ───────────────────────────────────

// Stato dei giudizi sulla domanda corrente (host giudica a voce, senza dispositivi).
export interface LocalRoundState {
  gameQuestionId: string;
  // Per ogni giocatore: non ancora giudicato (null), corretto (true) o sbagliato (false)
  judgments: Record<string, boolean | null>;
  // Giocatore di turno (highlight): null = nessuno evidenziato
  activePlayerId?: string | null;
}

// ─── "Scegli categoria" ───────────────────────────────────────────────────────

// Griglia di categorie con numero di domande rimanenti, scope al round corrente.
export interface CategoryGridData {
  categories: Array<{
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    remaining: number; // domande ancora disponibili in questa categoria
    // Suddivisione per difficoltà: per scegliere categoria + difficoltà e vedere
    // i punti in palio (base × moltiplicatore Facile/Medio/Difficile).
    difficulties?: Array<{ difficulty: Difficulty; remaining: number; points: number }>;
  }>;
  // Modalità a turni: chi sceglierà la categoria = chi risponderà alla prossima
  // domanda. null/assente = free-for-all (sceglie l'host).
  turnPlayerId?: string | null;
  turnPlayerNickname?: string | null;
  // Contesto del round corrente in torneo; assente se singola modalità.
  // NOTA rebuild: il vecchio server non lo popolava mai (la UI lo leggeva a vuoto);
  // il motore nuovo DEVE popolarlo quando la partita è multi-round.
  roundInfo?: {
    modeType: QuestionTypeId;
    modeLabel: string;
    roundNumber: number;
    totalRounds: number;
    questionIndexInRound: number; // 1-based dentro il round
    questionsPerRound: number;
  };
}

// ─── Jeopardy ─────────────────────────────────────────────────────────────────

// Griglia delle celle categoria × valore, disponibili/consumate.
export interface JeopardyGridData {
  cells: Array<{
    gameQuestionId: string;
    categoryId: string;
    categoryName: string;
    categoryIcon?: string | null;
    categoryColor?: string | null;
    value: number; // 100, 200, 300, 400, 500
    consumed: boolean;
  }>;
}

// ─── Snapshot dello stato (rejoin / refresh) ──────────────────────────────────

// Ricostruito interamente da DB: sopravvive a restart worker / multi-instance.
export type GameStateSnapshot = {
  gameStatus: GameStatus;
  code: string;
  players: PlayerInfo[];
  // Round corrente del torneo (1-based) e totale round; assenti se singola modalità.
  roundNumber?: number;
  roundCount?: number;
  // Solo se PLAYING
  currentQuestion?: QuestionData;
  remainingTime?: number;    // secondi rimanenti sulla domanda corrente
  alreadyAnswered?: boolean; // solo per il player: ha già risposto alla corrente
  isRevealing?: boolean;     // true se la domanda corrente è già in fase reveal
  reveal?: RevealData;       // dati del reveal in corso
  judging?: JudgeAnswersData;      // solo host: giudizio risposte aperte in corso
  jeopardyGrid?: JeopardyGridData; // Jeopardy: griglia corrente (tra una domanda e l'altra)
  categoryGrid?: CategoryGridData; // "Scegli categoria": se va scelta la categoria ora
  localPartyMode?: boolean;        // Modalità presentatore attiva
  localState?: LocalRoundState;    // Presentatore: stato giudizi della domanda corrente
  correctAnswerText?: string;      // Presentatore: soluzione della domanda (solo host)
  // Solo se FINISHED
  finalRanking?: PlayerInfo[];
};

// ─── Eventi realtime (Pusher, server → client) ────────────────────────────────

// Mappa evento → payload. Il motore emette SOLO questi eventi; la UI si
// sottoscrive tipizzata via `ServerEvents[K]`. Niente eventi client→server:
// le azioni del client passano dalle API routes (POST).
export interface ServerEvents {
  // Lobby
  "lobby:updated": { players: PlayerInfo[]; hostConnected: boolean };
  "lobby:started": Record<string, never>; // payload vuoto: segnale di start
  "player:joined": { player: PlayerInfo };

  // Flusso di gioco
  "game:question": QuestionData;
  // Modalità a turni: cambia il giocatore di turno sulla domanda corrente
  // (staffetta passOnWrong dentro la stessa domanda). remainingTime = timer resettato.
  "game:turn": {
    gameQuestionId: string;
    turnPlayerId: string | null;
    turnPlayerNickname: string | null;
    remainingTime: number;
  };
  "game:answer-received": { playerId: string };
  "game:judge-answers": JudgeAnswersData; // solo canale host
  "game:reveal": RevealData;
  "game:leaderboard": { players: PlayerInfo[] };
  "game:category-grid": CategoryGridData;
  "game:jeopardy-grid": JeopardyGridData;
  "game:finished": { players: PlayerInfo[] };

  // Modalità presentatore
  "game:local-state": LocalRoundState;
  "game:local-host-info": { correctAnswerText: string }; // solo canale host

  // Errori applicativi push (es. partita chiusa mentre sei dentro)
  error: { message: string };
}

export type ServerEventName = keyof ServerEvents;

// ─── Configurazione round ─────────────────────────────────────────────────────

// Ogni round è auto-contenuto: tipo di domanda + tutte le opzioni attive.
// Serializzato come JSON in Game.roundsConfig.
export interface RoundConfig {
  // ID univoco lato client (drag&drop / animazioni). Il server può ignorarlo.
  id?: string;

  // Modalità della domanda (filtra il pool del DB)
  type: QuestionTypeId;

  // Difficoltà del round (override del filtro globale della partita)
  difficulty?: DifficultyFilter;

  // Tempo per domanda. 0 = senza limite (host termina manualmente). null/assente = default per tipo.
  timeLimit?: number | null;

  // Punteggio. null/assente = default per tipo (100 esatta, 0 sbagliata).
  pointsExact?: number | null;
  pointsWrong?: number | null;

  // Sorgente domande (priorità: manualQuestionIds > packIds > categoryIds > pool globale)
  manualQuestionIds?: string[]; // se popolato → uso queste domande, in ordine
  packIds?: string[];           // se popolato → estraggo a caso da queste pack
  categoryIds?: string[];       // se popolato → estraggo a caso da queste categorie

  // Opzioni di gioco del round
  categoryPick?: boolean; // "Scegli categoria": scelta della categoria pre-domanda
  jeopardy?: boolean;     // griglia categoria × valore (solo OPEN_ANSWER)

  // Modalità di gioco. Assenti = eredita i default della partita.
  playMode?: PlayMode;
  passOnWrong?: boolean; // solo TURN_BASED: errore = la domanda passa al successivo
}

// ─── API v1 (request/response delle route Next.js) ────────────────────────────

// POST /api/v1/game — crea la partita.
export interface CreateGameRequest {
  hostName?: string;
  // Domande estratte PER OGNI round (stessa semantica del vecchio totalQuestions:
  // il totale della partita è rounds.length × questionsPerRound).
  questionsPerRound: number;
  rounds: RoundConfig[];
  // Default di partita, ereditati dai round che non li specificano.
  playMode?: PlayMode;
  passOnWrong?: boolean;
  localPartyMode?: boolean;   // modalità presentatore (vale per tutta la partita)
  difficulty?: DifficultyFilter; // filtro globale (i round possono sovrascriverlo)
}

export interface CreateGameResponse {
  gameId: string;
  code: string;
  // Token segreto dell'host: autorizza le azioni di regia (start/next/judge/…).
  // Il rebuild lo introduce al posto del "chiunque conosce il gameId è host".
  hostToken: string;
}

// POST /api/v1/player — entra in partita col codice.
export interface JoinGameRequest {
  code: string;
  nickname: string;
  emoji?: string;
  avatarUrl?: string;
}

export interface JoinGameResponse {
  playerId: string;
  gameId: string;
  code: string;
}

// GET /api/v1/game/[id]/tick — polling timer: legge i secondi rimanenti e
// innesca la fine automatica della domanda quando la deadline scade.
export interface TickResponse {
  ok: boolean;
  questionRemaining: number | null; // null = nessuna domanda attiva / senza limite
  status: GameStatus;
}

// GET /api/v1/game/lookup?code=… — risolve un codice partita in gameId.
export interface LookupResponse {
  gameId: string;
  status: GameStatus;
}
