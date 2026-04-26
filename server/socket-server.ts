/**
 * Socket.io server per il quiz multiplayer real-time.
 * Gestisce la creazione partite, join dei player, flusso domande, timer,
 * ricezione risposte e calcolo classifica.
 * I tipi di domanda e il loro comportamento sono definiti in src/lib/questionTypes.ts.
 */
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { jwtVerify } from "jose";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  QuestionType,
  QuestionData,
  RevealData,
  JudgeAnswersData,
  GameStateSnapshot,
  JeopardyGridData,
  DuelState,
  LocalRoundState,
  CategoryGridData,
} from "../src/types/socket.js";
import { generateGameCode, calculatePoints, shuffle, streakMultiplier } from "../src/lib/utils.js";
import { QUESTION_TYPE_META, getTypeLabel } from "../src/lib/questionTypes.js";
import { describeGameMode } from "../src/lib/gameMode.js";
import { xpForGame, levelFromXp } from "../src/lib/gamification/xp.js";
import { evaluateBadgeUnlocks } from "../src/lib/gamification/badges.js";

config();

const prisma = new PrismaClient();
const httpServer = createServer();

const allowedOrigin = process.env.ALLOWED_ORIGIN;
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigin ? allowedOrigin.split(",") : "*",
    methods: ["GET", "POST"],
  },
});

// Middleware socket: se il client manda `auth.token`, decodifichiamo il JWT NextAuth
// e popoliamo `socket.data.userId` così i join/creazione partita possono associarlo al Player.
io.use(async (socket, next) => {
  try {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (!token) return next();
    const secret = process.env.AUTH_SECRET;
    if (!secret) return next();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const sub = payload.sub;
    if (typeof sub === "string") socket.data.userId = sub;
  } catch {
    // token invalido/scaduto: continua come ospite
  }
  next();
});

const activeTimers = new Map<string, NodeJS.Timeout>();
const revealInProgress = new Set<string>();
// Partite in attesa di giudizio host (OPEN_ANSWER / IMAGE_GUESS)
const pendingJudgment = new Map<string, { gameQuestionId: string; questionId: string }>();
// Speedrun: timer globale della partita
const speedrunState = new Map<string, { endTimeout: NodeJS.Timeout; tickInterval: NodeJS.Timeout; startedAt: number; durationSec: number }>();
// Modalità presentatore: giocatore di turno per-partita (highlight "tocca a te")
const localTurnByGame = new Map<string, string | null>();
// "Scegli categoria": griglia corrente memorizzata per rejoin
const currentCategoryGridByGame = new Map<string, CategoryGridData>();

function startSpeedrunTimers(gameId: string, durationSec: number) {
  clearSpeedrunTimers(gameId);
  const startedAt = Date.now();
  const endTimeout = setTimeout(() => {
    finishGame(gameId).catch((e) => console.error("speedrun finishGame error", e));
  }, durationSec * 1000);
  const tickInterval = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(0, Math.ceil(durationSec - elapsed));
    io.to(`game:${gameId}`).emit("game:speedrun-timer", { remaining });
    if (remaining <= 0) clearInterval(tickInterval);
  }, 1000);
  speedrunState.set(gameId, { endTimeout, tickInterval, startedAt, durationSec });
}

function clearSpeedrunTimers(gameId: string) {
  const s = speedrunState.get(gameId);
  if (s) {
    clearTimeout(s.endTimeout);
    clearInterval(s.tickInterval);
    speedrunState.delete(gameId);
  }
}

// 100 Secondi: stato duello in-memory per gameId
type DuelMask = {
  chars: string[];       // lettere originali (uppercase)
  revealed: Set<number>; // indici già svelati
  blockedIdx: number;    // l'indice che resta SEMPRE nascosto (ultima vocale o ultima lettera)
  lastRevealAt: number;  // ms: quando è stata rivelata l'ultima lettera
};
type DuelRuntime = {
  state: DuelState;
  correctAnswer: string;
  pool: { text: string; answer: string }[]; // domande future (shuffled)
  tickInterval?: NodeJS.Timeout;
  lastTickAt: number;                 // per accumulo tempo timer
  mask: DuelMask | null;
  gameId: string;
};
const duelByGame = new Map<string, DuelRuntime>();

const REVEAL_INTERVAL_MS = 3000;
const VOWELS = /[AEIOUÀÈÉÌÒÙ]/;

function buildMask(word: string): DuelMask {
  const chars = word.toUpperCase().split("");
  // Scegli l'indice "bloccato" (mai rivelato): ultima vocale; fallback ultima lettera.
  let blockedIdx = -1;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (VOWELS.test(chars[i])) { blockedIdx = i; break; }
  }
  if (blockedIdx === -1) blockedIdx = chars.length - 1;
  const revealed = new Set<number>();
  // Rivela subito la prima lettera (se non è quella bloccata), altrimenti l'ultima.
  if (chars.length > 0 && 0 !== blockedIdx) revealed.add(0);
  else if (chars.length > 1) revealed.add(chars.length - 1);
  return { chars, revealed, blockedIdx, lastRevealAt: Date.now() };
}

function revealOneMore(mask: DuelMask): boolean {
  const hidden: number[] = [];
  for (let i = 0; i < mask.chars.length; i++) {
    if (i === mask.blockedIdx) continue;
    if (mask.revealed.has(i)) continue;
    // Ignora spazi e caratteri non alfabetici: li "riveliamo" d'ufficio
    if (!/[A-ZÀÈÉÌÒÙ]/.test(mask.chars[i])) { mask.revealed.add(i); continue; }
    hidden.push(i);
  }
  if (hidden.length === 0) return false;
  const pick = hidden[Math.floor(Math.random() * hidden.length)];
  mask.revealed.add(pick);
  return true;
}

function renderMask(mask: DuelMask): string {
  return mask.chars.map((c, i) => {
    if (!/[A-ZÀÈÉÌÒÙ]/.test(c)) return c;         // spazi / apostrofi: sempre visibili
    return mask.revealed.has(i) ? c : "_";
  }).join(" ");
}

function applyElapsed(r: DuelRuntime) {
  if (r.state.finished) return;
  const now = Date.now();
  const elapsed = now - r.lastTickAt;
  r.lastTickAt = now;
  if (r.state.paused) return;
  const active = r.state.activePlayerId === r.state.playerA.id ? r.state.playerA : r.state.playerB;
  active.timeLeftMs = Math.max(0, active.timeLeftMs - elapsed);
  if (active.timeLeftMs <= 0) {
    endDuel(r, active.id);
  }
}

function maybeRevealLetter(r: DuelRuntime) {
  if (r.state.paused || !r.mask || !r.state.question) return;
  if (Date.now() - r.mask.lastRevealAt < REVEAL_INTERVAL_MS) return;
  const changed = revealOneMore(r.mask);
  r.mask.lastRevealAt = Date.now();
  if (changed) r.state.question.masked = renderMask(r.mask);
}

function endDuel(r: DuelRuntime, loserId: string) {
  if (r.state.finished) return;
  r.state.finished = true;
  if (r.tickInterval) {
    clearInterval(r.tickInterval);
    r.tickInterval = undefined;
  }
  const winner = r.state.playerA.id === loserId ? r.state.playerB : r.state.playerA;
  const loser = r.state.playerA.id === loserId ? r.state.playerA : r.state.playerB;
  io.to(`game:${r.gameId}`).emit("duel:state", r.state);
  io.to(`game:${r.gameId}`).emit("duel:ended", {
    winnerId: winner.id,
    loserId: loser.id,
    winnerNickname: winner.nickname,
    loserNickname: loser.nickname,
  });
}

function loadNextDuelQuestion(r: DuelRuntime) {
  const q = r.pool.shift();
  if (!q) {
    r.state.question = null;
    r.correctAnswer = "";
    r.mask = null;
    return;
  }
  r.correctAnswer = q.answer;
  r.mask = buildMask(q.answer);
  r.state.question = {
    text: q.text,
    masked: renderMask(r.mask),
    length: q.answer.length,
  };
  // Invia la soluzione solo all'host, così può giudicare
  io.to(`host:${r.gameId}`).emit("duel:host-info", { correctAnswer: r.correctAnswer });
}

function switchDuelTurn(r: DuelRuntime) {
  r.state.activePlayerId =
    r.state.activePlayerId === r.state.playerA.id ? r.state.playerB.id : r.state.playerA.id;
  r.state.turnSeq += 1;
  r.lastTickAt = Date.now();
}

// Snapshot dello stato corrente per permettere il rejoin mid-game.
// Aggiornati dagli handler di sendNextQuestion / revealAnswer / judging.
const currentQuestionByGame = new Map<string, QuestionData & { startedAt: number }>();
const currentRevealByGame   = new Map<string, RevealData>();
const currentJudgingByGame  = new Map<string, JudgeAnswersData>();

// Calcola il time limit effettivo per la domanda correntemente attiva.
// Ordine di priorità: Speedrun (forza 10s) > (torneo) timeLimit del round > timeLimitOverride > timeLimit della domanda.
function resolveTimeLimit(
  game: { tournamentModes: string | null; tournamentTimeLimits: string | null; timeLimitOverride: number | null; speedrunDuration?: number | null; totalQuestions: number; currentIndex: number },
  questionDefaultTimeLimit: number
): number {
  // Speedrun: ogni domanda è rapida (10s max), così le risposte possono rincorrersi dentro il timer globale
  if (game.speedrunDuration && game.speedrunDuration > 0) return 10;

  if (game.tournamentModes && game.tournamentTimeLimits) {
    const modes = game.tournamentModes.split(",");
    const limits = game.tournamentTimeLimits.split(",").map((n) => Number(n));
    if (modes.length > 0 && limits.length === modes.length) {
      const perRound = Math.max(1, Math.floor(game.totalQuestions / modes.length));
      const roundIdx = Math.min(modes.length - 1, Math.floor(game.currentIndex / perRound));
      const tl = limits[roundIdx];
      if (Number.isFinite(tl)) return tl;
    }
  }
  if (game.timeLimitOverride !== null && game.timeLimitOverride !== undefined) return game.timeLimitOverride;
  return questionDefaultTimeLimit;
}

// Calcola i punti base per la domanda corrente. Priorità:
// 1. pointsOverrides per-round (torneo) o singola (lunghezza 1) — se presente e > 0
// 2. questionDefault (Question.points)
function resolveBasePoints(
  game: { pointsOverrides: string | null; tournamentModes: string | null; totalQuestions: number; currentIndex: number },
  questionDefault: number
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

// Le label per modalità arrivano da getTypeLabel() (src/lib/questionTypes).

// Costruisce lo snapshot completo dello stato della partita per il rejoin.
// `playerId` opzionale: se presente, aggiunge `alreadyAnswered` per quel player.
async function buildGameStateSnapshot(
  gameId: string,
  playerId?: string,
  options: { forHost?: boolean } = {}
): Promise<GameStateSnapshot | null> {
  const forHost = !!options.forHost;
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { score: "desc" } } },
  });
  if (!game) return null;

  const players: PlayerInfo[] = game.players.map((p) => ({
    id: p.id, nickname: p.nickname, score: p.score,
    emoji: p.emoji, avatarUrl: p.avatarUrl,
    eliminated: p.eliminated,
    wrongCount: p.wrongCount,
    fiftyFiftyUsed: p.fiftyFiftyUsed,
    skipUsed: p.skipUsed,
    streak: p.streak,
    bestStreak: p.bestStreak,
    pendingWager: p.pendingWager,
  }));

  const snapshot: GameStateSnapshot = {
    gameStatus: game.status as "LOBBY" | "PLAYING" | "FINISHED",
    code: game.code,
    players,
    fiftyFiftyCount: game.fiftyFiftyCount,
    skipCount: game.skipCount,
    localPartyMode: game.localPartyMode,
    categoryPickMode: game.categoryPickMode,
  };

  // 100 Secondi: se c'è un duello attivo, includi lo stato
  const duel = duelByGame.get(gameId);
  if (duel && !duel.state.finished) {
    applyElapsed(duel);
    snapshot.duel = duel.state;
  }

  if (game.status === "FINISHED") {
    snapshot.finalRanking = players;
    return snapshot;
  }

  if (game.status !== "PLAYING") return snapshot;

  // Speedrun: quanto tempo globale resta
  const sr = speedrunState.get(gameId);
  if (sr) {
    const elapsed = (Date.now() - sr.startedAt) / 1000;
    snapshot.speedrunRemaining = Math.max(0, Math.ceil(sr.durationSec - elapsed));
  }
  // Caduta libera: esponi le vite previste per la UI
  if (game.livesAllowed) snapshot.livesAllowed = game.livesAllowed;

  // Jeopardy: se siamo in attesa di scelta cella (nessuna domanda attiva e nessun reveal), includi la griglia
  if (game.jeopardyMode
      && !currentQuestionByGame.get(gameId)
      && !currentRevealByGame.get(gameId)
      && !currentJudgingByGame.get(gameId)) {
    const grid = await buildJeopardyGrid(gameId);
    if (grid) snapshot.jeopardyGrid = grid;
  }
  // Scegli categoria: analogamente, se in attesa di scelta categoria, includi la griglia
  if (game.categoryPickMode
      && !currentQuestionByGame.get(gameId)
      && !currentRevealByGame.get(gameId)
      && !currentJudgingByGame.get(gameId)) {
    const grid = await buildCategoryGrid(gameId);
    if (grid) snapshot.categoryGrid = grid;
  }

  // Judging in corso (OPEN_ANSWER / IMAGE_GUESS in attesa dell'host)
  const judging = currentJudgingByGame.get(gameId);
  if (judging) {
    snapshot.judging = judging;
    return snapshot;
  }

  // Reveal in corso
  const reveal = currentRevealByGame.get(gameId);
  if (reveal) {
    snapshot.isRevealing = true;
    snapshot.reveal = reveal;
    return snapshot;
  }

  // Domanda attiva
  const current = currentQuestionByGame.get(gameId);
  if (current) {
    // Se senza limite (timeLimit=0), il remaining non ha senso → lo impostiamo a 0
    const elapsed = (Date.now() - current.startedAt) / 1000;
    const remaining = current.timeLimit <= 0 ? 0 : Math.max(0, Math.ceil(current.timeLimit - elapsed));
    snapshot.currentQuestion = {
      questionId: current.questionId,
      gameQuestionId: current.gameQuestionId,
      text: current.text,
      questionType: current.questionType,
      answers: current.answers,
      timeLimit: current.timeLimit,
      questionNumber: current.questionNumber,
      totalQuestions: current.totalQuestions,
      category: current.category,
      imageUrl: current.imageUrl,
      mediaType: current.mediaType,
      wordTemplate: current.wordTemplate,
    };
    snapshot.remainingTime = remaining;

    if (playerId) {
      const existing = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId, gameQuestionId: current.gameQuestionId } },
      });
      snapshot.alreadyAnswered = !!existing;
    }

    // Modalità presentatore: includi stato giudizi (pubblico) e soluzione (solo host)
    if (game.localPartyMode) {
      snapshot.localState = await buildLocalRoundState(gameId, current.gameQuestionId, game.players);
      if (forHost) {
        const q = await prisma.question.findUnique({
          where: { id: current.questionId },
          include: { answers: true },
        });
        if (q) snapshot.correctAnswerText = resolveCorrectAnswerText(q);
      }
    }
  }

  return snapshot;
}

// Jeopardy: costruisce la griglia (celle con categoria + value) dalle gameQuestions.
// Il valore di ogni cella è `Question.points` (configurato da admin; default 1000).
// Fallback: se tutte le domande di una categoria hanno lo stesso valore,
// le celle vengono ordinate per `points` crescente così la griglia appare dalla cella "facile" (valore basso) a quella "difficile" (valore alto).
async function buildJeopardyGrid(gameId: string): Promise<JeopardyGridData | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        orderBy: { order: "asc" },
        include: { question: { include: { category: true } }, playerAnswers: true },
      },
    },
  });
  if (!game || !game.jeopardyMode) return null;

  const byCat = new Map<string, typeof game.gameQuestions>();
  for (const gq of game.gameQuestions) {
    const key = gq.question.categoryId;
    if (!byCat.has(key)) byCat.set(key, [] as typeof game.gameQuestions);
    byCat.get(key)!.push(gq);
  }

  const cells: JeopardyGridData["cells"] = [];
  byCat.forEach((list) => {
    // Ordina per points crescente (cellule basse → valore basso).
    const sorted = [...list].sort((a, b) => a.question.points - b.question.points);
    sorted.forEach((gq) => {
      const cat = gq.question.category;
      cells.push({
        gameQuestionId: gq.id,
        categoryId: gq.question.categoryId,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        value: gq.question.points,
        consumed: !!gq.askedAt,
      });
    });
  });
  return { cells };
}

async function emitJeopardyGrid(gameId: string) {
  const grid = await buildJeopardyGrid(gameId);
  if (!grid) return;
  // Pulisce gli snapshot "active" perché siamo in attesa di scelta
  currentQuestionByGame.delete(gameId);
  currentRevealByGame.delete(gameId);
  currentJudgingByGame.delete(gameId);
  io.to(`game:${gameId}`).emit("game:jeopardy-grid", grid);
}

// Modalità presentatore: calcola il testo della risposta corretta (MC, open, word_completion, ecc.)
function resolveCorrectAnswerText(
  question: { openAnswer: string | null; answers: { text: string; isCorrect: boolean }[] }
): string {
  const correct = question.answers.find((a) => a.isCorrect);
  return correct?.text ?? question.openAnswer ?? "";
}

// Modalità presentatore: costruisce lo stato del round corrente (chi è stato giudicato e come) dal DB
async function buildLocalRoundState(
  gameId: string,
  gameQuestionId: string,
  players: { id: string }[]
): Promise<LocalRoundState> {
  const answers = await prisma.playerAnswer.findMany({ where: { gameQuestionId } });
  const judgments: Record<string, boolean | null> = {};
  for (const p of players) judgments[p.id] = null;
  for (const a of answers) judgments[a.playerId] = a.isCorrect;
  const activePlayerId = localTurnByGame.get(gameId) ?? null;
  return { gameQuestionId, judgments, activePlayerId };
}

async function emitLocalRoundState(gameId: string, gameQuestionId: string) {
  const players = await prisma.player.findMany({ where: { gameId }, select: { id: true } });
  const state = await buildLocalRoundState(gameId, gameQuestionId, players);
  io.to(`game:${gameId}`).emit("game:local-state", state);
}

// "Scegli categoria": costruisce la griglia di categorie con domande rimanenti nella partita.
// Applicabile solo in modalità singola (non torneo): categoryPickMode è disabilitato in torneo.
async function buildCategoryGrid(gameId: string): Promise<CategoryGridData | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { include: { category: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game || !game.categoryPickMode) return null;

  // Mappa categorie presenti nella partita + conteggio rimanenti
  type CatEntry = { cat: { id: string; name: string; icon: string | null; color: string | null }; count: number };
  const allCats = new Map<string, CatEntry>();
  for (const gq of game.gameQuestions) {
    const cat = gq.question.category;
    if (!allCats.has(cat.id)) allCats.set(cat.id, { cat, count: 0 });
    if (!gq.askedAt) allCats.get(cat.id)!.count += 1;
  }

  const categories = Array.from(allCats.values()).map(({ cat, count }) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    remaining: count,
  }));

  return { categories };
}

async function emitCategoryGrid(gameId: string) {
  const grid = await buildCategoryGrid(gameId);
  if (!grid) return;
  currentQuestionByGame.delete(gameId);
  currentRevealByGame.delete(gameId);
  currentJudgingByGame.delete(gameId);
  currentCategoryGridByGame.set(gameId, grid);
  io.to(`game:${gameId}`).emit("game:category-grid", grid);
}

async function broadcastLobby(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!game) return;
  const players: PlayerInfo[] = game.players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: p.score,
    emoji: p.emoji,
    avatarUrl: p.avatarUrl,
    eliminated: p.eliminated,
    wrongCount: p.wrongCount,
    fiftyFiftyUsed: p.fiftyFiftyUsed,
    skipUsed: p.skipUsed,
    streak: p.streak,
    bestStreak: p.bestStreak,
    pendingWager: p.pendingWager,
  }));
  io.to(`game:${gameId}`).emit("lobby:updated", { players, hostConnected: true });
}

async function sendNextQuestion(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: {
          question: { include: { answers: true, category: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game) return;

  const gq = game.gameQuestions[game.currentIndex];
  if (!gq) {
    await finishGame(gameId);
    return;
  }

  // "Ultimo in piedi": se è rimasto un solo (o zero) giocatore attivo, fine partita
  if (game.lastManStanding) {
    const activeCount = await prisma.player.count({ where: { gameId, eliminated: false } });
    if (activeCount <= 1) {
      await finishGame(gameId);
      return;
    }
  }

  await prisma.gameQuestion.update({ where: { id: gq.id }, data: { askedAt: new Date() } });

  const q = gq.question;
  // Come mostrare le Answer[] al player è deciso dal metadata del tipo:
  // "shuffled" (MC) | "ordered" (REACTION_CHAIN, ONLY_CONNECT) | "hidden" (tutti gli altri).
  const displayMode = QUESTION_TYPE_META[q.type as QuestionType].displayAnswers;
  const shuffledAnswers =
    displayMode === "shuffled" ? shuffle(q.answers)
    : displayMode === "ordered" ? [...q.answers].sort((a, b) => a.order - b.order)
    : [];

  // Risolve il tempo effettivo tenendo conto di: torneo per-round > override globale > default domanda.
  // 0 = "senza limite" (server non avvia timer, host termina manualmente).
  const effectiveTimeLimit = resolveTimeLimit(game, q.timeLimit);

  const questionData = {
    questionId: q.id,
    gameQuestionId: gq.id,
    text: q.text,
    questionType: q.type as QuestionType,
    answers: shuffledAnswers.map((a) => ({ id: a.id, text: a.text })),
    timeLimit: effectiveTimeLimit,
    questionNumber: game.currentIndex + 1,
    totalQuestions: game.totalQuestions,
    category: q.category
      ? { name: q.category.name, icon: q.category.icon, color: q.category.color }
      : undefined,
    imageUrl: q.imageUrl ?? null,
    mediaType: q.mediaType ?? null,
    wordTemplate: q.wordTemplate ?? null,
  };

  // Pulisci snapshot precedenti (reveal/judging) e memorizza la nuova domanda attiva
  currentRevealByGame.delete(gameId);
  currentJudgingByGame.delete(gameId);
  currentQuestionByGame.set(gameId, { ...questionData, startedAt: Date.now() });

  io.to(`game:${gameId}`).emit("game:question", questionData);

  // Modalità presentatore: niente timer, host gestisce manualmente. Invia la soluzione
  // (solo all'host) e il round state iniziale a tutti nella room.
  if (game.localPartyMode) {
    // Inizializza il turno al primo giocatore non eliminato (l'host potrà cambiarlo)
    const firstActive = await prisma.player.findFirst({
      where: { gameId, eliminated: false },
      orderBy: { joinedAt: "asc" },
    });
    localTurnByGame.set(gameId, firstActive?.id ?? null);
    io.to(`host:${gameId}`).emit("game:local-host-info", {
      correctAnswerText: resolveCorrectAnswerText(q),
    });
    await emitLocalRoundState(gameId, gq.id);
    return;
  }

  // Se timeLimit <= 0 (senza limite) non avviare il timer: aspettiamo host:endQuestion o che
  // tutti i player rispondano.
  if (effectiveTimeLimit <= 0) return;

  let remaining = effectiveTimeLimit;
  const timer = setInterval(async () => {
    remaining--;
    io.to(`game:${gameId}`).emit("game:timer", { remaining });
    if (remaining <= 0) {
      clearInterval(timer);
      activeTimers.delete(gameId);
      await handleQuestionEnd(gameId, gq.id, q.id, q.type as QuestionType);
    }
  }, 1000);

  activeTimers.set(gameId, timer);
}

async function handleQuestionEnd(
  gameId: string,
  gameQuestionId: string,
  questionId: string,
  questionType: QuestionType
) {
  if (QUESTION_TYPE_META[questionType].requiresJudging) {
    await sendAnswersForJudgment(gameId, gameQuestionId, questionId);
  } else {
    await revealAnswer(gameId, gameQuestionId, questionId, questionType);
  }
}

async function sendAnswersForJudgment(
  gameId: string,
  gameQuestionId: string,
  questionId: string
) {
  if (revealInProgress.has(gameId)) return;
  revealInProgress.add(gameId);

  try {
    const existingTimer = activeTimers.get(gameId);
    if (existingTimer) {
      clearInterval(existingTimer);
      activeTimers.delete(gameId);
    }

    const playerAnswers = await prisma.playerAnswer.findMany({
      where: { gameQuestionId },
      include: { player: true },
    });

    pendingJudgment.set(gameId, { gameQuestionId, questionId });

    const answers = playerAnswers.map((pa) => ({
      playerId: pa.playerId,
      nickname: pa.player.nickname,
      answerText: pa.answerText ?? "(nessuna risposta)",
    }));

    const judgingData: JudgeAnswersData = { gameQuestionId, questionId, answers };
    currentQuestionByGame.delete(gameId);
    currentJudgingByGame.set(gameId, judgingData);

    io.to(`game:${gameId}`).emit("game:judge-answers", judgingData);
  } finally {
    revealInProgress.delete(gameId);
  }
}

async function revealAnswer(
  gameId: string,
  gameQuestionId: string,
  questionId: string,
  questionType: QuestionType
) {
  if (revealInProgress.has(gameId)) return;
  revealInProgress.add(gameId);

  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearInterval(existingTimer);
    activeTimers.delete(gameId);
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { answers: true },
  });
  try {
    if (!question) return;

    const correctAnswer = question.answers.find((a) => a.isCorrect);
    const correctAnswerText = correctAnswer?.text ?? question.openAnswer ?? "";

    const playerAnswers = await prisma.playerAnswer.findMany({
      where: { gameQuestionId },
      include: { player: true },
    });

    const playerResults = playerAnswers.map((pa) => ({
      playerId: pa.playerId,
      nickname: pa.player.nickname,
      wasCorrect: pa.isCorrect,
      pointsEarned: pa.pointsEarned,
      totalScore: pa.player.score,
      answerText: pa.answerText ?? undefined,
    }));

    // Calcola se la prossima domanda apre un nuovo round di un torneo
    const gameForRound = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        gameQuestions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
      },
    });
    let nextRound: { modeType: QuestionType; modeLabel: string; roundNumber: number; totalRounds: number } | undefined;
    if (gameForRound?.tournamentModes) {
      const modes = gameForRound.tournamentModes.split(",") as QuestionType[];
      const nextIdx = gameForRound.currentIndex + 1; // dopo increment
      const next = gameForRound.gameQuestions[nextIdx];
      const currentModeType = questionType;
      if (next && next.question.type !== currentModeType) {
        const nextModeType = next.question.type as QuestionType;
        const roundNumber = modes.indexOf(nextModeType) + 1;
        nextRound = {
          modeType: nextModeType,
          modeLabel: getTypeLabel(nextModeType),
          roundNumber,
          totalRounds: modes.length,
        };
      }
    }

    const revealData: RevealData = {
      questionType,
      correctAnswerId: correctAnswer?.id,
      correctAnswerText,
      playerResults,
      nextRound,
    };

    // Salva snapshot per eventuali rejoin durante la fase reveal
    currentQuestionByGame.delete(gameId);
    currentJudgingByGame.delete(gameId);
    currentRevealByGame.set(gameId, revealData);

    io.to(`game:${gameId}`).emit("game:reveal", revealData);

    await prisma.game.update({
      where: { id: gameId },
      data: { currentIndex: { increment: 1 } },
    });

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: { orderBy: { score: "desc" } } },
    });
    if (game) {
      io.to(`game:${gameId}`).emit("game:leaderboard", {
        players: game.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl, eliminated: p.eliminated, wrongCount: p.wrongCount, fiftyFiftyUsed: p.fiftyFiftyUsed, skipUsed: p.skipUsed, streak: p.streak, bestStreak: p.bestStreak, pendingWager: p.pendingWager })),
      });

      // Speedrun: auto-advance dopo 2s di reveal (no "Next" manuale)
      if (game.speedrunDuration && game.status === "PLAYING") {
        setTimeout(() => {
          // Avanza solo se la partita è ancora attiva (il timer globale potrebbe averla finita)
          prisma.game.findUnique({ where: { id: gameId } }).then((g) => {
            if (g?.status === "PLAYING") sendNextQuestion(gameId);
          });
        }, 2000);
      }
    }
  } finally {
    revealInProgress.delete(gameId);
  }
}

async function finishGame(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { score: "desc" }, include: { answers: true } } },
  });
  if (!game) return;

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "FINISHED", finishedAt: new Date() },
  });

  // Label della modalità, salvata insieme al punteggio così la classifica globale
  // può mostrare "come" è stato ottenuto ogni risultato.
  const gameMode = describeGameMode(game);

  // Ranking per podio (top-3 = isPodium, top-1 = isWin)
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  const winnerId = sortedPlayers[0]?.id;
  const podiumIds = new Set(sortedPlayers.slice(0, 3).map((p) => p.id));
  const nowHour = new Date().getHours();

  for (const player of game.players) {
    const correctCount = player.answers.filter((a) => a.isCorrect).length;
    await prisma.leaderboard.create({
      data: {
        nickname: player.nickname,
        score: player.score,
        difficulty: game.difficulty,
        totalQuestions: game.totalQuestions,
        correctAnswers: correctCount,
        bestStreak: player.bestStreak,
        wrongCount: player.wrongCount,
        fiftyFiftyUsed: player.fiftyFiftyUsed,
        skipUsed: player.skipUsed,
        eliminated: player.eliminated,
        questionType: game.questionType,
        gameMode,
        userId: player.userId ?? null,
      },
    });

    // Se il player è legato a un account → aggiorna stat aggregati + XP + badge
    if (player.userId) {
      const isWin = player.id === winnerId;
      const isPodium = podiumIds.has(player.id);
      const livesRemaining = game.livesAllowed
        ? Math.max(0, game.livesAllowed - player.wrongCount)
        : 0;
      const xpGained = xpForGame({
        correctAnswers: correctCount,
        bestStreak: player.bestStreak,
        isWin,
        isPodium,
        livesRemaining,
        difficulty: game.difficulty,
      });
      const userBefore = await prisma.user.findUnique({ where: { id: player.userId } });
      if (userBefore) {
        const newXp = userBefore.xp + xpGained;
        const newLevel = levelFromXp(newXp);
        const newTotalGames = userBefore.totalGames + 1;
        const newTotalWins = userBefore.totalWins + (isWin ? 1 : 0);
        const newTotalCorrect = userBefore.totalCorrect + correctCount;
        const newBestStreak = Math.max(userBefore.bestStreak, player.bestStreak);
        const updatedUser = await prisma.user.update({
          where: { id: player.userId },
          data: {
            xp: newXp,
            level: newLevel,
            totalGames: newTotalGames,
            totalWins: newTotalWins,
            totalCorrect: newTotalCorrect,
            bestStreak: newBestStreak,
          },
        });
        // Valuta badge sbloccabili
        const existing = await prisma.userBadge.findMany({
          where: { userId: player.userId },
          include: { badge: true },
        });
        const alreadyUnlocked = new Set(existing.map((ub) => ub.badge.slug));
        const newSlugs = evaluateBadgeUnlocks(
          {
            userAfter: {
              id: updatedUser.id,
              totalGames: updatedUser.totalGames,
              totalWins: updatedUser.totalWins,
              totalCorrect: updatedUser.totalCorrect,
              bestStreak: updatedUser.bestStreak,
              dailyStreak: updatedUser.dailyStreak,
            },
            gameResult: {
              correctAnswers: correctCount,
              totalQuestions: game.totalQuestions,
              bestStreak: player.bestStreak,
              isWin,
              fiftyFiftyUsed: player.fiftyFiftyUsed,
              skipUsed: player.skipUsed,
            },
            alreadyUnlocked,
          },
          updatedUser.level,
          nowHour
        );
        if (newSlugs.length > 0) {
          const badgesToAward = await prisma.badge.findMany({ where: { slug: { in: newSlugs } } });
          for (const b of badgesToAward) {
            try {
              await prisma.userBadge.create({ data: { userId: player.userId, badgeId: b.id } });
            } catch {
              // già assegnato
            }
          }
        }
      }
    }
  }

  // Pulisci tutti gli snapshot in memoria per questa partita
  currentQuestionByGame.delete(gameId);
  currentRevealByGame.delete(gameId);
  currentJudgingByGame.delete(gameId);
  currentCategoryGridByGame.delete(gameId);
  localTurnByGame.delete(gameId);
  pendingJudgment.delete(gameId);
  clearSpeedrunTimers(gameId);
  const activeTimer = activeTimers.get(gameId);
  if (activeTimer) { clearInterval(activeTimer); activeTimers.delete(gameId); }

  io.to(`game:${gameId}`).emit("game:finished", {
    players: game.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl, eliminated: p.eliminated, wrongCount: p.wrongCount, streak: p.streak, bestStreak: p.bestStreak })),
  });
}

// === CONNECTION HANDLER ===
io.on("connection", (socket) => {
  console.log(`[socket] client connesso: ${socket.id}`);

  socket.on("host:create", async ({ hostName, difficulty, totalQuestions, questionType, tournamentModes, tournamentTimeLimits, categoryIds, timeLimitOverride, lastManStanding, speedrunDuration, livesAllowed, jeopardyMode, fiftyFiftyCount, skipCount, localPartyMode, pointsOverrides, tournamentCategoryIds, categoryPickMode, manualQuestionIds }, callback) => {
    try {
      let code = generateGameCode();
      let attempts = 0;
      while ((await prisma.game.findUnique({ where: { code } })) && attempts < 10) {
        code = generateGameCode();
        attempts++;
      }

      // Modalità: singola oppure torneo (può contenere duplicati: la stessa modalità più volte)
      const modes: QuestionType[] =
        tournamentModes && tournamentModes.length > 0
          ? tournamentModes
          : [questionType];

      // Filtro difficoltà: "ALL" = nessun filtro
      const difficultyFilter = difficulty === "ALL" ? undefined : difficulty;
      // Filtro categoria globale (fallback se non ce n'è uno per-round)
      const globalCategoryIds = categoryIds && categoryIds.length > 0 ? categoryIds : null;

      // Per ogni ROUND (non modalità unica) carichiamo `totalQuestions` domande diverse.
      // Se la stessa modalità compare due volte, i due round devono avere domande diverse.
      type QuestionWithAnswers = Awaited<ReturnType<typeof prisma.question.findMany>>[number];
      const selectedByMode: { mode: QuestionType; questions: QuestionWithAnswers[] }[] = [];
      const usedQuestionIds = new Set<string>();

      for (let i = 0; i < modes.length; i++) {
        const mode = modes[i];
        const manualIds = manualQuestionIds?.[i] ?? [];

        // Selezione manuale: se l'host ha spuntato esattamente totalQuestions domande, usa quelle
        if (manualIds.length === totalQuestions) {
          const manualPool = await prisma.question.findMany({
            where: { id: { in: manualIds }, type: mode },
            include: { answers: true },
          });
          if (manualPool.length !== totalQuestions) {
            callback({ error: `Selezione manuale round ${i + 1}: alcune domande non trovate o tipo non coerente.` });
            return;
          }
          // Mantieni l'ordine di selezione dell'host (per ordine di inserimento del picker)
          const orderIdx = new Map(manualIds.map((id, idx) => [id, idx]));
          const ordered = manualPool.sort((a, b) => (orderIdx.get(a.id) ?? 0) - (orderIdx.get(b.id) ?? 0));
          ordered.forEach((q) => usedQuestionIds.add(q.id));
          selectedByMode.push({ mode, questions: ordered });
          continue;
        }

        const perRoundCatIds = tournamentCategoryIds?.[i] ?? [];
        const effectiveCatIds = perRoundCatIds.length > 0 ? perRoundCatIds : (globalCategoryIds ?? []);
        const roundCategoryFilter = effectiveCatIds.length > 0 ? { in: effectiveCatIds } : undefined;
        const pool = await prisma.question.findMany({
          where: {
            type: mode,
            ...(difficultyFilter ? { difficulty: difficultyFilter } : {}),
            ...(roundCategoryFilter ? { categoryId: roundCategoryFilter } : {}),
            id: { notIn: Array.from(usedQuestionIds) },
          },
          include: { answers: true },
        });
        if (pool.length < totalQuestions) {
          callback({
            error: `Modalità "${getTypeLabel(mode)}" (round ${i + 1}): solo ${pool.length} domande disponibili su ${totalQuestions} richieste (con i filtri scelti).`,
          });
          return;
        }
        const chosen = shuffle(pool).slice(0, totalQuestions);
        chosen.forEach((q) => usedQuestionIds.add(q.id));
        selectedByMode.push({
          mode,
          questions: chosen,
        });
      }

      // Appiattisci le domande in ordine: round1, round2, ...
      const flat = selectedByMode.flatMap((r) => r.questions);
      const isTournament = modes.length > 1;

      // tournamentTimeLimits: CSV allineato a modes (lunghezza uguale); solo se torneo e fornito
      const timeLimitsCsv = isTournament && tournamentTimeLimits && tournamentTimeLimits.length === modes.length
        ? tournamentTimeLimits.map((n) => String(Math.max(0, Math.floor(Number(n) || 0)))).join(",")
        : null;

      // pointsOverrides: CSV allineato a modes; se non fornito/lunghezza errata, null. 0 = default.
      const pointsOverridesCsv = pointsOverrides && pointsOverrides.length === modes.length
        ? pointsOverrides.map((n) => String(Math.max(0, Math.floor(Number(n) || 0)))).join(",")
        : null;

      // tournamentCategoryIds: pipe-separato "cat1,cat2|cat3|". Empty per-round = "" (usa filtro globale).
      const tournamentCategoryIdsCsv = isTournament && tournamentCategoryIds && tournamentCategoryIds.length === modes.length
        ? tournamentCategoryIds.map((arr) => (arr ?? []).filter(Boolean).join(",")).join("|")
        : null;

      const game = await prisma.game.create({
        data: {
          code,
          hostName,
          difficulty,
          questionType: modes[0],
          tournamentModes: isTournament ? modes.join(",") : null,
          tournamentTimeLimits: timeLimitsCsv,
          timeLimitOverride: timeLimitOverride ?? null,
          lastManStanding: !!lastManStanding,
          speedrunDuration: speedrunDuration && speedrunDuration > 0 ? speedrunDuration : null,
          livesAllowed: livesAllowed && livesAllowed > 0 ? livesAllowed : null,
          jeopardyMode: !!jeopardyMode,
          fiftyFiftyCount: Math.max(0, Math.min(5, Math.floor(Number(fiftyFiftyCount) || 0))),
          skipCount: Math.max(0, Math.min(5, Math.floor(Number(skipCount) || 0))),
          localPartyMode: !!localPartyMode,
          pointsOverrides: pointsOverridesCsv,
          tournamentCategoryIds: tournamentCategoryIdsCsv,
          categoryPickMode: !!categoryPickMode && !jeopardyMode,
          totalQuestions: flat.length,
          gameQuestions: {
            create: flat.map((q, i) => ({ questionId: q.id, order: i })),
          },
        },
      });

      socket.join(`game:${game.id}`);
      socket.join(`host:${game.id}`);
      socket.data.role = "host";
      socket.data.gameId = game.id;

      callback({ code: game.code, gameId: game.id });
      await broadcastLobby(game.id);
    } catch (err) {
      console.error(err);
      callback({ error: "Errore nella creazione della partita" });
    }
  });

  socket.on("host:join", async ({ gameId }, callback) => {
    const snapshot = await buildGameStateSnapshot(gameId, undefined, { forHost: true });
    if (!snapshot) { callback({ success: false, error: "Partita non trovata" }); return; }
    socket.join(`game:${gameId}`);
    socket.join(`host:${gameId}`);
    socket.data.role = "host";
    socket.data.gameId = gameId;
    callback({ success: true, state: snapshot });
    await broadcastLobby(gameId);
    // Se c'è un duello attivo, invia anche la soluzione all'host (per poter giudicare)
    const duelNow = duelByGame.get(gameId);
    if (duelNow && !duelNow.state.finished && duelNow.correctAnswer) {
      socket.emit("duel:host-info", { correctAnswer: duelNow.correctAnswer });
    }
  });

  // Spettatore: entra come osservatore con il codice partita. Riceve gli eventi pubblici
  // (domande, timer, reveal, classifica, fine) ma non la soluzione dell'host (correctAnswerText).
  socket.on("spectator:join", async ({ code }, callback) => {
    try {
      const game = await prisma.game.findUnique({ where: { code: code.toUpperCase() } });
      if (!game) { callback({ success: false, error: "Codice partita non valido" }); return; }
      const snapshot = await buildGameStateSnapshot(game.id);
      if (!snapshot) { callback({ success: false, error: "Partita non trovata" }); return; }
      socket.join(`game:${game.id}`);
      socket.data.role = "spectator";
      socket.data.gameId = game.id;
      callback({ success: true, gameId: game.id, state: snapshot });
    } catch (e) {
      console.error("spectator:join error", e);
      callback({ success: false, error: "Errore interno" });
    }
  });

  // Player rientra in una partita dopo disconnessione/refresh/chiusura tab.
  // Richiede playerId salvato localmente + gameId.
  socket.on("player:rejoin", async ({ gameId, playerId }, callback) => {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.gameId !== gameId) {
      callback({ success: false, error: "Giocatore non trovato in questa partita" });
      return;
    }
    const snapshot = await buildGameStateSnapshot(gameId, playerId);
    if (!snapshot) { callback({ success: false, error: "Partita non trovata" }); return; }

    // Aggiorna socketId per ricezione futura
    await prisma.player.update({ where: { id: playerId }, data: { socketId: socket.id } });

    socket.join(`game:${gameId}`);
    socket.data.role = "player";
    socket.data.playerId = playerId;
    socket.data.gameId = gameId;

    callback({ success: true, state: snapshot });
    await broadcastLobby(gameId);
  });

  socket.on("host:start", async ({ gameId }) => {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
    if (!game || game.players.length === 0) {
      socket.emit("error", { message: "Servono almeno 1 giocatore per iniziare" });
      return;
    }
    await prisma.game.update({
      where: { id: gameId },
      data: { status: "PLAYING", startedAt: new Date(), currentIndex: 0 },
    });
    io.to(`game:${gameId}`).emit("lobby:started");

    // Speedrun: avvia il timer globale
    if (game.speedrunDuration && game.speedrunDuration > 0) {
      startSpeedrunTimers(gameId, game.speedrunDuration);
    }

    // Jeopardy / Scegli categoria: mostra la griglia all'host invece di inviare subito la domanda
    if (game.jeopardyMode) {
      setTimeout(() => emitJeopardyGrid(gameId), 2000);
    } else if (game.categoryPickMode) {
      setTimeout(() => emitCategoryGrid(gameId), 2000);
    } else {
      setTimeout(() => sendNextQuestion(gameId), 2000);
    }
  });

  socket.on("host:next", async ({ gameId }) => {
    const g = await prisma.game.findUnique({ where: { id: gameId } });
    // In modalità Jeopardy / Scegli categoria, "Prossima" torna alla griglia.
    if (g?.jeopardyMode) {
      const remaining = await prisma.gameQuestion.count({ where: { gameId, askedAt: null } });
      if (remaining === 0) { await finishGame(gameId); return; }
      await emitJeopardyGrid(gameId);
      return;
    }
    if (g?.categoryPickMode) {
      const remaining = await prisma.gameQuestion.count({ where: { gameId, askedAt: null } });
      if (remaining === 0) { await finishGame(gameId); return; }
      await emitCategoryGrid(gameId);
      return;
    }
    await sendNextQuestion(gameId);
  });

  // HOST: "Scegli categoria" — sceglie una categoria; il server estrae a sorte una delle domande rimanenti di quella categoria
  socket.on("host:category-pick", async ({ gameId, categoryId }) => {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { gameQuestions: { include: { question: true }, orderBy: { order: "asc" } } },
    });
    if (!game || !game.categoryPickMode) return;
    const candidates = game.gameQuestions.filter((gq) => !gq.askedAt && gq.question.categoryId === categoryId);
    if (candidates.length === 0) {
      socket.emit("error", { message: "Categoria esaurita" });
      return;
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    await prisma.game.update({ where: { id: gameId }, data: { currentIndex: chosen.order } });
    currentCategoryGridByGame.delete(gameId);
    await sendNextQuestion(gameId);
  });

  // HOST: termina prima del previsto (ignora domande rimanenti). Vale per tutte le modalità.
  socket.on("host:finish", async ({ gameId }) => {
    await finishGame(gameId);
  });

  // HOST (modalità presentatore): imposta il giocatore di turno (highlight "tocca a te").
  // playerId = null → nessuno evidenziato.
  socket.on("host:local-set-turn", async ({ gameId, playerId }) => {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || !game.localPartyMode) return;
    if (playerId) {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player || player.gameId !== gameId || player.eliminated) return;
    }
    localTurnByGame.set(gameId, playerId);
    const current = currentQuestionByGame.get(gameId);
    if (current) await emitLocalRoundState(gameId, current.gameQuestionId);
  });

  // HOST: Jeopardy — sceglie quale cella mostrare; il server imposta currentIndex e invia la domanda
  socket.on("host:jeopardy-pick", async ({ gameId, gameQuestionId }) => {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { gameQuestions: { orderBy: { order: "asc" } } },
    });
    if (!game || !game.jeopardyMode) return;
    const idx = game.gameQuestions.findIndex((gq) => gq.id === gameQuestionId);
    if (idx < 0) return;
    if (game.gameQuestions[idx].askedAt) return; // già consumata
    // Posiziona currentIndex sulla cella scelta e fai partire la domanda
    await prisma.game.update({ where: { id: gameId }, data: { currentIndex: idx } });
    await sendNextQuestion(gameId);
  });

  // HOST: termina manualmente la domanda corrente (per modalità "senza limite" o skip anticipato)
  socket.on("host:endQuestion", async ({ gameId }) => {
    const current = currentQuestionByGame.get(gameId);
    if (!current) return;
    // Ferma eventuale timer attivo
    const timer = activeTimers.get(gameId);
    if (timer) { clearInterval(timer); activeTimers.delete(gameId); }
    // In modalità presentatore i giudizi sono già stati dati individualmente via host:local-judge,
    // quindi saltiamo la fase di giudizio e andiamo direttamente al reveal.
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (game?.localPartyMode) {
      await revealAnswer(gameId, current.gameQuestionId, current.questionId, current.questionType);
      return;
    }
    await handleQuestionEnd(gameId, current.gameQuestionId, current.questionId, current.questionType);
  });

  // HOST: giudica le risposte aperte (OPEN_ANSWER / IMAGE_GUESS)
  socket.on("host:judge", async ({ gameId, judgments }) => {
    const pending = pendingJudgment.get(gameId);
    if (!pending) return;
    pendingJudgment.delete(gameId);

    const { gameQuestionId, questionId } = pending;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        gameQuestions: {
          where: { id: gameQuestionId },
          include: { question: true },
        },
      },
    });
    if (!game) return;
    const gq = game.gameQuestions[0];
    if (!gq) return;

    const effTimeLimit = resolveTimeLimit(game, gq.question.timeLimit);

    for (const judgment of judgments) {
      const pa = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId: judgment.playerId, gameQuestionId } },
      });
      if (!pa) continue;

      const timeTaken = pa.timeTaken;
      const pl = await prisma.player.findUnique({ where: { id: judgment.playerId } });
      if (!pl) continue;

      const newStreak = judgment.isCorrect ? pl.streak + 1 : 0;
      const newBestStreak = Math.max(pl.bestStreak, newStreak);

      let points = 0;
      if (pl.pendingWager > 0) {
        // Scommessa attiva: ±wager, niente bonus tempo/streak
        points = judgment.isCorrect ? pl.pendingWager : -pl.pendingWager;
      } else if (judgment.isCorrect) {
        const questionPoints = resolveBasePoints(game, gq.question.points);
        const base = calculatePoints(timeTaken, effTimeLimit * 1000, true, questionPoints, gq.question.difficulty);
        points = Math.round(base * streakMultiplier(newStreak));
      }

      await prisma.playerAnswer.update({
        where: { id: pa.id },
        data: { isCorrect: judgment.isCorrect, pointsEarned: points, judged: true },
      });
      await prisma.player.update({
        where: { id: judgment.playerId },
        data: {
          score: { increment: points },
          streak: newStreak,
          bestStreak: newBestStreak,
          pendingWager: 0,
        },
      });

      // "Ultimo in piedi": elimina chi ha sbagliato
      if (game.lastManStanding && !judgment.isCorrect) {
        await prisma.player.update({
          where: { id: judgment.playerId },
          data: { eliminated: true },
        });
      }
      // "Caduta libera": incrementa errori e eventualmente elimina
      if (game.livesAllowed && !judgment.isCorrect) {
        const pl = await prisma.player.findUnique({ where: { id: judgment.playerId } });
        if (pl) {
          const newWrong = pl.wrongCount + 1;
          await prisma.player.update({
            where: { id: judgment.playerId },
            data: { wrongCount: newWrong, eliminated: newWrong >= game.livesAllowed },
          });
        }
      }
    }

    const questionType = gq.question.type as QuestionType;
    await revealAnswer(gameId, gameQuestionId, questionId, questionType);
  });

  // ========== MODALITÀ PRESENTATORE ==========
  // Host crea un giocatore manualmente (nessun dispositivo / socket)
  socket.on("host:local-add-player", async ({ gameId, nickname, emoji }, callback) => {
    try {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });
      if (!game) { callback({ error: "Partita non trovata" }); return; }
      if (!game.localPartyMode) { callback({ error: "Non in modalità presentatore" }); return; }
      if (game.status !== "LOBBY") { callback({ error: "Puoi aggiungere giocatori solo prima dell'avvio" }); return; }
      const name = nickname.trim();
      if (!name) { callback({ error: "Nickname vuoto" }); return; }
      if (game.players.some((p) => p.nickname.toLowerCase() === name.toLowerCase())) {
        callback({ error: "Nickname già in uso in questa partita" });
        return;
      }
      const player = await prisma.player.create({
        data: { nickname: name, gameId, emoji: emoji ?? null },
      });
      callback({ ok: true, playerId: player.id });
      await broadcastLobby(gameId);
    } catch (e) {
      console.error("host:local-add-player error", e);
      callback({ error: "Errore interno" });
    }
  });

  // Host rimuove un giocatore (prima dell'avvio)
  socket.on("host:local-remove-player", async ({ gameId, playerId }) => {
    try {
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game || !game.localPartyMode || game.status !== "LOBBY") return;
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player || player.gameId !== gameId) return;
      await prisma.player.delete({ where: { id: playerId } });
      await broadcastLobby(gameId);
    } catch (e) {
      console.error("host:local-remove-player error", e);
    }
  });

  // Host giudica la risposta detta a voce da un singolo giocatore sulla domanda corrente.
  // Crea/aggiorna una PlayerAnswer, calcola i punti, e rebroadcasta stato + leaderboard.
  socket.on("host:local-judge", async ({ gameId, playerId, isCorrect }) => {
    try {
      const current = currentQuestionByGame.get(gameId);
      if (!current) return;

      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game || !game.localPartyMode) return;
      if (game.status !== "PLAYING") return;

      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player || player.gameId !== gameId || player.eliminated) return;

      const question = await prisma.question.findUnique({ where: { id: current.questionId } });
      if (!question) return;

      const newStreak = isCorrect ? player.streak + 1 : 0;
      const newBestStreak = Math.max(player.bestStreak, newStreak);

      // Niente bonus tempo in modalità presentatore: host controlla il ritmo.
      // Punti: base domanda (override se presente) × moltiplicatore difficoltà × moltiplicatore streak.
      let points = 0;
      if (isCorrect) {
        const questionPoints = resolveBasePoints(game, question.points);
        const base = calculatePoints(0, 0, true, questionPoints, question.difficulty);
        points = Math.round(base * streakMultiplier(newStreak));
      }

      // Upsert per permettere al host di cambiare idea (rigiudicare): aggiorna se già esiste.
      const existing = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId, gameQuestionId: current.gameQuestionId } },
      });
      if (existing) {
        // Revoca i punti precedenti prima di riapplicare il nuovo giudizio
        await prisma.player.update({
          where: { id: playerId },
          data: { score: { decrement: existing.pointsEarned } },
        });
        await prisma.playerAnswer.update({
          where: { id: existing.id },
          data: { isCorrect, pointsEarned: points, judged: true },
        });
      } else {
        await prisma.playerAnswer.create({
          data: {
            playerId,
            gameQuestionId: current.gameQuestionId,
            timeTaken: 0,
            isCorrect,
            pointsEarned: points,
            judged: true,
          },
        });
      }

      await prisma.player.update({
        where: { id: playerId },
        data: {
          score: { increment: points },
          streak: newStreak,
          bestStreak: newBestStreak,
        },
      });

      // "Ultimo in piedi": elimina chi ha sbagliato
      if (game.lastManStanding && !isCorrect) {
        await prisma.player.update({ where: { id: playerId }, data: { eliminated: true } });
      }
      // "Caduta libera": incrementa errori e eventualmente elimina (solo se risposta nuova)
      if (game.livesAllowed && !isCorrect && !existing) {
        const newWrong = player.wrongCount + 1;
        await prisma.player.update({
          where: { id: playerId },
          data: { wrongCount: newWrong, eliminated: newWrong >= game.livesAllowed },
        });
      }

      // Auto-advance del turno: se il giocatore giudicato era quello di turno, passa al prossimo
      // non giudicato e non eliminato (in ordine di ingresso lobby).
      const currentTurn = localTurnByGame.get(gameId);
      if (currentTurn === playerId) {
        const candidates = await prisma.player.findMany({
          where: { gameId, eliminated: false },
          orderBy: { joinedAt: "asc" },
        });
        const judged = await prisma.playerAnswer.findMany({ where: { gameQuestionId: current.gameQuestionId } });
        const judgedIds = new Set(judged.map((a) => a.playerId));
        const next = candidates.find((p) => !judgedIds.has(p.id));
        localTurnByGame.set(gameId, next?.id ?? null);
      }

      await emitLocalRoundState(gameId, current.gameQuestionId);

      // Aggiorna leaderboard live per l'host
      const players = await prisma.player.findMany({ where: { gameId }, orderBy: { score: "desc" } });
      io.to(`game:${gameId}`).emit("game:leaderboard", {
        players: players.map((p) => ({
          id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl,
          eliminated: p.eliminated, wrongCount: p.wrongCount, fiftyFiftyUsed: p.fiftyFiftyUsed,
          skipUsed: p.skipUsed, streak: p.streak, bestStreak: p.bestStreak, pendingWager: p.pendingWager,
        })),
      });
    } catch (e) {
      console.error("host:local-judge error", e);
    }
  });

  socket.on("player:join", async ({ code, nickname, emoji, avatarUrl }, callback) => {
    const game = await prisma.game.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });
    if (!game) { callback({ error: "Codice partita non valido" }); return; }
    if (game.localPartyMode) {
      callback({ error: "Questa partita è in modalità presentatore. Entra come Spettatore per seguirla." });
      return;
    }
    if (game.status !== "LOBBY") { callback({ error: "La partita è già iniziata" }); return; }
    if (game.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
      callback({ error: "Nickname già in uso in questa partita" });
      return;
    }

    const userId = socket.data.userId ?? null;
    const player = await prisma.player.create({
      data: { nickname, gameId: game.id, socketId: socket.id, emoji: emoji ?? null, avatarUrl: avatarUrl ?? null, userId },
    });

    socket.join(`game:${game.id}`);
    socket.data.role = "player";
    socket.data.playerId = player.id;
    socket.data.gameId = game.id;

    callback({ playerId: player.id, gameId: game.id });
    io.to(`game:${game.id}`).emit("player:joined", {
      player: { id: player.id, nickname: player.nickname, score: 0, emoji: player.emoji, avatarUrl: player.avatarUrl },
    });
    await broadcastLobby(game.id);
  });

  // Scommessa "doppio o niente": il player imposta quanto rischiare per la prossima domanda.
  // amount = 0 annulla la scommessa.
  socket.on("player:wager", async ({ playerId, gameId, amount }, callback) => {
    try {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player || player.gameId !== gameId) { callback({ error: "Giocatore non valido" }); return; }
      const safe = Math.max(0, Math.min(player.score, Math.floor(Number(amount) || 0)));
      await prisma.player.update({ where: { id: playerId }, data: { pendingWager: safe } });
      callback({ ok: true, wager: safe });
    } catch (e) {
      console.error("wager error", e);
      callback({ error: "Errore interno" });
    }
  });

  // Aiuto "50/50": server nasconde 2 risposte sbagliate (lascia la corretta + 1 errata)
  socket.on("player:fifty-fifty", async ({ playerId, gameId, gameQuestionId }, callback) => {
    try {
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player || player.gameId !== gameId) { callback({ error: "Giocatore non valido" }); return; }
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game || game.fiftyFiftyCount <= 0) { callback({ error: "50/50 non abilitato in questa partita" }); return; }
      if (player.fiftyFiftyUsed >= game.fiftyFiftyCount) { callback({ error: "Hai esaurito gli aiuti 50/50" }); return; }

      const gq = await prisma.gameQuestion.findUnique({
        where: { id: gameQuestionId },
        include: { question: { include: { answers: true } } },
      });
      if (!gq || gq.question.type !== "MULTIPLE_CHOICE") {
        callback({ error: "50/50 disponibile solo per risposta multipla" });
        return;
      }

      const wrong = gq.question.answers.filter((a) => !a.isCorrect);
      // Mescola e tieni solo 2 errate da nascondere
      const shuffled = shuffle(wrong);
      const hideIds = shuffled.slice(0, 2).map((a) => a.id);

      await prisma.player.update({ where: { id: playerId }, data: { fiftyFiftyUsed: { increment: 1 } } });
      callback({ hideIds });
    } catch (e) {
      console.error("fifty-fifty error", e);
      callback({ error: "Errore interno" });
    }
  });

  socket.on("player:answer", async ({ playerId, gameId, answerId, answerText, timeTaken, skipped }) => {
    try {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          gameQuestions: {
            include: { question: { include: { answers: true } } },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!game) return;

      // "Ultimo in piedi": i giocatori eliminati non possono rispondere
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player || player.eliminated) return;

      const currentGQ = game.gameQuestions[game.currentIndex];
      if (!currentGQ) return;

      const existing = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId, gameQuestionId: currentGQ.id } },
      });
      if (existing) return;

      const questionType = currentGQ.question.type as QuestionType;
      const effTimeLimit = resolveTimeLimit(game, currentGQ.question.timeLimit);
      let isCorrect = false;
      let points = 0;

      // Aiuto "Salto": registra una risposta non-valutata (0 punti), non conta come errore.
      // Non applica streak, non risolve wager (resta per la prossima domanda).
      if (skipped) {
        if (game.skipCount <= 0) return;
        if (player.skipUsed >= game.skipCount) return;
        await prisma.player.update({ where: { id: playerId }, data: { skipUsed: { increment: 1 } } });
        await prisma.playerAnswer.create({
          data: { playerId, gameQuestionId: currentGQ.id, answerText: "[SKIP]", timeTaken, isCorrect: false, pointsEarned: 0, judged: true },
        });
      } else if (QUESTION_TYPE_META[questionType].autoCheck) {
        // Auto-check: il metodo è definito dal metadata del tipo.
        const method = QUESTION_TYPE_META[questionType].autoCheck;
        if (method === "answerId") {
          const answer = currentGQ.question.answers.find((a) => a.id === answerId);
          isCorrect = answer?.isCorrect ?? false;
        } else if (method === "answerText") {
          const correctAnswer = currentGQ.question.answers.find((a) => a.isCorrect);
          isCorrect = !!correctAnswer && (answerText ?? "").trim().toLowerCase() === correctAnswer.text.trim().toLowerCase();
        } else if (method === "openAnswer") {
          const expected = (currentGQ.question.openAnswer ?? "").trim().toLowerCase();
          isCorrect = expected.length > 0 && (answerText ?? "").trim().toLowerCase() === expected;
        }

        // Streak: +1 se corretta, reset a 0 se sbagliata
        const newStreak = isCorrect ? player.streak + 1 : 0;
        const newBestStreak = Math.max(player.bestStreak, newStreak);

        // Scommessa: se attiva, i punti sono ±wager (niente bonus tempo/streak)
        if (player.pendingWager > 0) {
          points = isCorrect ? player.pendingWager : -player.pendingWager;
        } else {
          const questionPoints = resolveBasePoints(game, currentGQ.question.points);
          const base = calculatePoints(timeTaken, effTimeLimit * 1000, isCorrect, questionPoints, currentGQ.question.difficulty);
          points = isCorrect ? Math.round(base * streakMultiplier(newStreak)) : 0;
        }

        await prisma.playerAnswer.create({
          data: {
            playerId,
            gameQuestionId: currentGQ.id,
            answerId: method === "answerId" ? answerId : null,
            answerText: method === "answerId" ? null : (answerText ?? ""),
            timeTaken, isCorrect, pointsEarned: points, judged: true,
          },
        });
        await prisma.player.update({
          where: { id: playerId },
          data: {
            score: { increment: points },
            streak: newStreak,
            bestStreak: newBestStreak,
            pendingWager: 0,
          },
        });
      } else {
        // Tipi con requiresJudging=true: la risposta viene salvata non-valutata,
        // l'host la giudica dopo (OPEN_ANSWER / IMAGE_GUESS / ONLY_CONNECT / GHIGLIOTTINA).
        await prisma.playerAnswer.create({
          data: { playerId, gameQuestionId: currentGQ.id, answerText: answerText ?? "", timeTaken, isCorrect: false, pointsEarned: 0, judged: false },
        });
      }

      // Aggiornamenti "post-risposta" non applicabili quando è stato usato il Salto
      const isAutoChecked = QUESTION_TYPE_META[questionType].autoCheck !== null;
      if (!skipped) {
        // "Ultimo in piedi": se ha sbagliato e la modalità è attiva → elimina subito (solo auto-check)
        if (game.lastManStanding && !isCorrect && isAutoChecked) {
          await prisma.player.update({ where: { id: playerId }, data: { eliminated: true } });
        }
        // "Caduta libera": conteggio errori; eliminato quando supera livesAllowed
        if (game.livesAllowed && !isCorrect && isAutoChecked) {
          const newWrong = player.wrongCount + 1;
          await prisma.player.update({
            where: { id: playerId },
            data: { wrongCount: newWrong, eliminated: newWrong >= game.livesAllowed },
          });
        }
      }

      io.to(`game:${gameId}`).emit("game:answer-received", { playerId });

      // Anticipa fine round se tutti i NON eliminati hanno risposto
      const activePlayers = await prisma.player.count({ where: { gameId, eliminated: false } });
      const answeredCount = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGQ.id } });
      if (answeredCount >= activePlayers) {
        await handleQuestionEnd(gameId, currentGQ.id, currentGQ.question.id, questionType);
      }
    } catch (err) {
      console.error("Errore nella risposta:", err);
    }
  });

  // ========== 100 SECONDI (duello 1v1) ==========
  socket.on("duel:start", async ({ gameId, playerAId, playerBId, durationSec }, callback) => {
    try {
      if (playerAId === playerBId) { callback({ error: "Seleziona due sfidanti diversi" }); return; }
      const existing = duelByGame.get(gameId);
      if (existing && !existing.state.finished) { callback({ error: "Duello già in corso" }); return; }
      const [pa, pb] = await Promise.all([
        prisma.player.findUnique({ where: { id: playerAId } }),
        prisma.player.findUnique({ where: { id: playerBId } }),
      ]);
      if (!pa || !pb || pa.gameId !== gameId || pb.gameId !== gameId) {
        callback({ error: "Sfidanti non validi" });
        return;
      }

      // Estrai pool domande: preferisci GHIGLIOTTINA (risposta secca), fallback OPEN_ANSWER con openAnswer
      const raw = await prisma.question.findMany({
        where: {
          OR: [
            { type: "GHIGLIOTTINA", openAnswer: { not: null } },
            { type: "OPEN_ANSWER", openAnswer: { not: null } },
          ],
        },
        take: 200,
      });
      if (raw.length === 0) { callback({ error: "Nessuna domanda disponibile per il duello" }); return; }
      const pool = shuffle(raw).map((q) => ({ text: q.text, answer: q.openAnswer ?? "" })).filter((q) => q.answer.length > 0);
      if (pool.length < 2) { callback({ error: "Pool domande insufficiente" }); return; }

      const duration = Math.max(10, Math.min(600, Math.floor(durationSec ?? 100)));
      const state: DuelState = {
        playerA: { id: pa.id, nickname: pa.nickname, emoji: pa.emoji, avatarUrl: pa.avatarUrl, timeLeftMs: duration * 1000 },
        playerB: { id: pb.id, nickname: pb.nickname, emoji: pb.emoji, avatarUrl: pb.avatarUrl, timeLeftMs: duration * 1000 },
        activePlayerId: pa.id,
        question: null,
        turnSeq: 0,
        durationSec: duration,
        finished: false,
        paused: false,
      };
      const runtime: DuelRuntime = {
        state,
        correctAnswer: "",
        pool,
        lastTickAt: Date.now(),
        mask: null,
        gameId,
      };
      loadNextDuelQuestion(runtime);
      duelByGame.set(gameId, runtime);

      // Tick ogni 250ms: timer + rivelazione progressiva + broadcast
      runtime.tickInterval = setInterval(() => {
        if (runtime.state.finished) return;
        applyElapsed(runtime);
        if (runtime.state.finished) return;
        maybeRevealLetter(runtime);
        io.to(`game:${gameId}`).emit("duel:state", runtime.state);
      }, 250);

      io.to(`game:${gameId}`).emit("duel:state", runtime.state);
      callback({ ok: true });
    } catch (e) {
      console.error("duel:start error", e);
      callback({ error: "Errore interno" });
    }
  });

  socket.on("duel:stop", ({ gameId }) => {
    const r = duelByGame.get(gameId);
    if (!r) return;
    // Chi è attivo perde per stop manuale (raro — mantieni cleanup)
    if (r.tickInterval) clearInterval(r.tickInterval);
    r.state.finished = true;
    io.to(`game:${gameId}`).emit("duel:state", r.state);
    duelByGame.delete(gameId);
  });

  // Host mette in pausa / riprende il duello (ferma timer + rivelazione lettere)
  socket.on("duel:pause", ({ gameId, paused }) => {
    const r = duelByGame.get(gameId);
    if (!r || r.state.finished) return;
    if (paused && !r.state.paused) {
      // Prima di congelare, accumula il tempo scorso fino a ora
      applyElapsed(r);
      if (r.state.finished) { io.to(`game:${gameId}`).emit("duel:state", r.state); return; }
      r.state.paused = true;
    } else if (!paused && r.state.paused) {
      // Ripartenza: reset baseline del tick e della rivelazione per non "consumare" la pausa
      r.lastTickAt = Date.now();
      if (r.mask) r.mask.lastRevealAt = Date.now();
      r.state.paused = false;
    }
    io.to(`game:${gameId}`).emit("duel:state", r.state);
  });

  // Host giudica la risposta detta a voce dal player attivo: in ogni caso turno passa
  socket.on("duel:judge", ({ gameId, isCorrect }) => {
    const r = duelByGame.get(gameId);
    if (!r || r.state.finished) return;
    // Prima accumula il tempo speso dal player attivo finora
    applyElapsed(r);
    if (r.state.finished) { io.to(`game:${gameId}`).emit("duel:state", r.state); return; }
    r.state.lastResult = {
      playerId: r.state.activePlayerId,
      correct: !!isCorrect,
      correctAnswer: r.correctAnswer,
    };
    switchDuelTurn(r);
    loadNextDuelQuestion(r);
    io.to(`game:${gameId}`).emit("duel:state", r.state);
  });

  socket.on("disconnect", async () => {
    console.log(`[socket] client disconnesso: ${socket.id}`);
    const { role, playerId, gameId } = socket.data;
    if (role === "player" && playerId && gameId) {
      io.to(`game:${gameId}`).emit("player:left", { playerId });
    }
  });
});

const PORT = Number(process.env.PORT) || Number(process.env.SOCKET_PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.io server in ascolto sulla porta ${PORT}`);
});
