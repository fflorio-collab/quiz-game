import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Endpoint pubblico: elenco categorie con conteggi per tipo e difficoltà.
// Ritorna sia la lista flat (retrocompat) sia l'albero root → children.
export async function GET() {
  const all = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { questions: true } } },
  });

  // Conteggi aggregati per tipo × difficoltà (per l'intero DB, non per categoria)
  const countsByType = await prisma.question.groupBy({
    by: ["type", "difficulty"],
    _count: { _all: true },
  });

  // Costruzione albero: root (parentId null) → children
  type CatRow = (typeof all)[number];
  type Node = {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
    parentId: string | null;
    count: number;          // domande direttamente in questa categoria
    totalCount: number;     // domande qui + in tutte le discendenti
    children: Node[];
  };
  const byId = new Map<string, Node>();
  for (const c of all) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      count: c._count.questions,
      totalCount: c._count.questions,
      children: [],
    });
  }
  const roots: Node[] = [];
  for (const c of all) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Propaga totalCount su root sommando figli
  for (const root of roots) {
    const sumChildren = (n: Node): number => {
      let s = n.count;
      for (const ch of n.children) s += sumChildren(ch);
      n.totalCount = s;
      return s;
    };
    sumChildren(root);
  }

  return NextResponse.json({
    categories: all, // retrocompat: lista flat
    tree: roots,      // nuovo: albero gerarchico con totalCount
    counts: countsByType.map((c: { type: string; difficulty: string; _count: { _all: number } }) => ({
      type: c.type,
      difficulty: c.difficulty,
      count: c._count._all,
    })),
  });
}
