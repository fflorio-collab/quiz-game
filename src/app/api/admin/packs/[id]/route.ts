// CRUD singolo QuestionPack.
// GET    /api/admin/packs/:id   → dettagli pack + domande contenute
// PUT    /api/admin/packs/:id   → aggiorna metadata
// DELETE /api/admin/packs/:id   → elimina pack (le domande NON vengono cancellate)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { z } from "zod";

const UpdatePackSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().datetime().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(20).optional().nullable(),
  coverUrl: z.string().url().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});

// Verifica che il chiamante possa leggere/modificare il pack:
// - admin: tutto
// - utente registrato: pack pubblici (read), pack propri (read+write)
async function authorize(packId: string, write: boolean) {
  const session = await auth();
  const userIsAdmin = isAdmin();
  if (!userIsAdmin && !session?.user?.id) return { ok: false as const, status: 401, error: "Unauthorized" };

  const pack = await prisma.questionPack.findUnique({ where: { id: packId } });
  if (!pack) return { ok: false as const, status: 404, error: "Pack non trovato" };

  if (userIsAdmin) return { ok: true as const, pack, session };
  if (write) {
    if (pack.creatorId !== session!.user!.id) return { ok: false as const, status: 403, error: "Non autorizzato" };
  } else {
    if (!pack.isPublic && pack.creatorId !== session!.user!.id) return { ok: false as const, status: 403, error: "Non autorizzato" };
  }
  return { ok: true as const, pack, session };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth0 = await authorize(id, false);
  if (!auth0.ok) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  const pack = await prisma.questionPack.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          question: {
            include: {
              category: true,
              answers: { orderBy: { order: "asc" } },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
      creator: { select: { id: true, username: true, displayName: true } },
      _count: { select: { questions: true } },
    },
  });
  return NextResponse.json({ pack });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth0 = await authorize(id, true);
  if (!auth0.ok) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON non valido" }, { status: 400 }); }

  const parsed = UpdatePackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Payload non valido" }, { status: 400 });

  const pack = await prisma.questionPack.update({
    where: { id },
    data: {
      ...parsed.data,
      eventDate: parsed.data.eventDate === undefined ? undefined : parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
    },
  });
  return NextResponse.json({ pack });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth0 = await authorize(id, true);
  if (!auth0.ok) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  // Le domande NON vengono cancellate, solo le righe di QuestionInPack via cascade.
  await prisma.questionPack.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
