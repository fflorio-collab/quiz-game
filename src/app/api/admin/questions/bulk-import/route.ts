import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { z } from "zod";

// Schema minimale per import in batch. Compatibile col formato dei seed.
const AnswerSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
  order: z.number().int().optional(),
});

const QuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum([
    "MULTIPLE_CHOICE",
    "OPEN_ANSWER",
    "WORD_COMPLETION",
    "IMAGE_GUESS",
    "GHIGLIOTTINA",
    "REACTION_CHAIN",
    "CLUE_REVEAL",
    "ONLY_CONNECT",
  ]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  timeLimit: z.number().int().min(0).max(300).default(20),
  points: z.number().int().min(0).default(1000),
  explanation: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  openAnswer: z.string().optional().nullable(),
  wordTemplate: z.string().optional().nullable(),
  // Collegamento categoria: uno dei due (priorità: categoryId, poi categorySlug)
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  answers: z.array(AnswerSchema).optional(),
});

const PayloadSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(5000),
});

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Formato payload non valido", details: parsed.error.errors.slice(0, 5) },
      { status: 400 }
    );
  }

  // Pre-carica tutte le categorie per risolvere slug → id
  const allCats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugToId = new Map<string, string>();
  const knownIds = new Set<string>();
  for (const c of allCats) { slugToId.set(c.slug, c.id); knownIds.add(c.id); }

  let created = 0;
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < parsed.data.questions.length; i++) {
    const q = parsed.data.questions[i];
    let categoryId: string | undefined = q.categoryId;
    if (!categoryId && q.categorySlug) categoryId = slugToId.get(q.categorySlug);
    if (!categoryId || !knownIds.has(categoryId)) {
      errors.push({ index: i, error: `Categoria non trovata (${q.categoryId ?? q.categorySlug ?? "nessuna"})` });
      continue;
    }

    // Validazione semantica leggera
    if (q.type === "MULTIPLE_CHOICE" && (!q.answers || q.answers.length < 2)) {
      errors.push({ index: i, error: "MULTIPLE_CHOICE richiede almeno 2 risposte" });
      continue;
    }
    if (q.type === "MULTIPLE_CHOICE" && q.answers && !q.answers.some((a) => a.isCorrect)) {
      errors.push({ index: i, error: "MULTIPLE_CHOICE richiede almeno una risposta corretta" });
      continue;
    }

    try {
      await prisma.question.create({
        data: {
          text: q.text,
          type: q.type,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          points: q.points,
          explanation: q.explanation ?? null,
          imageUrl: q.imageUrl ?? null,
          mediaType: q.mediaType ?? null,
          openAnswer: q.openAnswer ?? null,
          wordTemplate: q.wordTemplate ?? null,
          categoryId,
          answers: q.answers
            ? { create: q.answers.map((a, idx) => ({ text: a.text, isCorrect: a.isCorrect, order: a.order ?? idx })) }
            : undefined,
        },
      });
      created++;
    } catch (e) {
      errors.push({ index: i, error: (e as Error).message || "Errore interno" });
    }
  }

  return NextResponse.json({
    created,
    skipped: errors.length,
    errors: errors.slice(0, 20),
  });
}
