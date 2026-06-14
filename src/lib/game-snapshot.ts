import { prisma } from "@/lib/prisma";
import { loadDuelStateFromDB } from "@/lib/duel-state";
import { getTypeLabel } from "@/lib/questionTypes";
import { resolveTurnConfig, parseActiveTurnOrder, turnPlayerId, resolveRoundLayout, questionSeq, currentRoundBounds } from "@/lib/turn";
import type {
  GameStateSnapshot,
  PlayerInfo,
  QuestionData,
  QuestionType,
  RevealData,
  JudgeAnswersData,
  JeopardyGridData,
  CategoryGridData,
  LocalRoundState,
} from "@/types/socket";

// Snapshot della partita pensato per le API routes Next.js (migration fase 7).
// Solo DB, niente Map in-memory → sopravvive a restart worker / scalata multi-instance.
//
// Differenze dalla buildGameStateSnapshot in server/socket-server.ts:
// 1. L'ordine delle answer di una domanda viene riletto sempre da DB (originale: stored
//    in currentQuestionByGame). Sulla domanda non shuffled non cambia nulla; per quelle
//    shuffled (es. multipla) il rejoin potrebbe mostrare ordine diverso. Accettato per
//    semplicità — se in futuro serve consistency aggiungere snapshotJson su GameQuestion.
// 2. Gli aiuti 50/50 attivi (answer nascoste) non vengono ripristinati al rejoin:
//    il client deve richiederli di nuovo. Documentato come behavior intenzionale.

function mapPlayer(p: {
  id: string;
  nickname: string;
  score: number;
  emoji: string | null;
  avatarUrl: string | null;
  eliminated: boolean;
  wrongCount: number;
  fiftyFiftyUsed: number;
  skipUsed: number;
  streak: number;
  bestStreak: number;
  pendingWager: number;
}): PlayerInfo {
  return {
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
  };
}

export function resolveTimeLimit(
  game: { tournamentModes: string | null; tournamentTimeLimits: string | null; timeLimitOverride: number | null; speedrunDuration: number | null; totalQuestions: number; currentIndex: number },
  questionDefaultTimeLimit: number,
): number {
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

async function findAwaitingJudgmentDb(gameId: string) {
  return prisma.gameQuestion.findFirst({
    where: { gameId, awaitingJudgment: true },
    select: { id: true, questionId: true },
  });
}

async function findActiveRevealDb(gameId: string) {
  return prisma.gameQuestion.findFirst({
    where: { gameId, revealedAt: { not: null } },
    orderBy: { revealedAt: "desc" },
    select: { id: true, questionId: true },
  });
}

// La "domanda attiva" è l'ultima GameQuestion con askedAt!=null, revealedAt==null,
// awaitingJudgment==false. (Se in reveal o in judging, lo gestiamo in rami separati.)
async function findCurrentQuestionDb(gameId: string, currentIndex: number) {
  // order === currentIndex = la domanda effettivamente servita (robusto ai salti di
  // currentIndex in "Scegli categoria"/Jeopardy). (gameId, order) individua una sola riga.
  return prisma.gameQuestion.findFirst({
    where: { gameId, order: currentIndex, askedAt: { not: null }, revealedAt: null, awaitingJudgment: false },
    include: { question: { include: { answers: true, category: true } } },
  });
}

export async function buildJudgeAnswersData(
  gameQuestionId: string,
  questionId: string,
): Promise<JudgeAnswersData> {
  const playerAnswers = await prisma.playerAnswer.findMany({
    where: { gameQuestionId },
    include: { player: true },
  });
  return {
    gameQuestionId,
    questionId,
    answers: playerAnswers.map((pa) => ({
      playerId: pa.playerId,
      nickname: pa.player.nickname,
      answerText: pa.answerText ?? "(nessuna risposta)",
    })),
  };
}

export async function buildRevealDataFromDb(gameQuestionId: string): Promise<RevealData | null> {
  const gq = await prisma.gameQuestion.findUnique({
    where: { id: gameQuestionId },
    include: {
      question: { include: { answers: true } },
      playerAnswers: { include: { player: true } },
      game: {
        include: {
          gameQuestions: { include: { question: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!gq) return null;

  const correctAnswer = gq.question.answers.find((a) => a.isCorrect);
  const correctAnswerText = correctAnswer?.text ?? gq.question.openAnswer ?? "";
  const questionType = gq.question.type as QuestionType;

  let nextRound: RevealData["nextRound"];
  {
    const layout = resolveRoundLayout(gq.game);
    if (layout && layout.roundCount > 1) {
      const { roundTypes, roundCount, perRound } = layout;
      const roundOfQuestion = Math.min(roundCount - 1, Math.floor(gq.order / perRound));
      const lo = roundOfQuestion * perRound;
      const hi = (roundOfQuestion + 1) * perRound; // esclusivo
      // Round appena giocato completato? (gq stesso ha già askedAt!=null) → confine round.
      // Robusto a currentIndex che salta (Scegli categoria) e a round dello stesso tipo.
      const roundComplete = gq.game.gameQuestions
        .filter((g) => g.order >= lo && g.order < hi)
        .every((g) => g.askedAt != null);
      if (roundComplete && roundOfQuestion < roundCount - 1) {
        const nextModeType = roundTypes[roundOfQuestion + 1];
        nextRound = {
          modeType: nextModeType,
          modeLabel: getTypeLabel(nextModeType),
          roundNumber: roundOfQuestion + 2,
          totalRounds: roundCount,
        };
      }
    }
  }

  return {
    questionType,
    correctAnswerId: correctAnswer?.id,
    correctAnswerText,
    playerResults: gq.playerAnswers.map((pa) => ({
      playerId: pa.playerId,
      nickname: pa.player.nickname,
      wasCorrect: pa.isCorrect,
      pointsEarned: pa.pointsEarned,
      totalScore: pa.player.score,
      answerText: pa.answerText ?? undefined,
    })),
    nextRound,
  };
}

async function buildLocalRoundStateFromDb(
  gameId: string,
  gameQuestionId: string,
  players: { id: string }[],
): Promise<LocalRoundState> {
  const [answers, game] = await Promise.all([
    prisma.playerAnswer.findMany({ where: { gameQuestionId } }),
    prisma.game.findUnique({ where: { id: gameId }, select: { localTurnPlayerId: true } }),
  ]);
  const judgments: Record<string, boolean | null> = {};
  for (const p of players) judgments[p.id] = null;
  for (const a of answers) judgments[a.playerId] = a.isCorrect;
  return {
    gameQuestionId,
    judgments,
    activePlayerId: game?.localTurnPlayerId ?? null,
  };
}

async function buildJeopardyGridFromDb(gameId: string): Promise<JeopardyGridData | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        orderBy: { order: "asc" },
        include: { question: { include: { category: true } } },
      },
    },
  });
  if (!game || !game.jeopardyMode) return null;

  const byCat = new Map<string, typeof game.gameQuestions>();
  for (const gq of game.gameQuestions) {
    const k = gq.question.categoryId;
    if (!byCat.has(k)) byCat.set(k, [] as typeof game.gameQuestions);
    byCat.get(k)!.push(gq);
  }
  const cells: JeopardyGridData["cells"] = [];
  byCat.forEach((list) => {
    list.sort((a, b) => a.question.points - b.question.points);
    list.forEach((gq) => {
      cells.push({
        gameQuestionId: gq.id,
        categoryId: gq.question.categoryId,
        categoryName: gq.question.category?.name ?? "?",
        categoryColor: gq.question.category?.color ?? null,
        value: gq.question.points,
        consumed: !!gq.askedAt,
      });
    });
  });
  return { cells };
}

async function buildCategoryGridFromDb(gameId: string): Promise<CategoryGridData | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: true,
      gameQuestions: {
        include: { question: { include: { category: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game || !game.categoryPickMode) return null;
  // Stesso scope per-round della broadcast live (emitCategoryGrid): al rejoin in un
  // torneo la griglia deve mostrare solo le categorie del round corrente.
  const { lo, hi } = currentRoundBounds(game, game.gameQuestions);
  const counts = new Map<string, { name: string; color: string | null; icon: string | null; count: number }>();
  for (const gq of game.gameQuestions) {
    if (gq.askedAt) continue;
    if (gq.order < lo || gq.order >= hi) continue; // solo round corrente
    const k = gq.question.categoryId;
    if (!counts.has(k)) counts.set(k, { name: gq.question.category?.name ?? "?", color: gq.question.category?.color ?? null, icon: gq.question.category?.icon ?? null, count: 0 });
    counts.get(k)!.count += 1;
  }
  const categories = Array.from(counts.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    color: v.color,
    icon: v.icon,
    remaining: v.count,
  }));
  // Chi sceglierà = chi risponderà alla prossima domanda (stessa formula di emitCategoryGrid).
  let turnId: string | null = null;
  let turnNickname: string | null = null;
  if (resolveTurnConfig(game).turnBased) {
    const askedCount = game.gameQuestions.filter((gq) => gq.askedAt).length;
    const activeOrder = parseActiveTurnOrder(game.turnOrder, game.players);
    turnId = turnPlayerId(activeOrder, questionSeq(askedCount + 1), 0);
    turnNickname = game.players.find((p) => p.id === turnId)?.nickname ?? null;
  }
  return { categories, turnPlayerId: turnId, turnPlayerNickname: turnNickname };
}

export async function buildGameStateSnapshotFromDB(
  gameId: string,
  playerId?: string,
  options: { forHost?: boolean } = {},
): Promise<GameStateSnapshot | null> {
  const forHost = !!options.forHost;
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { score: "desc" } } },
  });
  if (!game) return null;

  const players = game.players.map(mapPlayer);
  const snapshot: GameStateSnapshot = {
    gameStatus: game.status as "LOBBY" | "PLAYING" | "FINISHED",
    code: game.code,
    players,
    fiftyFiftyCount: game.fiftyFiftyCount,
    skipCount: game.skipCount,
    localPartyMode: game.localPartyMode,
    categoryPickMode: game.categoryPickMode,
  };

  const dbDuel = await loadDuelStateFromDB(gameId);
  if (dbDuel) snapshot.duel = dbDuel;

  if (game.status === "FINISHED") {
    snapshot.finalRanking = players;
    return snapshot;
  }
  if (game.status !== "PLAYING") return snapshot;

  if (game.speedrunStartedAt && game.speedrunDuration) {
    const elapsed = (Date.now() - game.speedrunStartedAt.getTime()) / 1000;
    snapshot.speedrunRemaining = Math.max(0, Math.ceil(game.speedrunDuration - elapsed));
  }
  if (game.livesAllowed) snapshot.livesAllowed = game.livesAllowed;

  const [awaitingJudgment, activeReveal, currentGq] = await Promise.all([
    findAwaitingJudgmentDb(gameId),
    findActiveRevealDb(gameId),
    findCurrentQuestionDb(gameId, game.currentIndex),
  ]);

  if (game.jeopardyMode && !currentGq && !activeReveal && !awaitingJudgment) {
    const grid = await buildJeopardyGridFromDb(gameId);
    if (grid) snapshot.jeopardyGrid = grid;
  }
  if (game.categoryPickMode && !currentGq && !activeReveal && !awaitingJudgment) {
    const grid = await buildCategoryGridFromDb(gameId);
    if (grid) snapshot.categoryGrid = grid;
    // Presentatore: ripristina l'highlight 🎯 anche durante la griglia (al rejoin),
    // come fa la broadcast live in emitCategoryGrid.
    if (game.localPartyMode) {
      snapshot.localState = { gameQuestionId: "", judgments: {}, activePlayerId: game.localTurnPlayerId ?? null };
    }
  }

  if (awaitingJudgment) {
    snapshot.judging = await buildJudgeAnswersData(awaitingJudgment.id, awaitingJudgment.questionId);
    return snapshot;
  }
  if (activeReveal) {
    const reveal = await buildRevealDataFromDb(activeReveal.id);
    if (reveal) {
      snapshot.isRevealing = true;
      snapshot.reveal = reveal;
    }
    return snapshot;
  }

  if (currentGq) {
    const q = currentGq.question;
    const timeLimit = resolveTimeLimit(game, q.timeLimit);
    const askedAtMs = currentGq.askedAt?.getTime() ?? Date.now();
    const elapsed = (Date.now() - askedAtMs) / 1000;
    const remaining = timeLimit <= 0 ? 0 : Math.max(0, Math.ceil(timeLimit - elapsed));
    // Numero di sequenza progressivo (1,2,3…), robusto a currentIndex che salta
    // ("Scegli categoria"/Jeopardy). Riusato sotto anche per la rotazione turni.
    const askedCount = await prisma.gameQuestion.count({ where: { gameId, askedAt: { not: null } } });

    const questionPayload: QuestionData = {
      questionId: q.id,
      gameQuestionId: currentGq.id,
      text: q.text,
      questionType: q.type as QuestionType,
      // Ordine answer letto da DB (vedi nota in cima al file).
      answers: q.answers.map((a) => ({ id: a.id, text: a.text, order: a.order })),
      timeLimit,
      questionNumber: questionSeq(askedCount) + 1,
      totalQuestions: game.totalQuestions,
      category: q.category ? { name: q.category.name, icon: q.category.icon, color: q.category.color } : undefined,
      imageUrl: q.imageUrl ?? null,
      mediaType: q.mediaType ?? null,
      wordTemplate: q.wordTemplate ?? null,
    };
    snapshot.currentQuestion = questionPayload;
    snapshot.remainingTime = remaining;

    // Modalità a turni: comunica chi è di turno così i rientri (rejoin) e l'host
    // sanno chi può rispondere. attempts = risposte già date sulla domanda corrente.
    if (resolveTurnConfig(game).turnBased) {
      const activeOrder = parseActiveTurnOrder(game.turnOrder, game.players);
      const attempts = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGq.id } });
      // askedCount calcolato sopra: rotazione sul numero di domande estratte (robusta ai salti).
      const turnId = turnPlayerId(activeOrder, questionSeq(askedCount), attempts);
      questionPayload.turnPlayerId = turnId;
      questionPayload.turnPlayerNickname = game.players.find((p) => p.id === turnId)?.nickname ?? null;
    }

    if (playerId) {
      const existing = await prisma.playerAnswer.findUnique({
        where: { playerId_gameQuestionId: { playerId, gameQuestionId: currentGq.id } },
      });
      snapshot.alreadyAnswered = !!existing;
    }

    if (game.localPartyMode) {
      snapshot.localState = await buildLocalRoundStateFromDb(gameId, currentGq.id, game.players);
      if (forHost) {
        const correct = q.answers.find((a) => a.isCorrect);
        snapshot.correctAnswerText = correct?.text ?? q.openAnswer ?? "";
      }
    }
  }

  return snapshot;
}
