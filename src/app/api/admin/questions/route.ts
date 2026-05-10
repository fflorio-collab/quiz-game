import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { QUESTION_TYPE_META, type QuestionType } from "@/lib/questionTypes";
import { z } from "zod";

const MultipleChoiceSchema = z.object({
  text: z.string().min(5).max(500),
  type: z.literal("MULTIPLE_CHOICE"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(5).max(60).default(20),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  answers: z
    .array(z.object({ text: z.string().min(1).max(200), isCorrect: z.boolean() }))
    .length(4)
    .refine((arr) => arr.filter((a) => a.isCorrect).length === 1, {
      message: "Deve esserci esattamente una risposta corretta",
    }),
});

const OpenAnswerSchema = z.object({
  text: z.string().min(5).max(500),
  type: z.literal("OPEN_ANSWER"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(5).max(60).default(30),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  openAnswer: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  answers: z.array(z.any()).optional(),
});

const WordCompletionSchema = z.object({
  text: z.string().min(3).max(500),
  type: z.literal("WORD_COMPLETION"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(5).max(60).default(20),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  wordTemplate: z.string().min(1),
  answers: z
    .array(z.object({ text: z.string().min(1).max(200), isCorrect: z.boolean() }))
    .min(1)
    .refine((arr) => arr.some((a) => a.isCorrect), {
      message: "Deve esserci almeno una risposta corretta",
    }),
});

const ImageGuessSchema = z.object({
  text: z.string().min(3).max(500),
  type: z.literal("IMAGE_GUESS"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(5).max(60).default(30),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  imageUrl: z.string().min(1),
  mediaType: z.string().optional().nullable(),
  openAnswer: z.string().optional().nullable(),
  answers: z.array(z.any()).optional(),
});

const GhigliottinaSchema = z.object({
  text: z.string().min(3).max(500),
  type: z.literal("GHIGLIOTTINA"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(5).max(120).default(60),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  openAnswer: z.string().min(1),  // la parola da indovinare
  imageUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  answers: z.array(z.any()).optional(),
});

// REACTION_CHAIN: 3 indizi progressivi + risposta attesa (auto-check)
const ReactionChainSchema = z.object({
  text: z.string().min(3).max(500),
  type: z.literal("REACTION_CHAIN"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(10).max(60).default(30),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  openAnswer: z.string().min(1),   // la parola corretta
  imageUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  answers: z
    .array(z.object({ text: z.string().min(1).max(200), isCorrect: z.boolean().optional() }))
    .length(3, "Servono esattamente 3 indizi"),
});

// CLUE_REVEAL: immagine che si svela progressivamente (blur → nitida)
const ClueRevealSchema = z.object({
  text: z.string().min(3).max(500),
  type: z.literal("CLUE_REVEAL"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(10).max(60).default(30),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  openAnswer: z.string().min(1),
  imageUrl: z.string().min(1),
  mediaType: z.string().optional().nullable(),
  answers: z.array(z.any()).optional(),
});

// ONLY_CONNECT: 4 elementi, link comune (admin giudica)
const OnlyConnectSchema = z.object({
  text: z.string().min(3).max(500),
  type: z.literal("ONLY_CONNECT"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(10).max(120).default(45),
  categoryId: z.string(),
  points: z.number().int().min(0).max(10000).default(100),
  explanation: z.string().optional().nullable(),
  openAnswer: z.string().min(1),   // il link (riferimento per l'admin)
  imageUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  answers: z
    .array(z.object({ text: z.string().min(1).max(200), isCorrect: z.boolean().optional() }))
    .length(4, "Servono esattamente 4 elementi"),
});

const QuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceSchema,
  OpenAnswerSchema,
  WordCompletionSchema,
  ImageGuessSchema,
  GhigliottinaSchema,
  ReactionChainSchema,
  ClueRevealSchema,
  OnlyConnectSchema,
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const difficulty = searchParams.get("difficulty");
  const type = searchParams.get("type");
  // Filtri Pack: solo uno dei tre va specificato. Se più di uno, ha priorità inPack > inAnyPack > notInPack.
  const inPack = searchParams.get("inPack");                    // packId specifico
  const inAnyPack = searchParams.get("inAnyPack") === "true";   // domande presenti in almeno un pack
  const notInPack = searchParams.get("notInPack") === "true";   // domande in nessun pack

  // Costruisco il filtro pack come clausola Prisma sulla relazione `packs` (QuestionInPack[]).
  const packFilter: Record<string, unknown> = inPack
    ? { packs: { some: { packId: inPack } } }
    : inAnyPack
      ? { packs: { some: {} } }
      : notInPack
        ? { packs: { none: {} } }
        : {};

  const questions = await prisma.question.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(type ? { type } : {}),
      ...packFilter,
    },
    include: {
      answers: { orderBy: { order: "asc" } },
      category: true,
      packs: { select: { packId: true } }, // per UI: mostra in quali pack è la domanda
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build mode: se la query string contiene packId, la domanda creata viene
  // automaticamente aggiunta al pack indicato. Così l'utente entra una volta nel pack
  // dall'UI admin e ogni domanda creata viene auto-attached, senza selezionare ogni volta.
  const { searchParams } = new URL(req.url);
  const buildPackId = searchParams.get("packId");

  const body = await req.json();
  const parsed = QuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const meta = QUESTION_TYPE_META[data.type as QuestionType];

  // Verifica che il pack esista (se buildPackId è impostato), altrimenti rifiuto
  // per non creare domande "orfane" rispetto a un pack inesistente.
  if (buildPackId) {
    const exists = await prisma.questionPack.findUnique({ where: { id: buildPackId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Pack non trovato (build mode)" }, { status: 404 });
  }

  let question;
  if (meta.storedAnswers !== "none") {
    const { answers, ...rest } = data as typeof data & { answers: { text: string; isCorrect?: boolean }[] };
    question = await prisma.question.create({
      data: {
        ...rest,
        answers: {
          create: answers.map((a, i) => ({
            text: a.text,
            isCorrect: a.isCorrect ?? false,
            order: i,
          })),
        },
      },
      include: { answers: true, category: true },
    });
  } else {
    // Tipi senza Answer[] in DB (OPEN_ANSWER, IMAGE_GUESS, GHIGLIOTTINA, CLUE_REVEAL)
    const { answers: _ignored, ...rest } = data as { answers?: unknown } & Record<string, unknown>;
    question = await prisma.question.create({
      data: rest as Parameters<typeof prisma.question.create>[0]["data"],
      include: { answers: true, category: true },
    });
  }

  // Build mode: aggancio la domanda al pack (idempotente).
  if (buildPackId) {
    await prisma.questionInPack.create({
      data: { packId: buildPackId, questionId: question.id },
    }).catch(() => { /* no-op se collisione (improbabile per nuova creazione) */ });
  }

  return NextResponse.json({ question, addedToPack: buildPackId ?? null });
}
