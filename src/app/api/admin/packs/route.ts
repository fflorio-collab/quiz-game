// CRUD QuestionPack — lato admin.
// GET   /api/admin/packs           → elenca tutti i pack (admin vede anche i privati)
// POST  /api/admin/packs           → crea un nuovo pack (chiunque autenticato; visibilità configurabile)
//
// I pack sono "macro categorie": collezioni curate di domande per un evento o tema.
// Una domanda può stare in più pack e resta nel DB generale (filtro categoria standard).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { z } from "zod";

const CreatePackSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "slug può contenere solo lettere minuscole, cifre e trattini"),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().datetime().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(20).optional().nullable(),
  coverUrl: z.string().url().max(500).optional().nullable(),
  isPublic: z.boolean().default(false),
});

export async function GET() {
  // L'admin vede tutto. Chiunque registrato vede i pubblici + i propri.
  const session = await auth();
  if (!isAdmin() && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = isAdmin()
    ? {}
    : { OR: [{ isPublic: true }, { creatorId: session?.user?.id ?? "" }] };

  const packs = await prisma.questionPack.findMany({
    where,
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { questions: true } },
      creator: { select: { id: true, username: true, displayName: true } },
    },
  });
  return NextResponse.json({ packs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin() && !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const parsed = CreatePackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Payload non valido" }, { status: 400 });
  }

  // Slug unico: se collide, restituisco errore (l'utente decide il nuovo slug).
  const exists = await prisma.questionPack.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) {
    return NextResponse.json({ error: "Slug già in uso" }, { status: 409 });
  }

  const pack = await prisma.questionPack.create({
    data: {
      ...parsed.data,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      creatorId: session?.user?.id ?? null,
    },
  });
  return NextResponse.json({ pack }, { status: 201 });
}
