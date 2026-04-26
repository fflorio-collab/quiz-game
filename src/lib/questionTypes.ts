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
}

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
  },
  GHIGLIOTTINA: {
    type: "GHIGLIOTTINA",
    label: "Ghigliottina",
    icon: "🎯",
    description: "Sfida gli ultimi in classifica",
    requiresJudging: true,
    autoCheck: null,
    answerInput: "text",
    storedAnswers: "none",
    requiresOpenAnswer: true,
    requiresWordTemplate: false,
    requiresMedia: false,
    displayAnswers: "hidden",
    defaultTimeLimit: 60,
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
