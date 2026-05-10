// Aggiunge/rimuove domande da un pack.
// POST   /api/admin/packs/:id/questions   { questionIds: string[] }   → aggiunge (idempotente)
// DELETE /api/admin/packs/:id/questions   { questionIds: string[] }   → rimuove

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(500),
});

async function canWrite(packId: string) {
  const session = await auth();
  const userIsAdmin = isAdmin();
  if (!userIsAdmin && !session?.user?.id) return { ok: false as const, status: 401, error: "Unauthorized" };

  const pack = await prisma.questionPack.findUnique({ where: { id: packId } });
  if (!pack) return { ok: false as const, status: 404, error: "Pack non trovato" };
  if (!userIsAdmin && pack.creatorId !== session!.user!.id) {
    return { ok: false as const, status: 403, error: "Non autorizzato" };
  }
  return { ok: true as const };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await canWrite(id);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON non valido" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Payload non valido" }, { status: 400 });

  // SQLite non supporta `skipDuplicates` su createMany: usiamo upsert per ogni riga.
  // È idempotente — se la domanda è già nel pack, non fa nulla.
  let added = 0;
  for (const questionId of parsed.data.questionIds) {
    const r = await prisma.questionInPack.upsert({
      where: { packId_questionId: { packId: id, questionId } },
      create: { packId: id, questionId },
      update: {}, // no-op se già presente
    }).catch(() => null);
    if (r) added++;
  }
  return NextResponse.json({ added });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await canWrite(id);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON non valido" }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Payload non valido" }, { status: 400 });

  const result = await prisma.questionInPack.deleteMany({
    where: { packId: id, questionId: { in: parsed.data.questionIds } },
  });
  return NextResponse.json({ removed: result.count });
}
