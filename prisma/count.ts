import { PrismaClient } from "@prisma/client";
async function main() {
  const p = new PrismaClient();
  const rows = await p.question.groupBy({
    by: ["type", "difficulty"],
    _count: { _all: true },
    orderBy: [{ type: "asc" }, { difficulty: "asc" }],
  });
  console.table(rows.map(r => ({ type: r.type, difficulty: r.difficulty, count: r._count._all })));
  const byDiff = await p.question.groupBy({ by: ["difficulty"], _count: { _all: true } });
  console.log("\nPer difficoltà totali:");
  byDiff.forEach(d => console.log(`  ${d.difficulty}: ${d._count._all}`));
  await p.$disconnect();
}
main();
