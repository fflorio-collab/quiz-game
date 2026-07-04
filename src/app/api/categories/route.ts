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

  // Conteggi per categoria × tipo (per mostrare, in setup, quante domande di uno
  // specifico tipo — es. MULTIPLE_CHOICE — sono disponibili per ogni categoria).
  const perCategoryType = await prisma.question.groupBy({
    by: ["categoryId", "type"],
    _count: { _all: true },
  });
  const byCatType = new Map<string, Record<string, number>>();
  for (const row of perCategoryType) {
    const m = byCatType.get(row.categoryId) ?? {};
    m[row.type] = row._count._all;
    byCatType.set(row.categoryId, m);
  }

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
    countByType: Record<string, number>;       // domande dirette, per tipo
    totalCountByType: Record<string, number>;  // domande qui + discendenti, per tipo
    children: Node[];
  };
  const byId = new Map<string, Node>();
  for (const c of all) {
    const ct = byCatType.get(c.id) ?? {};
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      count: c._count.questions,
      totalCount: c._count.questions,
      countByType: { ...ct },
      totalCountByType: { ...ct },
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
  // Propaga totalCount (globale e per tipo) su root sommando i figli
  for (const root of roots) {
    const aggregate = (n: Node): { total: number; byType: Record<string, number> } => {
      let s = n.count;
      const bt: Record<string, number> = { ...n.countByType };
      for (const ch of n.children) {
        const res = aggregate(ch);
        s += res.total;
        for (const [t, v] of Object.entries(res.byType)) bt[t] = (bt[t] ?? 0) + v;
      }
      n.totalCount = s;
      n.totalCountByType = bt;
      return { total: s, byType: bt };
    };
    aggregate(root);
  }

  return NextResponse.json({
    // retrocompat: lista flat, arricchita con i conteggi diretti per tipo
    categories: all.map((c) => ({ ...c, countByType: byCatType.get(c.id) ?? {} })),
    tree: roots,      // nuovo: albero gerarchico con totalCount
    counts: countsByType.map((c: { type: string; difficulty: string; _count: { _all: number } }) => ({
      type: c.type,
      difficulty: c.difficulty,
      count: c._count._all,
    })),
  });
}
