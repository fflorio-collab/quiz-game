/**
 * Socket.io server per il quiz multiplayer real-time.
 * Gestisce la creazione partite, join dei player, flusso domande, timer,
 * ricezione risposte e calcolo classifica.
 * Supporta 4 modalità: MULTIPLE_CHOICE, OPEN_ANSWER, WORD_COMPLETION, IMAGE_GUESS.
 */
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  QuestionType,
} from "../src/types/socket.js";
import { generateGameCode, calculatePoints, shuffle } from "../src/lib/utils.js";

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

const activeTimers = new Map<string, NodeJS.Timeout>();
const questionStartTimes = new Map<string, number>();
const revealInProgress = new Set<string>();
// Partite in attesa di giudizio host (OPEN_ANSWER / IMAGE_GUESS)
const pendingJudgment = new Map<string, { gameQuestionId: string; questionId: string }>();

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

  await prisma.gameQuestion.update({ where: { id: gq.id }, data: { askedAt: new Date() } });

  const q = gq.question;
  const shuffledAnswers = q.type === "MULTIPLE_CHOICE" ? shuffle(q.answers) : [];

  const questionData = {
    questionId: q.id,
    gameQuestionId: gq.id,
    text: q.text,
    questionType: q.type as QuestionType,
    answers: shuffledAnswers.map((a) => ({ id: a.id, text: a.text })),
    timeLimit: q.timeLimit,
    questionNumber: game.currentIndex + 1,
    totalQuestions: game.totalQuestions,
    category: q.category
      ? { name: q.category.name, icon: q.category.icon, color: q.category.color }
      : undefined,
    imageUrl: q.imageUrl ?? null,
    mediaType: q.mediaType ?? null,
    wordTemplate: q.wordTemplate ?? null,
  };

  io.to(`game:${gameId}`).emit("game:question", questionData);
  questionStartTimes.set(gameId, Date.now());

  let remaining = q.timeLimit;
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
  if (questionType === "OPEN_ANSWER" || questionType === "IMAGE_GUESS") {
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

    io.to(`game:${gameId}`).emit("game:judge-answers", {
      gameQuestionId,
      questionId,
      answers,
    });
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

    io.to(`game:${gameId}`).emit("game:reveal", {
      questionType,
      correctAnswerId: correctAnswer?.id,
      correctAnswerText,
      playerResults,
    });

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
        players: game.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl })),
      });
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

  for (const player of game.players) {
    const correctCount = player.answers.filter((a) => a.isCorrect).length;
    await prisma.leaderboard.create({
      data: {
        nickname: player.nickname,
        score: player.score,
        difficulty: game.difficulty,
        totalQuestions: game.totalQuestions,
        correctAnswers: correctCount,
      },
    });
  }

  io.to(`game:${gameId}`).emit("game:finished", {
    players: game.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl })),
  });
}

// === CONNECTION HANDLER ===
io.on("connection", (socket) => {
  console.log(`[socket] client connesso: ${socket.id}`);

  socket.on("host:create", async ({ hostName, difficulty, totalQuestions, questionType }, callback) => {
    try {
      let code = generateGameCode();
      let attempts = 0;
      while ((await prisma.game.findUnique({ where: { code } })) && attempts < 10) {
        code = generateGameCode();
        attempts++;
      }

      const allQuestions = await prisma.question.findMany({
        where: { difficulty, type: questionType },
        include: { answers: true },
      });
      if (allQuestions.length < totalQuestions) {
        callback({
          error: `Non ci sono abbastanza domande (${allQuestions.length} disponibili, ${totalQuestions} richieste)`,
        });
        return;
      }
      const selected = shuffle(allQuestions).slice(0, totalQuestions);

      const game = await prisma.game.create({
        data: {
          code,
          hostName,
          difficulty,
          questionType,
          totalQuestions,
          gameQuestions: {
            create: selected.map((q, i) => ({ questionId: q.id, order: i })),
          },
        },
      });

      socket.join(`game:${game.id}`);
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
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) { callback({ success: false, error: "Partita non trovata" }); return; }
    socket.join(`game:${gameId}`);
    socket.data.role = "host";
    socket.data.gameId = gameId;
    callback({ success: true });
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
    setTimeout(() => sendNextQuestion(gameId), 2000);
  });

  socket.on("host:next", async ({ gameId }) => {
    await sendNextQuestion(gameId);
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

    for (const judgment of judgments) {
      const pa = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId: judgment.playerId, gameQuestionId } },
      });
      if (!pa) continue;

      const timeTaken = pa.timeTaken;
      const points = judgment.isCorrect
        ? calculatePoints(timeTaken, gq.question.timeLimit * 1000, true, gq.question.points)
        : 0;

      await prisma.playerAnswer.update({
        where: { id: pa.id },
        data: { isCorrect: judgment.isCorrect, pointsEarned: points, judged: true },
      });

      if (points > 0) {
        await prisma.player.update({
          where: { id: judgment.playerId },
          data: { score: { increment: points } },
        });
      }
    }

    const questionType = gq.question.type as QuestionType;
    await revealAnswer(gameId, gameQuestionId, questionId, questionType);
  });

  socket.on("player:join", async ({ code, nickname, emoji, avatarUrl }, callback) => {
    const game = await prisma.game.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });
    if (!game) { callback({ error: "Codice partita non valido" }); return; }
    if (game.status !== "LOBBY") { callback({ error: "La partita è già iniziata" }); return; }
    if (game.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
      callback({ error: "Nickname già in uso in questa partita" });
      return;
    }

    const player = await prisma.player.create({
      data: { nickname, gameId: game.id, socketId: socket.id, emoji: emoji ?? null, avatarUrl: avatarUrl ?? null },
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

  socket.on("player:answer", async ({ playerId, gameId, answerId, answerText, timeTaken }) => {
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

      const currentGQ = game.gameQuestions[game.currentIndex];
      if (!currentGQ) return;

      const existing = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId, gameQuestionId: currentGQ.id } },
      });
      if (existing) return;

      const questionType = currentGQ.question.type as QuestionType;
      let isCorrect = false;
      let points = 0;

      if (questionType === "MULTIPLE_CHOICE") {
        const answer = currentGQ.question.answers.find((a) => a.id === answerId);
        isCorrect = answer?.isCorrect ?? false;
        points = calculatePoints(timeTaken, currentGQ.question.timeLimit * 1000, isCorrect, currentGQ.question.points);

        await prisma.playerAnswer.create({
          data: { playerId, gameQuestionId: currentGQ.id, answerId, timeTaken, isCorrect, pointsEarned: points },
        });
        if (points > 0) {
          await prisma.player.update({ where: { id: playerId }, data: { score: { increment: points } } });
        }

      } else if (questionType === "WORD_COMPLETION") {
        const correctAnswer = currentGQ.question.answers.find((a) => a.isCorrect);
        isCorrect = !!correctAnswer && (answerText ?? "").trim().toLowerCase() === correctAnswer.text.trim().toLowerCase();
        points = calculatePoints(timeTaken, currentGQ.question.timeLimit * 1000, isCorrect, currentGQ.question.points);

        await prisma.playerAnswer.create({
          data: { playerId, gameQuestionId: currentGQ.id, answerText: answerText ?? "", timeTaken, isCorrect, pointsEarned: points, judged: true },
        });
        if (points > 0) {
          await prisma.player.update({ where: { id: playerId }, data: { score: { increment: points } } });
        }

      } else {
        // OPEN_ANSWER / IMAGE_GUESS: salva senza giudizio, punti assegnati dopo
        await prisma.playerAnswer.create({
          data: { playerId, gameQuestionId: currentGQ.id, answerText: answerText ?? "", timeTaken, isCorrect: false, pointsEarned: 0, judged: false },
        });
      }

      io.to(`game:${gameId}`).emit("game:answer-received", { playerId });

      // Anticipa fine round se tutti hanno risposto
      const totalPlayers = await prisma.player.count({ where: { gameId } });
      const answeredCount = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGQ.id } });
      if (answeredCount >= totalPlayers) {
        await handleQuestionEnd(gameId, currentGQ.id, currentGQ.question.id, questionType);
      }
    } catch (err) {
      console.error("Errore nella risposta:", err);
    }
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
