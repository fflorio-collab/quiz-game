import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { questions: true } },
    },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, slug, icon, color } = await req.json();
  if (!name || !slug) {
    return NextResponse.json(
      { error: "name e slug sono obbligatori" },
      { status: 400 }
    );
  }
  try {
    const category = await prisma.category.create({
      data: { name, slug, icon, color },
    });
    return NextResponse.json({ category });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Categoria già esistente (nome o slug duplicato)" }, { status: 409 });
    }
    console.error("Errore creazione categoria:", e);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
