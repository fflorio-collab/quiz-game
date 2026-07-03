import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { generateGameCode, shuffle } from "@/lib/utils";
import { getTypeLabel } from "@/lib/questionTypes";
import { broadcastLobby } from "@/lib/game-broadcasts";
import type { QuestionType } from "@/types/socket";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:create").
// Crea una nuova partita con configurazione (round, modi, filtri, ecc.) e
// la popola di GameQuestion estraendo le domande dal DB.

type RoundConfig = {
  type: QuestionType;
  packIds?: string[];
  categoryIds?: string[];
  manualQuestionIds?: string[];
};

type Body = {
  hostName?: string;
  difficulty?: string;
  totalQuestions?: number;
  questionType?: QuestionType;
  tournamentModes?: QuestionType[];
  tournamentTimeLimits?: number[];
  categoryIds?: string[];
  timeLimitOverride?: number | null;
  lastManStanding?: boolean;
  speedrunDuration?: number | null;
  livesAllowed?: number | null;
  jeopardyMode?: boolean;
  fiftyFiftyCount?: number;
  skipCount?: number;
  localPartyMode?: boolean;
  pointsOverrides?: number[];
  tournamentCategoryIds?: string[][];
  categoryPickMode?: boolean;
  manualQuestionIds?: string[][];
  roundsConfig?: RoundConfig[];
  playMode?: "FREE_FOR_ALL" | "TURN_BASED";
  passOnWrong?: boolean;
  turnOrder?: string[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Body JSON richiesto" }, { status: 400 });

  const {
    hostName,
    difficulty = "MEDIUM",
    totalQuestions = 10,
    questionType = "MULTIPLE_CHOICE" as QuestionType,
    tournamentModes,
    tournamentTimeLimits,
    categoryIds,
    timeLimitOverride,
    lastManStanding,
    speedrunDuration,
    livesAllowed,
    jeopardyMode,
    fiftyFiftyCount,
    skipCount,
    localPartyMode,
    pointsOverrides,
    tournamentCategoryIds,
    categoryPickMode,
    manualQuestionIds,
    roundsConfig,
    playMode,
    passOnWrong,
    turnOrder,
  } = body;

  // Codice unico (collision retry)
  let code = generateGameCode();
  let attempts = 0;
  while ((await prisma.game.findUnique({ where: { code } })) && attempts < 10) {
    code = generateGameCode();
    attempts++;
  }

  const useRoundsConfig = Array.isArray(roundsConfig) && roundsConfig.length > 0;
  const modes: QuestionType[] = useRoundsConfig
    ? roundsConfig!.map((r) => r.type)
    : (tournamentModes && tournamentModes.length > 0 ? tournamentModes : [questionType]);

  const difficultyFilter = difficulty === "ALL" ? undefined : difficulty;
  const globalCategoryIds = categoryIds && categoryIds.length > 0 ? categoryIds : null;

  type QuestionWithAnswers = Awaited<ReturnType<typeof prisma.question.findMany>>[number];
  const selectedByMode: { mode: QuestionType; questions: QuestionWithAnswers[] }[] = [];
  const usedQuestionIds = new Set<string>();

  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i];
    const roundFromConfig = useRoundsConfig ? roundsConfig![i] : null;
    const manualIds = roundFromConfig?.manualQuestionIds ?? manualQuestionIds?.[i] ?? [];
    const packIds = roundFromConfig?.packIds ?? [];

    if (manualIds.length === totalQuestions) {
      const manualPool = await prisma.question.findMany({
        where: { id: { in: manualIds }, type: mode },
        include: { answers: true },
      });
      if (manualPool.length !== totalQuestions) {
        return NextResponse.json(
          { error: `Selezione manuale round ${i + 1}: alcune domande non trovate o tipo non coerente.` },
          { status: 400 },
        );
      }
      const orderIdx = new Map(manualIds.map((id, idx) => [id, idx]));
      const ordered = manualPool.sort((a, b) => (orderIdx.get(a.id) ?? 0) - (orderIdx.get(b.id) ?? 0));
      ordered.forEach((q) => usedQuestionIds.add(q.id));
      selectedByMode.push({ mode, questions: ordered });
      continue;
    }

    const perRoundCatIds = roundFromConfig?.categoryIds ?? tournamentCategoryIds?.[i] ?? [];
    const effectiveCatIds = perRoundCatIds.length > 0 ? perRoundCatIds : (globalCategoryIds ?? []);
    const roundCategoryFilter = effectiveCatIds.length > 0 ? { in: effectiveCatIds } : undefined;
    const packFilter = packIds.length > 0
      ? { packs: { some: { packId: { in: packIds } } } }
      : undefined;

    const pool = await prisma.question.findMany({
      where: {
        type: mode,
        ...(difficultyFilter ? { difficulty: difficultyFilter } : {}),
        ...(roundCategoryFilter ? { categoryId: roundCategoryFilter } : {}),
        ...(packFilter ?? {}),
        id: { notIn: Array.from(usedQuestionIds) },
      },
      include: { answers: true },
    });
    if (pool.length < totalQuestions) {
      const sourceDesc = packIds.length > 0 ? "del pack scelto" : "(con i filtri scelti)";
      return NextResponse.json(
        { error: `Modalità "${getTypeLabel(mode)}" (round ${i + 1}): solo ${pool.length} domande disponibili su ${totalQuestions} richieste ${sourceDesc}.` },
        { status: 400 },
      );
    }
    const chosen = shuffle(pool).slice(0, totalQuestions);
    chosen.forEach((q) => usedQuestionIds.add(q.id));
    selectedByMode.push({ mode, questions: chosen });
  }

  const flat = selectedByMode.flatMap((r) => r.questions);
  const isTournament = modes.length > 1;

  const timeLimitsCsv = isTournament && tournamentTimeLimits && tournamentTimeLimits.length === modes.length
    ? tournamentTimeLimits.map((n) => String(Math.max(0, Math.floor(Number(n) || 0)))).join(",")
    : null;
  const pointsOverridesCsv = pointsOverrides && pointsOverrides.length === modes.length
    ? pointsOverrides.map((n) => String(Math.max(0, Math.floor(Number(n) || 0)))).join(",")
    : null;
  const tournamentCategoryIdsCsv = isTournament && tournamentCategoryIds && tournamentCategoryIds.length === modes.length
    ? tournamentCategoryIds.map((arr) => (arr ?? []).filter(Boolean).join(",")).join("|")
    : null;
  const roundsConfigSerialized = useRoundsConfig ? JSON.stringify(roundsConfig) : null;
  const validPlayMode = playMode === "TURN_BASED" || playMode === "FREE_FOR_ALL" ? playMode : "FREE_FOR_ALL";
  const turnOrderCsv = Array.isArray(turnOrder) && turnOrder.length > 0
    ? turnOrder.filter((s) => typeof s === "string" && s.length > 0).join(",")
    : null;

  // Credenziale di regia: chi crea la partita riceve un token segreto che
  // autentica le azioni host (start/next/judge/…). Il gameId nell'URL dei
  // player NON basta più per pilotare la partita.
  const hostToken = randomUUID();

  const game = await prisma.game.create({
    data: {
      code,
      hostToken,
      hostName: hostName ?? null,
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
      roundsConfig: roundsConfigSerialized,
      playMode: validPlayMode,
      passOnWrong: !!passOnWrong,
      turnOrder: turnOrderCsv,
      totalQuestions: flat.length,
      gameQuestions: {
        create: flat.map((q, i) => ({ questionId: q.id, order: i })),
      },
    },
  });

  await broadcastLobby(game.id);
  return NextResponse.json({ code: game.code, gameId: game.id, hostToken });
}
