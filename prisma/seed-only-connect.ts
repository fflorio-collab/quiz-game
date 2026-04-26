/**
 * Seed ONLY_CONNECT — 4 elementi che condividono un collegamento comune.
 * L'host giudica la risposta (il "link") data a voce dai giocatori.
 * Lancialo con: `npm run db:seed-only-connect`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = {
  catSlug: string;
  prompt: string;                           // istruzione ai giocatori (es. "Trova il collegamento")
  items: [string, string, string, string];  // 4 elementi mostrati
  link: string;                              // la risposta (riferimento per il giudizio host)
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

const ENTRIES: Entry[] = [
  // Geografia
  { catSlug: "geografia", prompt: "Cosa hanno in comune?",
    items: ["Roma", "Atene", "Berlino", "Madrid"], link: "Capitali europee", difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Cosa hanno in comune?",
    items: ["Po", "Tevere", "Arno", "Adige"], link: "Fiumi italiani", difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Cosa hanno in comune?",
    items: ["Etna", "Vesuvio", "Stromboli", "Vulcano"], link: "Vulcani italiani", difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Cosa hanno in comune?",
    items: ["Sicilia", "Sardegna", "Creta", "Cipro"], link: "Isole del Mediterraneo", difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Cosa hanno in comune?",
    items: ["Nilo", "Amazzoni", "Yangtze", "Mississippi"], link: "Fiumi più lunghi del mondo", difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Cosa hanno in comune?",
    items: ["Everest", "K2", "Kangchenjunga", "Lhotse"], link: "Montagne dell'Himalaya (8000+ metri)", difficulty: "HARD" },

  // Storia
  { catSlug: "storia", prompt: "Cosa hanno in comune?",
    items: ["Cesare", "Augusto", "Nerone", "Traiano"], link: "Imperatori romani", difficulty: "EASY" },
  { catSlug: "storia", prompt: "Cosa hanno in comune?",
    items: ["Napoleone", "Hitler", "Stalin", "Mussolini"], link: "Dittatori del XX-XIX secolo", difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Cosa hanno in comune?",
    items: ["Leonardo", "Michelangelo", "Donatello", "Raffaello"], link: "Artisti del Rinascimento italiano", difficulty: "EASY" },
  { catSlug: "storia", prompt: "Cosa hanno in comune?",
    items: ["Marco Polo", "Cristoforo Colombo", "Vasco da Gama", "Magellano"], link: "Esploratori", difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Cosa hanno in comune?",
    items: ["1789", "1917", "1776", "1949"], link: "Anni di rivoluzioni", difficulty: "HARD" },

  // Scienza
  { catSlug: "scienza", prompt: "Cosa hanno in comune?",
    items: ["Idrogeno", "Elio", "Litio", "Boro"], link: "Primi elementi della tavola periodica", difficulty: "MEDIUM" },
  { catSlug: "scienza", prompt: "Cosa hanno in comune?",
    items: ["Mercurio", "Venere", "Terra", "Marte"], link: "Pianeti rocciosi del sistema solare", difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Cosa hanno in comune?",
    items: ["Einstein", "Newton", "Galileo", "Hawking"], link: "Fisici celebri", difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Cosa hanno in comune?",
    items: ["Cuore", "Fegato", "Reni", "Polmoni"], link: "Organi interni umani", difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Cosa hanno in comune?",
    items: ["Oro", "Argento", "Rame", "Platino"], link: "Metalli preziosi / conduttori", difficulty: "MEDIUM" },

  // Arte e Cultura
  { catSlug: "arte-cultura", prompt: "Cosa hanno in comune?",
    items: ["Inferno", "Purgatorio", "Paradiso", "Vita Nuova"], link: "Opere di Dante", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Cosa hanno in comune?",
    items: ["Amleto", "Macbeth", "Otello", "Re Lear"], link: "Tragedie di Shakespeare", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Cosa hanno in comune?",
    items: ["Gioconda", "Ultima Cena", "Vitruviano", "Annunciazione"], link: "Opere di Leonardo da Vinci", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Cosa hanno in comune?",
    items: ["Verdi", "Puccini", "Rossini", "Bellini"], link: "Compositori italiani d'opera", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Cosa hanno in comune?",
    items: ["Guernica", "Les Demoiselles d'Avignon", "La Vita", "Il Vecchio Chitarrista"], link: "Opere di Picasso", difficulty: "HARD" },

  // Sport
  { catSlug: "sport", prompt: "Cosa hanno in comune?",
    items: ["Messi", "Maradona", "Pelé", "Cristiano Ronaldo"], link: "Calciatori leggendari", difficulty: "EASY" },
  { catSlug: "sport", prompt: "Cosa hanno in comune?",
    items: ["Wimbledon", "Roland Garros", "US Open", "Australian Open"], link: "Tornei di tennis Slam", difficulty: "EASY" },
  { catSlug: "sport", prompt: "Cosa hanno in comune?",
    items: ["Milan", "Inter", "Juventus", "Napoli"], link: "Squadre di Serie A (campioni d'Italia)", difficulty: "EASY" },
  { catSlug: "sport", prompt: "Cosa hanno in comune?",
    items: ["Bolt", "Lewis", "Owens", "Greene"], link: "Velocisti sui 100 metri", difficulty: "MEDIUM" },
  { catSlug: "sport", prompt: "Cosa hanno in comune?",
    items: ["Rosso", "Giallo", "Nero", "Bianco"], link: "Colori dei cerchi olimpici (+ bianco dello sfondo)", difficulty: "HARD" },

  // Cinema
  { catSlug: "cinema", prompt: "Cosa hanno in comune?",
    items: ["Il Padrino", "Quarto Potere", "Casablanca", "Via col vento"], link: "Classici del cinema", difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: "Cosa hanno in comune?",
    items: ["Titanic", "Avatar", "Terminator", "Aliens"], link: "Film di James Cameron", difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: "Cosa hanno in comune?",
    items: ["Frodo", "Harry", "Luke", "Neo"], link: "Protagonisti scelti da un destino / prescelti", difficulty: "HARD" },
  { catSlug: "cinema", prompt: "Cosa hanno in comune?",
    items: ["Pulp Fiction", "Kill Bill", "Bastardi senza gloria", "Django Unchained"], link: "Film di Tarantino", difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: "Cosa hanno in comune?",
    items: ["Marlon Brando", "Al Pacino", "Robert De Niro", "James Caan"], link: "Attori de Il Padrino", difficulty: "HARD" },
];

async function main() {
  console.log(`🌱 Seed ONLY_CONNECT — ${ENTRIES.length} domande\n`);

  let created = 0;
  let skipped = 0;
  let missCat = 0;

  for (const e of ENTRIES) {
    const cat = await prisma.category.findUnique({ where: { slug: e.catSlug } });
    if (!cat) { missCat++; continue; }

    const exists = await prisma.question.findFirst({
      where: { categoryId: cat.id, type: "ONLY_CONNECT", text: e.prompt, openAnswer: e.link },
    });
    if (exists) { skipped++; continue; }

    await prisma.question.create({
      data: {
        text: e.prompt,
        type: "ONLY_CONNECT",
        difficulty: e.difficulty,
        timeLimit: 45,
        categoryId: cat.id,
        openAnswer: e.link,
        answers: {
          create: e.items.map((x, i) => ({ text: x, isCorrect: false, order: i })),
        },
      },
    });
    created++;
  }

  const total = await prisma.question.count({ where: { type: "ONLY_CONNECT" } });
  console.log(`✅ Create: ${created}, saltate: ${skipped}, categoria mancante: ${missCat}`);
  console.log(`📊 Totale ONLY_CONNECT nel DB: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
