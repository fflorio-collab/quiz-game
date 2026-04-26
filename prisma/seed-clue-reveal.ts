/**
 * Seed CLUE_REVEAL — immagine che si svela progressivamente (blur → nitida).
 * Il player indovina quanto prima possibile. Auto-check su openAnswer.
 * Lancialo con: `npm run db:seed-clue-reveal`
 *
 * imageUrl usa URL Wikimedia Commons Special:FilePath (redirect al file corrente).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Diff = "EASY" | "MEDIUM" | "HARD";
type Entry = {
  catSlug: string;
  text: string;          // istruzione mostrata ai giocatori
  openAnswer: string;    // risposta attesa (auto-check case-insensitive)
  imageUrl: string;
  difficulty: Diff;
};

const wiki = (filename: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;

const ENTRIES: Entry[] = [
  // Storia — personaggi riconoscibili dal volto
  { catSlug: "storia", text: "Chi è nella foto che si sta svelando?", openAnswer: "Albert Einstein",
    imageUrl: wiki("Einstein_1921_by_F_Schmutzer_-_restoration.jpg"), difficulty: "EASY" },
  { catSlug: "storia", text: "Chi è il personaggio?", openAnswer: "Napoleone Bonaparte",
    imageUrl: wiki("Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg"), difficulty: "EASY" },
  { catSlug: "storia", text: "Riconosci il volto?", openAnswer: "Mahatma Gandhi",
    imageUrl: wiki("Mahatma-Gandhi,_studio,_1931.jpg"), difficulty: "EASY" },
  { catSlug: "storia", text: "Chi è il personaggio storico?", openAnswer: "Winston Churchill",
    imageUrl: wiki("Sir_Winston_Churchill_-_19086236948.jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Chi è ritratto?", openAnswer: "Nelson Mandela",
    imageUrl: wiki("Nelson_Mandela-2008_(edit).jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Di chi è il volto?", openAnswer: "Che Guevara",
    imageUrl: wiki("CheHigh.jpg"), difficulty: "MEDIUM" },

  // Geografia — luoghi iconici
  { catSlug: "geografia", text: "Quale luogo si sta svelando?", openAnswer: "Torre Eiffel",
    imageUrl: wiki("Tour_Eiffel_Wikimedia_Commons_(cropped).jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Dov'è questo posto?", openAnswer: "Colosseo",
    imageUrl: wiki("Colosseo_2020.jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Quale monumento è?", openAnswer: "Statua della Libertà",
    imageUrl: wiki("Statue_of_Liberty_7.jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Riconosci il luogo?", openAnswer: "Machu Picchu",
    imageUrl: wiki("80_-_Machu_Picchu_-_Juin_2009_-_edit.2.jpg"), difficulty: "MEDIUM" },

  // Arte e Cultura — opere famose
  { catSlug: "arte-cultura", text: "Quale dipinto si sta svelando?", openAnswer: "Gioconda",
    imageUrl: wiki("Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg"), difficulty: "EASY" },
  { catSlug: "arte-cultura", text: "Quale quadro è?", openAnswer: "Notte Stellata",
    imageUrl: wiki("Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale opera di Munch è?", openAnswer: "L'Urlo",
    imageUrl: wiki("The_Scream.jpg"), difficulty: "EASY" },
  { catSlug: "arte-cultura", text: "Quale scultura si rivela?", openAnswer: "David",
    imageUrl: wiki("'David'_by_Michelangelo_JBU0001.JPG"), difficulty: "MEDIUM" },

  // Scienza — scienziati celebri
  { catSlug: "scienza", text: "Quale scienziato è?", openAnswer: "Isaac Newton",
    imageUrl: wiki("Sir_Isaac_Newton_(1643-1727).jpg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Chi è lo scienziato ritratto?", openAnswer: "Marie Curie",
    imageUrl: wiki("Marie_Curie_c._1920s.jpg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Di chi è il volto?", openAnswer: "Stephen Hawking",
    imageUrl: wiki("Stephen_Hawking.StarChild.jpg"), difficulty: "MEDIUM" },

  // Sport — atleti iconici
  { catSlug: "sport", text: "Chi è l'atleta?", openAnswer: "Muhammad Ali",
    imageUrl: wiki("Muhammad_Ali_NYWTS.jpg"), difficulty: "MEDIUM" },
  { catSlug: "sport", text: "Riconosci lo sportivo?", openAnswer: "Usain Bolt",
    imageUrl: wiki("Usain_Bolt_Rio_100m_final_2016k.jpg"), difficulty: "EASY" },

  // Cinema — personaggi iconici (tramite locandine/foto)
  { catSlug: "cinema", text: "Quale logo si sta rivelando?", openAnswer: "Star Wars",
    imageUrl: wiki("Star_Wars_Logo.svg"), difficulty: "EASY" },
  { catSlug: "cinema", text: "Quale saga?", openAnswer: "Harry Potter",
    imageUrl: wiki("Harry_Potter_wordmark.svg"), difficulty: "EASY" },
  { catSlug: "cinema", text: "Quale franchise?", openAnswer: "Marvel",
    imageUrl: wiki("Marvel_Logo.svg"), difficulty: "EASY" },
];

async function main() {
  console.log(`🌱 Seed CLUE_REVEAL — ${ENTRIES.length} domande\n`);

  let created = 0;
  let skipped = 0;
  let missCat = 0;

  for (const e of ENTRIES) {
    const cat = await prisma.category.findUnique({ where: { slug: e.catSlug } });
    if (!cat) { missCat++; continue; }

    const exists = await prisma.question.findFirst({
      where: { categoryId: cat.id, type: "CLUE_REVEAL", openAnswer: e.openAnswer, imageUrl: e.imageUrl },
    });
    if (exists) { skipped++; continue; }

    await prisma.question.create({
      data: {
        text: e.text,
        type: "CLUE_REVEAL",
        difficulty: e.difficulty,
        timeLimit: 30,
        categoryId: cat.id,
        openAnswer: e.openAnswer,
        imageUrl: e.imageUrl,
        mediaType: "image",
      },
    });
    created++;
  }

  const total = await prisma.question.count({ where: { type: "CLUE_REVEAL" } });
  console.log(`✅ Create: ${created}, saltate: ${skipped}, categoria mancante: ${missCat}`);
  console.log(`📊 Totale CLUE_REVEAL nel DB: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
