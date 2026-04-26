/**
 * Seed dei Badge: sincronizza la tabella Badge con BADGE_DEFS del motore gamification.
 * Idempotente (upsert per slug).
 */
import { PrismaClient } from "@prisma/client";
import { BADGE_DEFS } from "../src/lib/gamification/badges";

const prisma = new PrismaClient();

async function main() {
  for (const def of BADGE_DEFS) {
    await prisma.badge.upsert({
      where: { slug: def.slug },
      update: { name: def.name, description: def.description, icon: def.icon, rarity: def.rarity },
      create: { slug: def.slug, name: def.name, description: def.description, icon: def.icon, rarity: def.rarity },
    });
  }
  const count = await prisma.badge.count();
  console.log(`✅ Seed badge completato. Totale badge in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
