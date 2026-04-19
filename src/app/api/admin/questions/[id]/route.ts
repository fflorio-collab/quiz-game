import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.question.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { text, type, difficulty, timeLimit, answers, openAnswer, imageUrl, mediaType, explanation } = await req.json();

  await prisma.question.update({
    where: { id: params.id },
    data: { text, type, difficulty, timeLimit, openAnswer, imageUrl, mediaType, explanation },
  });

  if (type === "MULTIPLE_CHOICE" && Array.isArray(answers) && answers.length === 4) {
    await prisma.answer.deleteMany({ where: { questionId: params.id } });
    await prisma.answer.createMany({
      data: answers.map((a: any, i: number) => ({
        questionId: params.id,
        text: a.text,
        isCorrect: a.isCorrect,
        order: i,
      })),
    });
  } else if (type === "OPEN_ANSWER") {
    await prisma.answer.deleteMany({ where: { questionId: params.id } });
  }

  const updated = await prisma.question.findUnique({
    where: { id: params.id },
    include: { answers: true, category: true },
  });
  return NextResponse.json({ question: updated });
}
