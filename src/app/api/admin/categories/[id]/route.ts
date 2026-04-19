import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, slug, icon, color } = await req.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "name e slug sono obbligatori" }, { status: 400 });
  }
  try {
    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name, slug, icon, color },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Nome o slug già in uso" }, { status: 409 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Impossibile eliminare la categoria" }, { status: 400 });
  }
}
