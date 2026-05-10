// Contratto unico dei tipi di domanda.
// Usato da: Prisma (validazione lato app), API admin (Zod), UI admin, UI host,
// contratto socket (src/types/socket.ts), dispatcher server (server/socket-server.ts).
//
// Regola: se aggiungi un tipo di domanda, lo aggiungi SOLO qui.
// Il resto della piattaforma deriva comportamento, label, validazioni da questa mappa.

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "OPEN_ANSWER",
  "WORD_COMPLETION",
  "IMAGE_GUESS",
  "GHIGLIOTTINA",
  "REACTION_CHAIN",
  "CLUE_REVEAL",
  "ONLY_CONNECT",
] as const;

export type QuestionType = typeof QUESTION_TYPES[number];

// Come il player inserisce la risposta
export type AnswerInput =
  | "choice"   // sceglie una delle opzioni (MULTIPLE_CHOICE)
  | "text"     // digita testo libero
  | "word";    // completa lettere in un template

// Come il server stabilisce se la risposta è corretta
export type AutoCheckMethod =
  | "answerId"    // match sull'Answer.id (choice corretta)
  | "answerText"  // match case-insensitive su Answer.text (isCorrect=true)
  | "openAnswer"; // match case-insensitive su Question.openAnswer

// Forma delle "risposte" (Answer[]) salvate nel DB per il tipo
export type StoredAnswers =
  | "none"       // nessuna Answer in DB (la correttezza è in openAnswer o la dà l'host)
  | "multiple"   // 4 Answer per MULTIPLE_CHOICE, min 1 per WORD_COMPLETION (con isCorrect)
  | "clues3"     // 3 indizi progressivi (REACTION_CHAIN)
  | "items4";    // 4 elementi del puzzle (ONLY_CONNECT)

// Come vengono mostrate le Answer al player in partita
export type DisplayAnswers =
  | "shuffled"   // mescolate (MULTIPLE_CHOICE)
  | "ordered"    // mantenere Answer.order (REACTION_CHAIN, ONLY_CONNECT)
  | "hidden";    // non inviate al client (OPEN_ANSWER, WORD_COMPLETION, ...)

// Compatibilità tipo × opzione di gioco.
// L'unica fonte di verità: UI host e validazione server-side derivano da qui.
// Aggiungere un'opzione globale = aggiungere un campo qui + filtrare in UI/server.
export interface QuestionTypeCompat {
  speedrun: boolean;        // timer globale a domande rapide
  fiftyFifty: boolean;      // aiuto 50/50 (solo MULTIPLE_CHOICE)
  skip: boolean;            // aiuto Salto
  lives: boolean;           // "Caduta libera" (errori tollerati)
  lastManStanding: boolean; // "Ultimo in piedi" (errore = eliminato)
  categoryPick: boolean;    // host sceglie la categoria pre-domanda
  jeopardy: boolean;        // griglia Jeopardy/Rischiatutto (solo OPEN_ANSWER)
  turnBased: boolean;       // a turni, un player risponde alla volta
  freeForAll: boolean;      // tutti rispondono insieme
  localPartyMode: boolean;  // modalità presentatore (no dispositivi)
}

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  icon: string;
  description: string;

  // Valutazione
  requiresJudging: boolean;             // host giudica manualmente le risposte
  autoCheck: AutoCheckMethod | null;    // null se requiresJudging

  // Interazione player
  answerInput: AnswerInput;

  // Dati in DB
  storedAnswers: StoredAnswers;
  requiresOpenAnswer: boolean;          // Question.openAnswer è obbligatorio
  requiresWordTemplate: boolean;        // Question.wordTemplate è obbligatorio
  requiresMedia: boolean;               // Question.imageUrl è obbligatorio

  // Rendering
  displayAnswers: DisplayAnswers;

  // Default
  defaultTimeLimit: number;             // secondi
  defaultPointsExact: number;           // punti per risposta corretta (default globale: 100)
  defaultPointsWrong: number;           // punti per risposta sbagliata (default globale: 0)
  // Per Ghigliottina: bonus al vincitore (default 1000, configurabile dall'host).
  // null per gli altri tipi.
  defaultWinnerBonus: number | null;

  // Compatibilità con opzioni globali
  compat: QuestionTypeCompat;
}

// Default punti globali — confermati con KING (10/05/2026):
// 100 punti per risposta esatta, 0 per risposta sbagliata.
// Ghigliottina ha un bonus al vincitore di 1000 di default (configurabile dall'host volta per volta).
// Jeopardy non usa questi default: il valore della cella scelta dal player è la fonte di verità.
const DEFAULT_POINTS_EXACT = 100;
const DEFAULT_POINTS_WRONG = 0;

export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
  MULTIPLE_CHOICE: {
    type: "MULTIPLE_CHOICE",
    label: "Risposta multipla",
    icon: "🔤",
    description: "4 opzioni, una sola corretta",
    requiresJudging: false,
    autoCheck: "answerId",
    answerInput: "choice",
    storedAnswers: "multiple",
    requiresOpenAnswer: false,
    requiresWordTemplate: false,
    requiresMedia: false,
    displayAnswers: "shuffled",
    defaultTimeLimit: 20,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,
      fiftyFifty: true,        // unica modalità che ammette 50/50
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: false,         // Jeopardy è solo OPEN_ANSWER
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
  OPEN_ANSWER: {
    type: "OPEN_ANSWER",
    label: "Risposta aperta",
    icon: "✏️",
    description: "L'host giudica le risposte",
    requiresJudging: true,
    autoCheck: null,
    answerInput: "text",
    storedAnswers: "none",
    requiresOpenAnswer: false,
    requiresWordTemplate: false,
    requiresMedia: false,
    displayAnswers: "hidden",
    defaultTimeLimit: 30,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,          // host giudica al volo (UX nota: ritmo serrato)
      fiftyFifty: false,
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: true,          // unica modalità che ammette Jeopardy
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
  WORD_COMPLETION: {
    type: "WORD_COMPLETION",
    label: "Componi la parola",
    icon: "🔡",
    description: "Lettere mancanti da completare",
    requiresJudging: false,
    autoCheck: "answerText",
    answerInput: "word",
    storedAnswers: "multiple",
    requiresOpenAnswer: false,
    requiresWordTemplate: true,
    requiresMedia: false,
    displayAnswers: "hidden",
    defaultTimeLimit: 20,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,
      fiftyFifty: false,
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: false,
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
  IMAGE_GUESS: {
    type: "IMAGE_GUESS",
    label: "Indovina il luogo",
    icon: "🗺️",
    description: "Guarda l'immagine e rispondi",
    requiresJudging: true,
    autoCheck: null,
    answerInput: "text",
    storedAnswers: "none",
    requiresOpenAnswer: false,
    requiresWordTemplate: false,
    requiresMedia: true,
    displayAnswers: "hidden",
    defaultTimeLimit: 30,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,
      fiftyFifty: false,
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: false,
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
  GHIGLIOTTINA: {
    type: "GHIGLIOTTINA",
    label: "Ghigliottina",
    icon: "🎯",
    description: "Indovina la parola che lega gli indizi. Vincitore: +1000 punti (default).",
    requiresJudging: true,
    autoCheck: null,
    answerInput: "text",
    storedAnswers: "none",
    requiresOpenAnswer: true,
    requiresWordTemplate: false,
    requiresMedia: false,
    displayAnswers: "hidden",
    defaultTimeLimit: 60,
    defaultPointsExact: 0,         // la Ghigliottina non usa il punteggio per-domanda
    defaultPointsWrong: 0,
    defaultWinnerBonus: 1000,      // bonus al vincitore (configurabile dall'host)
    compat: {
      speedrun: false,             // formato pacato, niente speedrun
      fiftyFifty: false,
      skip: false,
      lives: false,
      lastManStanding: false,
      categoryPick: false,
      jeopardy: false,
      turnBased: true,             // tipicamente uno alla volta
      freeForAll: true,            // ma si può anche giocare tutti insieme con scommessa
      localPartyMode: true,
    },
  },
  REACTION_CHAIN: {
    type: "REACTION_CHAIN",
    label: "Reazione a catena",
    icon: "⛓️",
    description: "3 indizi progressivi, più veloce = più punti",
    requiresJudging: false,
    autoCheck: "openAnswer",
    answerInput: "text",
    storedAnswers: "clues3",
    requiresOpenAnswer: true,
    requiresWordTemplate: false,
    requiresMedia: false,
    displayAnswers: "ordered",
    defaultTimeLimit: 30,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,
      fiftyFifty: false,
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: false,
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
  CLUE_REVEAL: {
    type: "CLUE_REVEAL",
    label: "Indizio svelato",
    icon: "💡",
    description: "Immagine sfocata che si schiarisce col tempo",
    requiresJudging: false,
    autoCheck: "openAnswer",
    answerInput: "text",
    storedAnswers: "none",
    requiresOpenAnswer: true,
    requiresWordTemplate: false,
    requiresMedia: true,
    displayAnswers: "hidden",
    defaultTimeLimit: 30,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,
      fiftyFifty: false,
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: false,
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
  ONLY_CONNECT: {
    type: "ONLY_CONNECT",
    label: "Only Connect",
    icon: "🔗",
    description: "4 elementi, trova il collegamento",
    requiresJudging: true,
    autoCheck: null,
    answerInput: "text",
    storedAnswers: "items4",
    requiresOpenAnswer: true,
    requiresWordTemplate: false,
    requiresMedia: false,
    displayAnswers: "ordered",
    defaultTimeLimit: 45,
    defaultPointsExact: DEFAULT_POINTS_EXACT,
    defaultPointsWrong: DEFAULT_POINTS_WRONG,
    defaultWinnerBonus: null,
    compat: {
      speedrun: true,
      fiftyFifty: false,
      skip: true,
      lives: true,
      lastManStanding: true,
      categoryPick: true,
      jeopardy: false,
      turnBased: true,
      freeForAll: true,
      localPartyMode: true,
    },
  },
};

// Elenco ordinato utile per le UI (dropdown, cards di scelta).
export const QUESTION_TYPE_LIST: QuestionTypeMeta[] =
  QUESTION_TYPES.map((t) => QUESTION_TYPE_META[t]);

export function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === "string" && (QUESTION_TYPES as readonly string[]).includes(value);
}

export function getTypeMeta(type: QuestionType): QuestionTypeMeta {
  return QUESTION_TYPE_META[type];
}

export function getTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_META[type].label;
}

export function isAutoChecked(type: QuestionType): boolean {
  return !QUESTION_TYPE_META[type].requiresJudging;
}

export function requiresJudging(type: QuestionType): boolean {
  return QUESTION_TYPE_META[type].requiresJudging;
}

// Numero esatto di Answer[] richiesto per un tipo. null = non applicabile.
export function expectedAnswersCount(type: QuestionType): { min: number; max: number } | null {
  switch (QUESTION_TYPE_META[type].storedAnswers) {
    case "multiple":
      return type === "MULTIPLE_CHOICE" ? { min: 4, max: 4 } : { min: 1, max: 10 };
    case "clues3":
      return { min: 3, max: 3 };
    case "items4":
      return { min: 4, max: 4 };
    case "none":
      return null;
  }
}

// Helper di interrogazione della capability matrix.
// Usali in UI (per mostrare/nascondere opzioni) e in validazione server (per rifiutare config invalide).

export type GameOptionKey = keyof QuestionTypeCompat;

export function supports(type: QuestionType, option: GameOptionKey): boolean {
  return QUESTION_TYPE_META[type].compat[option];
}

// Una config (set di opzioni) è valida per un tipo se tutte le opzioni attive sono supportate.
// `activeOptions` è la lista delle opzioni globali abilitate dall'host (quelle false non vengono valutate).
export function validateConfig(
  type: QuestionType,
  activeOptions: Partial<Record<GameOptionKey, boolean>>
): { ok: true } | { ok: false; incompatible: GameOptionKey[] } {
  const compat = QUESTION_TYPE_META[type].compat;
  const incompatible: GameOptionKey[] = [];
  for (const [key, active] of Object.entries(activeOptions) as [GameOptionKey, boolean][]) {
    if (active && !compat[key]) incompatible.push(key);
  }
  return incompatible.length === 0 ? { ok: true } : { ok: false, incompatible };
}

// Per un torneo multi-round: l'opzione globale è ammessa solo se TUTTI i tipi dei round la supportano.
// Esempio: speedrun globale + un round Ghigliottina → speedrun va bloccato.
export function commonCompat(types: QuestionType[]): QuestionTypeCompat {
  const result: QuestionTypeCompat = {
    speedrun: true, fiftyFifty: true, skip: true, lives: true, lastManStanding: true,
    categoryPick: true, jeopardy: true, turnBased: true, freeForAll: true, localPartyMode: true,
  };
  for (const t of types) {
    const c = QUESTION_TYPE_META[t].compat;
    (Object.keys(result) as GameOptionKey[]).forEach((k) => {
      result[k] = result[k] && c[k];
    });
  }
  return result;
}

// Tipi di domanda compatibili con un'opzione data — utile per popolare dropdown filtrati.
export function typesSupporting(option: GameOptionKey): QuestionType[] {
  return QUESTION_TYPES.filter((t) => QUESTION_TYPE_META[t].compat[option]);
}

// Default punti per la creazione di una nuova Question (usato dall'admin form).
export function defaultPointsForType(type: QuestionType): number {
  return QUESTION_TYPE_META[type].defaultPointsExact;
}

// Bonus al vincitore per Ghigliottina (null = non applicabile).
export function winnerBonusForType(type: QuestionType): number | null {
  return QUESTION_TYPE_META[type].defaultWinnerBonus;
}
