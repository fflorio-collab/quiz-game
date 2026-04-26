import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint pubblico: ricerca domande per il picker lato host.
 * Non protetto da admin password (serve al flow host), ma limitato da page size.
 *
 * Query params:
 *  - type: QuestionType (singolo)
 *  - difficulty: EASY|MEDIUM|HARD (opzionale; "ALL" o mancante = tutte)
 *  - categoryIds: CSV di id (includi root+sub già espanse lato client)
 *  - search: testo (contains case-insensitive sul campo `text`)
 *  - limit: 1-200 (default 100)
 *  - offset: default 0
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const difficulty = url.searchParams.get("difficulty");
  const categoryIdsCsv = url.searchParams.get("categoryIds") || "";
  const search = url.searchParams.get("search") || "";
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  const categoryIds = categoryIdsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const where: {
    type?: string;
    difficulty?: string;
    categoryId?: { in: string[] };
    text?: { contains: string };
  } = {};
  if (type) where.type = type;
  if (difficulty && difficulty !== "ALL") where.difficulty = difficulty;
  if (categoryIds.length > 0) where.categoryId = { in: categoryIds };
  if (search) where.text = { contains: search };

  const [total, rows] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        category: { select: { name: true, icon: true, color: true } },
        _count: { select: { answers: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    items: rows.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      category: q.category,
      answersCount: q._count.answers,
    })),
  });
}
