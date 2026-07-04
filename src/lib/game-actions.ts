import { prisma } from "@/lib/prisma";
import { broadcastToGame, broadcastToHost } from "@/lib/pusher-server";
import { describeGameMode } from "@/lib/gameMode";
import { xpForGame, levelFromXp } from "@/lib/gamification/xp";
import { evaluateBadgeUnlocks } from "@/lib/gamification/badges";
import { QUESTION_TYPE_META, getTypeLabel } from "@/lib/questionTypes";
import { broadcastLobby, emitLocalRoundState } from "@/lib/game-broadcasts";
import { resolveTimeLimit, buildJudgeAnswersData, buildRevealDataFromDb, buildCategoryCells } from "@/lib/game-snapshot";
import { resolveTurnConfig, parseActiveTurnOrder, turnPlayerId, questionSeq, resolveRoundLayout } from "@/lib/turn";
import type { QuestionType } from "@/types/socket";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per modalità presentatore: testo della risposta corretta da mostrare all'host
function resolveCorrectAnswerText(question: {
  openAnswer: string | null;
  answers: { text: string; isCorrect: boolean }[];
}): string {
  const correct = question.answers.find((a) => a.isCorrect);
  return correct?.text ?? question.openAnswer ?? "";
}

// Risolve i punti base per la domanda corrente: pointsOverrides per-round (torneo)
// se presente e > 0, altrimenti il default della Question.
export function resolveBasePoints(
  game: { pointsOverrides: string | null; tournamentModes: string | null; totalQuestions: number; currentIndex: number },
  questionDefault: number,
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

// Azioni "macro" sulla partita richiamabili sia da API routes Next.js sia
// (in transizione) da server/socket-server.ts (migration vercel-pusher fase 7).
// I broadcast usano Pusher (non Socket.io). socket-server.ts viene rimosso al cutover.

// ─── Helpers di cleanup (versioni DB-only delle clear* di socket-server.ts) ──

export async function clearQuestionDeadlineDb(gameId: string) {
  await prisma.game.update({
    where: { id: gameId },
    data: { currentQuestionDeadline: null },
  });
}

export async function clearSpeedrunStateDb(gameId: string) {
  await prisma.game.update({
    where: { id: gameId },
    data: { speedrunStartedAt: null },
  });
}

export async function startSpeedrunStateDb(gameId: string) {
  await prisma.game.update({
    where: { id: gameId },
    data: { speedrunStartedAt: new Date() },
  });
}

export async function clearJudgingDb(gameId: string) {
  await prisma.gameQuestion.updateMany({
    where: { gameId, awaitingJudgment: true },
    data: { awaitingJudgment: false },
  });
}

export async function clearRevealDb(gameId: string) {
  await prisma.gameQuestion.updateMany({
    where: { gameId, revealedAt: { not: null } },
    data: { revealedAt: null },
  });
}

// ─── Flusso domanda (sendNextQuestion → handleQuestionEnd → reveal/judging) ──
//
// Differenza chiave vs server/socket-server.ts: niente setInterval lato server.
// Il countdown della singola domanda diventa polling client (fase 8): il client
// legge Game.currentQuestionDeadline e quando il suo timer locale raggiunge 0
// chiama POST /api/game/[id]/end-question. handleQuestionEnd è atomico (lock
// via revealInProgress updateMany) → safe contro multiple chiamate concorrenti.

export async function sendNextQuestion(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { include: { answers: true, category: true } } },
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

  // Idempotenza: se la domanda corrente è già stata estratta e non ancora rivelata
  // (es. doppio click su "Prossima domanda" / "Inizia round"), non ri-mandarla né
  // resettare il timer di tutti.
  if (gq.askedAt && !gq.revealedAt) return;

  // "Ultimo in piedi": se è rimasto un solo giocatore attivo, fine partita.
  if (game.lastManStanding) {
    const activeCount = await prisma.player.count({ where: { gameId, eliminated: false } });
    if (activeCount <= 1) {
      await finishGame(gameId);
      return;
    }
  }

  await prisma.gameQuestion.update({ where: { id: gq.id }, data: { askedAt: new Date() } });

  const q = gq.question;
  const displayMode = QUESTION_TYPE_META[q.type as QuestionType].displayAnswers;
  const shuffledAnswers =
    displayMode === "shuffled" ? shuffle(q.answers)
    : displayMode === "ordered" ? [...q.answers].sort((a, b) => a.order - b.order)
    : [];

  const effectiveTimeLimit = resolveTimeLimit(game, q.timeLimit);

  // Modalità a turni: chi è di turno su questa (nuova) domanda. attempts=0 perché
  // nessuno ha ancora risposto. Per FREE_FOR_ALL resta null → comportamento invariato.
  const turnBased = resolveTurnConfig(game).turnBased;
  // Numero di sequenza progressivo delle domande estratte (clean 0,1,2… anche con
  // "Scegli categoria"/Jeopardy dove currentIndex salta). La domanda corrente è già
  // marcata askedAt nel DB (riga sopra) ma non nella lista in memoria (caricata prima)
  // → +1 la include. Usato sia per il numero domanda mostrato sia per la rotazione turni.
  const askedSeq = questionSeq(game.gameQuestions.filter((g) => g.askedAt).length + 1);
  let turnPlayerIdValue: string | null = null;
  let turnPlayerNickname: string | null = null;
  if (turnBased) {
    const players = await prisma.player.findMany({
      where: { gameId },
      orderBy: { joinedAt: "asc" },
      select: { id: true, nickname: true, eliminated: true, joinedAt: true },
    });
    const activeOrder = parseActiveTurnOrder(game.turnOrder, players);
    turnPlayerIdValue = turnPlayerId(activeOrder, askedSeq, 0);
    turnPlayerNickname = players.find((p) => p.id === turnPlayerIdValue)?.nickname ?? null;
  }

  // Round intro: splash "categoria + jingle" sui grandi schermi quando questa è la
  // PRIMA domanda di un round a categoria singola (round 1 incluso). Solo per partite
  // con struttura a round; derivato dalle domande reali del round.
  let roundIntro: {
    category: { name: string; color: string | null; icon: string | null };
    roundNumber: number;
    totalRounds: number;
    modeLabel: string;
  } | undefined;
  {
    const layout = resolveRoundLayout(game);
    if (layout) {
      const { roundTypes, roundCount, perRound } = layout;
      const roundOfQ = Math.min(roundCount - 1, Math.floor(gq.order / perRound));
      const lo = roundOfQ * perRound;
      const hi = (roundOfQ + 1) * perRound;
      // Prima domanda estratta del round? (la corrente è già askedAt su DB ma NON in
      // memoria → se nessun'altra del round ha askedAt, questa è la prima).
      const askedBefore = game.gameQuestions.filter(
        (g) => g.order >= lo && g.order < hi && g.id !== gq.id && g.askedAt,
      ).length;
      if (askedBefore === 0) {
        const cats = new Map<string, { name: string; color: string | null; icon: string | null }>();
        for (const g of game.gameQuestions) {
          if (g.order < lo || g.order >= hi) continue;
          const c = g.question.category;
          if (c) cats.set(c.id, { name: c.name, color: c.color, icon: c.icon });
        }
        if (cats.size === 1) {
          roundIntro = {
            category: Array.from(cats.values())[0],
            roundNumber: roundOfQ + 1,
            totalRounds: roundCount,
            modeLabel: getTypeLabel(roundTypes[roundOfQ]),
          };
        }
      }
    }
  }

  const questionData = {
    questionId: q.id,
    gameQuestionId: gq.id,
    text: q.text,
    questionType: q.type as QuestionType,
    answers: shuffledAnswers.map((a) => ({ id: a.id, text: a.text })),
    timeLimit: effectiveTimeLimit,
    questionNumber: askedSeq + 1,
    totalQuestions: game.totalQuestions,
    category: q.category
      ? { name: q.category.name, icon: q.category.icon, color: q.category.color }
      : undefined,
    imageUrl: q.imageUrl ?? null,
    mediaType: q.mediaType ?? null,
    mediaAudioOnly: q.mediaAudioOnly ?? false,
    mediaMaxDuration: q.mediaMaxDuration ?? null,
    wordTemplate: q.wordTemplate ?? null,
    turnPlayerId: turnPlayerIdValue,
    turnPlayerNickname,
    roundIntro,
  };

  await clearRevealDb(gameId);
  await clearJudgingDb(gameId);
  // Persisti deadline (effectiveTimeLimit<=0 = senza limite manuale, no deadline)
  await prisma.game.update({
    where: { id: gameId },
    data: {
      awaitingCategoryPick: false,
      currentQuestionDeadline:
        effectiveTimeLimit > 0 ? new Date(Date.now() + effectiveTimeLimit * 1000) : null,
    },
  });

  await broadcastToGame(gameId, "game:question", questionData);

  if (game.localPartyMode) {
    // Presentatore + "A turno": una sola persona per domanda, a rotazione uniforme
    // (lo stesso giocatore calcolato per la modalità a turni remota → D0→P1, D1→P2…).
    // Presentatore + "Tutti contro tutti": si parte dal primo attivo e l'host gira
    // manualmente fra tutti (comportamento storico invariato).
    let localTurn: string | null = turnPlayerIdValue;
    if (!turnBased) {
      const firstActive = await prisma.player.findFirst({
        where: { gameId, eliminated: false },
        orderBy: { joinedAt: "asc" },
      });
      localTurn = firstActive?.id ?? null;
    }
    await prisma.game.update({
      where: { id: gameId },
      data: { localTurnPlayerId: localTurn },
    });
    await broadcastToHost(gameId, "game:local-host-info", {
      correctAnswerText: resolveCorrectAnswerText(q),
    });
    await emitLocalRoundState(gameId, gq.id);
  }
}

export async function handleQuestionEnd(
  gameId: string,
  gameQuestionId: string,
  questionId: string,
  questionType: QuestionType,
): Promise<void> {
  // Modalità presentatore: l'host ha già giudicato a voce ogni giocatore tramite
  // /local-judge nella schermata della domanda, quindi NON serve la fase separata
  // "Giudica le risposte". Si rivela direttamente (revealAnswer → currentIndex++),
  // anche per i tipi requiresJudging (OPEN_ANSWER, IMAGE_GUESS, …). Così l'indice
  // avanza sempre di 1 per domanda e la rotazione dei turni resta uniforme.
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { localPartyMode: true },
  });
  if (!game?.localPartyMode && QUESTION_TYPE_META[questionType].requiresJudging) {
    await sendAnswersForJudgment(gameId, gameQuestionId, questionId);
  } else {
    await revealAnswer(gameId, gameQuestionId);
  }
}

// ─── Modalità a turni ────────────────────────────────────────────────────────

// Staffetta passOnWrong: passa la STESSA domanda al giocatore successivo.
// Resetta il timer della domanda e notifica tutti col nuovo giocatore di turno.
export async function passTurn(
  gameId: string,
  currentGq: { id: string; question: { timeLimit: number } },
  game: Parameters<typeof resolveTimeLimit>[0],
  activeOrder: string[],
  attemptsNow: number,
  seq: number,
): Promise<void> {
  const nextId = turnPlayerId(activeOrder, seq, attemptsNow);
  const effLimit = resolveTimeLimit(game, currentGq.question.timeLimit);
  await prisma.game.update({
    where: { id: gameId },
    data: {
      currentQuestionDeadline:
        effLimit > 0 ? new Date(Date.now() + effLimit * 1000) : null,
    },
  });
  const nextPlayer = nextId
    ? await prisma.player.findUnique({ where: { id: nextId }, select: { nickname: true } })
    : null;
  await broadcastToGame(gameId, "game:turn", {
    gameQuestionId: currentGq.id,
    turnPlayerId: nextId,
    turnPlayerNickname: nextPlayer?.nickname ?? null,
    remainingTime: effLimit > 0 ? effLimit : 0,
  });
}

// Fine domanda consapevole dei turni, chiamata dal tick alla scadenza del timer.
// - Model A / FREE_FOR_ALL: il timeout chiude la domanda (come prima).
// - Model B (passOnWrong + tipo auto-check): il timeout vale come errore del
//   giocatore di turno → segna [TEMPO SCADUTO] e passa al successivo; se hanno
//   già provato tutti, chiude la domanda. Claim atomico della deadline per evitare
//   doppioni tra più tick concorrenti.
export async function handleTurnDeadline(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { select: { id: true, type: true, timeLimit: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game || game.status !== "PLAYING" || !game.currentQuestionDeadline) return;
  // Modalità presentatore: allo scadere del tempo NON si rivela in automatico.
  // Il presentatore assegna i punti a voce e rivela/passa manualmente
  // ("Rivela risposta →") quando ha finito, così non perde i punti se si distrae.
  // Il timer resta solo un cronometro visivo.
  if (game.localPartyMode) return;
  const currentGq = game.gameQuestions[game.currentIndex];
  if (!currentGq || currentGq.revealedAt || currentGq.awaitingJudgment) return;

  const qType = currentGq.question.type as QuestionType;
  const meta = QUESTION_TYPE_META[qType];
  const turnCfg = resolveTurnConfig(game);
  const relay = turnCfg.turnBased && turnCfg.passOnWrong && meta.autoCheck !== null;

  if (!relay) {
    await handleQuestionEnd(gameId, currentGq.id, currentGq.question.id, qType);
    return;
  }

  // Claim atomico: solo il tick che "vince" la CAS sulla deadline scaduta procede.
  const claimed = await prisma.game.updateMany({
    where: { id: gameId, currentQuestionDeadline: game.currentQuestionDeadline },
    data: { currentQuestionDeadline: null },
  });
  if (claimed.count === 0) return;

  const players = await prisma.player.findMany({
    where: { gameId },
    orderBy: { joinedAt: "asc" },
    select: { id: true, eliminated: true, joinedAt: true },
  });
  const activeOrder = parseActiveTurnOrder(game.turnOrder, players);
  const attempts = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGq.id } });
  // La domanda corrente è già marcata askedAt → askedCount la include, seq = count-1.
  const seq = questionSeq(game.gameQuestions.filter((g) => g.askedAt).length);
  const curId = turnPlayerId(activeOrder, seq, attempts);
  if (curId) {
    try {
      await prisma.playerAnswer.create({
        data: {
          playerId: curId,
          gameQuestionId: currentGq.id,
          answerText: "[TEMPO SCADUTO]",
          timeTaken: 0,
          isCorrect: false,
          pointsEarned: 0,
          judged: true,
        },
      });
      await prisma.player.update({ where: { id: curId }, data: { streak: 0 } });
    } catch {
      // race con un submit reale dello stesso player (vincolo unico): ignora.
    }
  }
  const attemptsNow = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGq.id } });
  if (attemptsNow >= activeOrder.length) {
    await handleQuestionEnd(gameId, currentGq.id, currentGq.question.id, qType);
  } else {
    await passTurn(gameId, currentGq, game, activeOrder, attemptsNow, seq);
  }
}

export async function sendAnswersForJudgment(
  gameId: string,
  gameQuestionId: string,
  questionId: string,
): Promise<void> {
  const acquired = await prisma.game.updateMany({
    where: { id: gameId, revealInProgress: false },
    data: { revealInProgress: true },
  });
  if (acquired.count === 0) return;

  try {
    await clearQuestionDeadlineDb(gameId);
    await prisma.gameQuestion.update({
      where: { id: gameQuestionId },
      data: { awaitingJudgment: true },
    });
    const judgingData = await buildJudgeAnswersData(gameQuestionId, questionId);
    await broadcastToGame(gameId, "game:judge-answers", judgingData);
  } finally {
    await prisma.game.update({ where: { id: gameId }, data: { revealInProgress: false } });
  }
}

export async function revealAnswer(gameId: string, gameQuestionId: string): Promise<void> {
  const acquired = await prisma.game.updateMany({
    where: { id: gameId, revealInProgress: false },
    data: { revealInProgress: true },
  });
  if (acquired.count === 0) return;
  await clearQuestionDeadlineDb(gameId);

  try {
    await clearJudgingDb(gameId);
    await prisma.game.update({
      where: { id: gameId },
      data: { currentIndex: { increment: 1 } },
    });
    await prisma.gameQuestion.update({
      where: { id: gameQuestionId },
      data: { revealedAt: new Date() },
    });

    const revealData = await buildRevealDataFromDb(gameQuestionId);
    if (!revealData) return;

    await broadcastToGame(gameId, "game:reveal", revealData);

    // Aggiorna leaderboard live
    const players = await prisma.player.findMany({
      where: { gameId },
      orderBy: { score: "desc" },
    });
    await broadcastToGame(gameId, "game:leaderboard", {
      players: players.map((p) => ({
        id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl,
        eliminated: p.eliminated, wrongCount: p.wrongCount, fiftyFiftyUsed: p.fiftyFiftyUsed,
        skipUsed: p.skipUsed, streak: p.streak, bestStreak: p.bestStreak, pendingWager: p.pendingWager,
      })),
    });

    // Speedrun auto-advance dopo 2s. Nel modello stateless Vercel non possiamo usare setTimeout
    // affidabile: il timer client polling rileva game.currentQuestionDeadline=null e chiama
    // POST /api/game/[id]/next. Documentato in fase 8.
  } finally {
    await prisma.game.update({ where: { id: gameId }, data: { revealInProgress: false } });
  }
}

// Marca "in attesa di scelta categoria" e broadcast della griglia categorie.
// Ricalcolata da DB: chi ha quante domande rimaste.
export async function emitCategoryGrid(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { include: { category: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game || !game.categoryPickMode) return;
  // Celle categoria suddivise per difficoltà (con punti), limitate al round corrente.
  // Stessa sorgente dello snapshot (buildCategoryCells) → niente divergenze.
  const categories = buildCategoryCells(game, game.gameQuestions);

  await clearRevealDb(gameId);
  await clearJudgingDb(gameId);

  // Chi sceglierà la categoria = chi risponderà alla prossima domanda.
  // askedCount = domande già servite (a grid-time la precedente è già rivelata);
  // la prossima avrà askedSeq = askedCount → turno = activeOrder[askedCount % N]
  // (identico a quanto calcolerà sendNextQuestion). Solo in modalità a turni.
  let upcomingTurnId: string | null = null;
  let upcomingTurnNickname: string | null = null;
  if (resolveTurnConfig(game).turnBased) {
    const askedCount = game.gameQuestions.filter((g) => g.askedAt).length;
    const players = await prisma.player.findMany({
      where: { gameId },
      orderBy: { joinedAt: "asc" },
      select: { id: true, nickname: true, eliminated: true, joinedAt: true },
    });
    const activeOrder = parseActiveTurnOrder(game.turnOrder, players);
    upcomingTurnId = turnPlayerId(activeOrder, questionSeq(askedCount + 1), 0);
    upcomingTurnNickname = players.find((p) => p.id === upcomingTurnId)?.nickname ?? null;
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { awaitingCategoryPick: true, localTurnPlayerId: upcomingTurnId },
  });
  await broadcastToGame(gameId, "game:category-grid", {
    categories,
    turnPlayerId: upcomingTurnId,
    turnPlayerNickname: upcomingTurnNickname,
  });

  // Presentatore: aggiorna l'highlight anche tra una domanda e l'altra, così
  // l'evidenziato è chi sceglierà/risponderà alla prossima.
  if (game.localPartyMode) {
    await broadcastToGame(gameId, "game:local-state", {
      gameQuestionId: "",
      judgments: {},
      activePlayerId: upcomingTurnId,
    });
  }
}

// Jeopardy: broadcast della griglia categoria × valore con flag "consumed"
export async function emitJeopardyGrid(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        orderBy: { order: "asc" },
        include: { question: { include: { category: true } } },
      },
    },
  });
  if (!game || !game.jeopardyMode) return;

  const byCat = new Map<string, typeof game.gameQuestions>();
  for (const gq of game.gameQuestions) {
    const k = gq.question.categoryId;
    if (!byCat.has(k)) byCat.set(k, [] as typeof game.gameQuestions);
    byCat.get(k)!.push(gq);
  }
  const cells: { gameQuestionId: string; categoryId: string; categoryName: string; categoryColor: string | null; value: number; consumed: boolean }[] = [];
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
  await clearRevealDb(gameId);
  await clearJudgingDb(gameId);
  await broadcastToGame(gameId, "game:jeopardy-grid", { cells });
}

// Utility unused-but-imported reference per evitare il "unused import" warning su getTypeLabel
// (resta importato perché potrebbe servire ad usi futuri di build* helpers in questo modulo).
void getTypeLabel;

// ─── finishGame ──────────────────────────────────────────────────────────────

export async function finishGame(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { score: "desc" }, include: { answers: true } } },
  });
  if (!game) return;
  if (game.status === "FINISHED") {
    // Idempotente: se già finita non rifare badge/xp.
    await broadcastToGame(gameId, "game:finished", {
      players: game.players.map((p) => ({
        id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl,
        eliminated: p.eliminated, wrongCount: p.wrongCount, streak: p.streak, bestStreak: p.bestStreak,
      })),
    });
    return;
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "FINISHED", finishedAt: new Date() },
  });

  const gameMode = describeGameMode(game);
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
        const updatedUser = await prisma.user.update({
          where: { id: player.userId },
          data: {
            xp: newXp,
            level: newLevel,
            totalGames: userBefore.totalGames + 1,
            totalWins: userBefore.totalWins + (isWin ? 1 : 0),
            totalCorrect: userBefore.totalCorrect + correctCount,
            bestStreak: Math.max(userBefore.bestStreak, player.bestStreak),
          },
        });
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
          nowHour,
        );
        if (newSlugs.length > 0) {
          const badgesToAward = await prisma.badge.findMany({ where: { slug: { in: newSlugs } } });
          for (const b of badgesToAward) {
            try {
              await prisma.userBadge.create({ data: { userId: player.userId, badgeId: b.id } });
            } catch {
              // già assegnato (constraint)
            }
          }
        }
      }
    }
  }

  // Reset campi runtime persistiti in DB
  await prisma.game.update({
    where: { id: gameId },
    data: { localTurnPlayerId: null, awaitingCategoryPick: false },
  });
  await clearRevealDb(gameId);
  await clearJudgingDb(gameId);
  await clearSpeedrunStateDb(gameId);
  await clearQuestionDeadlineDb(gameId);

  await broadcastToGame(gameId, "game:finished", {
    players: game.players.map((p) => ({
      id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl,
      eliminated: p.eliminated, wrongCount: p.wrongCount, streak: p.streak, bestStreak: p.bestStreak,
    })),
  });
}
