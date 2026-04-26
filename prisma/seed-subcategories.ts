/**
 * Seed delle sotto-categorie: crea alcune root + sub comuni.
 * Idempotente: non sovrascrive categorie esistenti (match su slug).
 *
 * Esecuzione: `tsx prisma/seed-subcategories.ts`
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedCat = {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  children?: SeedCat[];
};

const SEED: SeedCat[] = [
  {
    name: "Storia",
    slug: "storia",
    icon: "📜",
    color: "#c2410c",
    children: [
      { name: "Storia Antica", slug: "storia-antica", icon: "🏛️", color: "#c2410c" },
      { name: "Storia Medievale", slug: "storia-medievale", icon: "⚔️", color: "#c2410c" },
      { name: "Storia Moderna", slug: "storia-moderna", icon: "🎩", color: "#c2410c" },
      { name: "Storia Contemporanea", slug: "storia-contemporanea", icon: "📰", color: "#c2410c" },
      { name: "Storia (5 elementare)", slug: "storia-elementare", icon: "🎒", color: "#c2410c" },
    ],
  },
  {
    name: "Geografia",
    slug: "geografia",
    icon: "🌍",
    color: "#059669",
    children: [
      { name: "Italia", slug: "geografia-italia", icon: "🇮🇹", color: "#059669" },
      { name: "Europa", slug: "geografia-europa", icon: "🇪🇺", color: "#059669" },
      { name: "Mondo", slug: "geografia-mondo", icon: "🌐", color: "#059669" },
    ],
  },
  {
    name: "Scienze",
    slug: "scienze",
    icon: "🔬",
    color: "#7c3aed",
    children: [
      { name: "Fisica", slug: "scienze-fisica", icon: "⚛️", color: "#7c3aed" },
      { name: "Chimica", slug: "scienze-chimica", icon: "🧪", color: "#7c3aed" },
      { name: "Biologia", slug: "scienze-biologia", icon: "🧬", color: "#7c3aed" },
      { name: "Astronomia", slug: "scienze-astronomia", icon: "🔭", color: "#7c3aed" },
    ],
  },
  {
    name: "Cultura pop",
    slug: "cultura-pop",
    icon: "🎬",
    color: "#ec4899",
    children: [
      { name: "Cinema", slug: "cinema", icon: "🎥", color: "#ec4899" },
      { name: "Musica", slug: "musica", icon: "🎵", color: "#ec4899" },
      { name: "Serie TV", slug: "serie-tv", icon: "📺", color: "#ec4899" },
      { name: "Videogiochi", slug: "videogiochi", icon: "🎮", color: "#ec4899" },
    ],
  },
  {
    name: "Sport",
    slug: "sport",
    icon: "⚽",
    color: "#0891b2",
    children: [
      { name: "Calcio", slug: "sport-calcio", icon: "⚽", color: "#0891b2" },
      { name: "Tennis", slug: "sport-tennis", icon: "🎾", color: "#0891b2" },
      { name: "Basket", slug: "sport-basket", icon: "🏀", color: "#0891b2" },
      { name: "Olimpiadi", slug: "sport-olimpiadi", icon: "🏅", color: "#0891b2" },
    ],
  },
];

async function upsertCategory(cat: SeedCat, parentId: string | null = null, sortOrder = 0): Promise<void> {
  const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
  let id: string;
  if (existing) {
    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: { name: cat.name, icon: cat.icon, color: cat.color, parentId, sortOrder },
    });
    id = updated.id;
  } else {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        parentId,
        sortOrder,
      },
    });
    id = created.id;
  }
  if (cat.children) {
    for (let i = 0; i < cat.children.length; i++) {
      await upsertCategory(cat.children[i], id, i);
    }
  }
}

async function main() {
  for (let i = 0; i < SEED.length; i++) {
    await upsertCategory(SEED[i], null, i);
  }
  const count = await prisma.category.count();
  console.log(`✅ Seed sotto-categorie completato. Totale categorie in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
