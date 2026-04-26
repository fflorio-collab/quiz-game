import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import {
  QUESTION_TYPE_META,
  isQuestionType,
  expectedAnswersCount,
  type QuestionType,
} from "@/lib/questionTypes";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.question.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

type AnswerInput = { text: string; isCorrect?: boolean };

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const {
    text, type, difficulty, timeLimit, points, answers, openAnswer,
    imageUrl, mediaType, explanation, wordTemplate,
  } = body as {
    text?: string; type?: string; difficulty?: string; timeLimit?: number;
    points?: number; answers?: AnswerInput[]; openAnswer?: string | null;
    imageUrl?: string | null; mediaType?: string | null;
    explanation?: string | null; wordTemplate?: string | null;
  };

  if (!type || !isQuestionType(type)) {
    return NextResponse.json({ error: "Tipo domanda non valido" }, { status: 400 });
  }
  const meta = QUESTION_TYPE_META[type as QuestionType];

  // Validazione: se il tipo richiede openAnswer/wordTemplate/media e non lo hai, rifiuta.
  if (meta.requiresOpenAnswer && !openAnswer) {
    return NextResponse.json({ error: "openAnswer richiesto per questo tipo" }, { status: 400 });
  }
  if (meta.requiresWordTemplate && !wordTemplate) {
    return NextResponse.json({ error: "wordTemplate richiesto per questo tipo" }, { status: 400 });
  }
  if (meta.requiresMedia && !imageUrl) {
    return NextResponse.json({ error: "imageUrl richiesto per questo tipo" }, { status: 400 });
  }

  // Validazione answers coerente con storedAnswers del tipo
  const expected = expectedAnswersCount(type as QuestionType);
  if (expected) {
    if (!Array.isArray(answers) || answers.length < expected.min || answers.length > expected.max) {
      return NextResponse.json(
        { error: `Servono tra ${expected.min} e ${expected.max} risposte/elementi per questo tipo` },
        { status: 400 }
      );
    }
    if (type === "MULTIPLE_CHOICE" && answers.filter((a) => a.isCorrect).length !== 1) {
      return NextResponse.json({ error: "Serve esattamente una risposta corretta" }, { status: 400 });
    }
  }

  // `points` è opzionale: accettiamo solo valori validi (100-10000), altrimenti lasciamo il valore precedente.
  const validPoints = typeof points === "number" && points >= 100 && points <= 10000
    ? Math.round(points)
    : undefined;

  await prisma.question.update({
    where: { id: params.id },
    data: {
      text, type, difficulty, timeLimit,
      ...(validPoints !== undefined ? { points: validPoints } : {}),
      openAnswer: meta.requiresOpenAnswer || openAnswer !== undefined ? openAnswer ?? null : null,
      wordTemplate: meta.requiresWordTemplate ? wordTemplate ?? null : null,
      imageUrl, mediaType, explanation,
    },
  });

  // Ricostruisce le Answer[] in modo coerente col tipo.
  if (meta.storedAnswers !== "none" && Array.isArray(answers)) {
    await prisma.answer.deleteMany({ where: { questionId: params.id } });
    await prisma.answer.createMany({
      data: answers.map((a, i) => ({
        questionId: params.id,
        text: a.text,
        isCorrect: a.isCorrect ?? false,
        order: i,
      })),
    });
  } else if (meta.storedAnswers === "none") {
    // Il tipo non ha Answer[]: rimuovi eventuali vecchie risposte rimaste da un tipo precedente.
    await prisma.answer.deleteMany({ where: { questionId: params.id } });
  }

  const updated = await prisma.question.findUnique({
    where: { id: params.id },
    include: { answers: true, category: true },
  });
  return NextResponse.json({ question: updated });
}
