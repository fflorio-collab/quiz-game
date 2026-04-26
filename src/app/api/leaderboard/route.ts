import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leaderboard
//   ?difficulty=EASY|MEDIUM|HARD   filtra per difficoltà
//   ?mode=<famiglia>               filtra per modalità (matching esatto o inizio, es. "Speedrun" matcha "Speedrun 60s")
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty");
  const mode = searchParams.get("mode");

  const top = await prisma.leaderboard.findMany({
    where: {
      ...(difficulty ? { difficulty } : {}),
      ...(mode
        ? { OR: [{ gameMode: mode }, { gameMode: { startsWith: `${mode} ` } }, { gameMode: { startsWith: `${mode}(` } }] }
        : {}),
    },
    orderBy: { score: "desc" },
    take: 50,
  });
  return NextResponse.json({ leaderboard: top });
}
