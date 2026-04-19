import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const MultipleChoiceSchema = z.object({
  text: z.string().min(5).max(500),
  type: z.literal("MULTIPLE_CHOICE"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  timeLimit: z.number().int().min(5).max(60).default(20),
  categoryId: z.string(),
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
  explanation: z.string().optional().nullable(),
  imageUrl: z.string().min(1),
  mediaType: z.string().optional().nullable(),
  openAnswer: z.string().optional().nullable(),
  answers: z.array(z.any()).optional(),
});

const QuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceSchema,
  OpenAnswerSchema,
  WordCompletionSchema,
  ImageGuessSchema,
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const difficulty = searchParams.get("difficulty");
  const type = searchParams.get("type");

  const questions = await prisma.question.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      answers: { orderBy: { order: "asc" } },
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = QuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;

  if (data.type === "MULTIPLE_CHOICE" || data.type === "WORD_COMPLETION") {
    const { answers, ...rest } = data;
    const question = await prisma.question.create({
      data: {
        ...rest,
        answers: {
          create: (answers as { text: string; isCorrect: boolean }[]).map((a, i) => ({
            text: a.text,
            isCorrect: a.isCorrect,
            order: i,
          })),
        },
      },
      include: { answers: true, category: true },
    });
    return NextResponse.json({ question });
  }

  // OPEN_ANSWER / IMAGE_GUESS — nessuna risposta predefinita
  const { answers: _ignored, ...rest } = data as { answers?: unknown } & Record<string, unknown>;
  const question = await prisma.question.create({
    data: rest as Parameters<typeof prisma.question.create>[0]["data"],
    include: { answers: true, category: true },
  });
  return NextResponse.json({ question });
}
