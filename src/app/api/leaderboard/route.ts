import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty");

  const top = await prisma.leaderboard.findMany({
    where: difficulty ? { difficulty } : {},
    orderBy: { score: "desc" },
    take: 50,
  });
  return NextResponse.json({ leaderboard: top });
}
