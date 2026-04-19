// Tipi condivisi tra client e server per Socket.io

export type QuestionType = "MULTIPLE_CHOICE" | "OPEN_ANSWER" | "WORD_COMPLETION" | "IMAGE_GUESS";

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

  // Solo host: richiesta giudizio risposte aperte
  "game:judge-answers": (data: JudgeAnswersData) => void;

  // Eventi di errore
  error: (data: { message: string }) => void;
  "player:joined": (data: { player: PlayerInfo }) => void;
  "player:left": (data: { playerId: string }) => void;
}

export interface ClientToServerEvents {
  // Host
  "host:create": (
    data: { hostName: string; difficulty: string; totalQuestions: number; questionType: QuestionType },
    callback: (response: { code: string; gameId: string } | { error: string }) => void
  ) => void;
  "host:join": (
    data: { gameId: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;
  "host:start": (data: { gameId: string }) => void;
  "host:next": (data: { gameId: string }) => void;

  // Host giudica le risposte aperte
  "host:judge": (data: {
    gameId: string;
    judgments: { playerId: string; isCorrect: boolean }[];
  }) => void;

  // Player
  "player:join": (
    data: { code: string; nickname: string; emoji?: string; avatarUrl?: string },
    callback: (response: { playerId: string; gameId: string } | { error: string }) => void
  ) => void;
  "player:answer": (data: {
    playerId: string;
    gameId: string;
    answerId?: string;      // per MULTIPLE_CHOICE
    answerText?: string;    // per OPEN_ANSWER, WORD_COMPLETION, IMAGE_GUESS
    timeTaken: number;
  }) => void;
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  score: number;
  emoji?: string | null;
  avatarUrl?: string | null;
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
