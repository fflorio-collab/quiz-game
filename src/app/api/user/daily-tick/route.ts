import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Endpoint chiamato dal client (es. dalla home o dal profilo) per aggiornare la
 * daily streak: se l'ultimo login era IERI → streak++; se più vecchio → reset a 1;
 * se OGGI → nessun cambio. Sempre idempotente.
 */
export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User non trovato" }, { status: 404 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  let newStreak = user.dailyStreak;
  if (!last) {
    newStreak = 1;
  } else {
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((today.getTime() - last.getTime()) / dayMs);
    if (diffDays === 0) {
      // già toccato oggi
    } else if (diffDays === 1) {
      newStreak = user.dailyStreak + 1;
    } else {
      newStreak = 1;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { dailyStreak: newStreak, lastLoginDate: new Date() },
  });

  return NextResponse.json({ dailyStreak: updated.dailyStreak });
}
