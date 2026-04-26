/**
 * Seed REACTION_CHAIN — parole con 3 indizi progressivi.
 * Il primo è vago, l'ultimo è il più diretto.
 * Lancialo con: `npx tsx prisma/seed-reaction.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = {
  catSlug: string;          // slug categoria (deve esistere)
  prompt: string;           // istruzione mostrata ai giocatori
  word: string;             // parola da indovinare
  clues: [string, string, string]; // 3 indizi progressivi
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

const ENTRIES: Entry[] = [
  // Geografia
  { catSlug: "geografia", prompt: "Indovina la città", word: "NAPOLI",
    clues: ["Si affaccia su un golfo italiano", "Famosa per la pizza", "È dominata dal Vesuvio"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina la città", word: "VENEZIA",
    clues: ["Costruita sull'acqua", "Piazza San Marco", "Gondole e ponte dei sospiri"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina il paese", word: "GIAPPONE",
    clues: ["Arcipelago dell'Asia orientale", "Sushi e samurai", "Monte Fuji e Tokyo"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina il paese", word: "EGITTO",
    clues: ["Attraversato dal fiume più famoso", "Piramidi di Giza", "Cleopatra ne era regina"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina il paese", word: "AUSTRALIA",
    clues: ["È un continente e uno stato", "Canguri e koala", "Sydney Opera House"], difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Indovina la capitale", word: "LISBONA",
    clues: ["Capitale europea sull'oceano", "Tram gialli e pastéis de nata", "Capitale del Portogallo"], difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Indovina la regione", word: "TOSCANA",
    clues: ["Regione italiana", "Colline con cipressi e Chianti", "Firenze è il capoluogo"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina il paese", word: "ISLANDA",
    clues: ["Isola del nord Europa", "Vulcani attivi e aurora boreale", "Reykjavik è la capitale"], difficulty: "MEDIUM" },

  // Storia
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "NAPOLEONE",
    clues: ["Generale diventato imperatore", "Esiliato a Sant'Elena", "Sconfitto a Waterloo"], difficulty: "EASY" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "CESARE",
    clues: ["Generale romano", "Attraversò il Rubicone", "Ucciso alle Idi di Marzo"], difficulty: "EASY" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "COLOMBO",
    clues: ["Navigatore del XV secolo", "Partì da Palos nel 1492", "Scoprì l'America"], difficulty: "EASY" },
  { catSlug: "storia", prompt: "Indovina l'evento", word: "RINASCIMENTO",
    clues: ["Periodo storico-culturale", "XIV-XVI secolo", "Leonardo, Michelangelo e l'uomo vitruviano"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "GARIBALDI",
    clues: ["Eroe dei due mondi", "Camicia rossa", "Spedizione dei Mille"], difficulty: "MEDIUM" },

  // Scienza
  { catSlug: "scienza", prompt: "Indovina lo scienziato", word: "EINSTEIN",
    clues: ["Fisico tedesco", "Capelli bianchi spettinati", "E = mc²"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina l'elemento", word: "IDROGENO",
    clues: ["Gas leggerissimo", "Primo della tavola periodica", "Simbolo H, numero atomico 1"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina il pianeta", word: "SATURNO",
    clues: ["Pianeta del sistema solare", "Gassoso e giallognolo", "Famoso per i suoi anelli"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina l'animale", word: "BALENA",
    clues: ["Mammifero marino", "Il più grande del mondo", "La varietà azzurra è la più grossa"], difficulty: "MEDIUM" },
  { catSlug: "scienza", prompt: "Indovina l'organo", word: "FEGATO",
    clues: ["Organo addominale", "Produce la bile", "Si rigenera da solo"], difficulty: "MEDIUM" },

  // Arte e Cultura
  { catSlug: "arte-cultura", prompt: "Indovina l'opera", word: "GIOCONDA",
    clues: ["Dipinto famosissimo", "Esposto al Louvre di Parigi", "Leonardo da Vinci · sorriso enigmatico"], difficulty: "EASY" },
  { catSlug: "arte-cultura", prompt: "Indovina l'autore", word: "DANTE",
    clues: ["Poeta del Medioevo", "Nato a Firenze", "Autore della Divina Commedia"], difficulty: "EASY" },
  { catSlug: "arte-cultura", prompt: "Indovina il compositore", word: "BEETHOVEN",
    clues: ["Compositore tedesco", "Divenne sordo in età adulta", "Nona sinfonia e Inno alla gioia"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina l'opera", word: "ILIADE",
    clues: ["Poema epico greco", "Attribuito a Omero", "Narra l'assedio di Troia"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina l'autore", word: "SHAKESPEARE",
    clues: ["Drammaturgo inglese", "XVI-XVII secolo", "Romeo e Giulietta, Amleto, Macbeth"], difficulty: "MEDIUM" },

  // Sport
  { catSlug: "sport", prompt: "Indovina lo sportivo", word: "MESSI",
    clues: ["Calciatore argentino", "Ha vinto tanti Palloni d'Oro", "Campione del mondo 2022"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina lo sport", word: "TENNIS",
    clues: ["Sport con racchetta", "Si gioca su vari tipi di campo", "Wimbledon, Roland Garros, US Open"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina il torneo", word: "OLIMPIADI",
    clues: ["Si tiene ogni 4 anni", "Fiamma e cinque cerchi", "Nacquero nell'antica Grecia"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina lo sportivo", word: "BOLT",
    clues: ["Velocista giamaicano", "Record mondiale sui 100 metri", "Soprannominato Lightning"], difficulty: "MEDIUM" },

  // Cinema
  { catSlug: "cinema", prompt: "Indovina il film", word: "TITANIC",
    clues: ["Film del 1997", "Di James Cameron", "DiCaprio, Winslet, iceberg"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina il personaggio", word: "BATMAN",
    clues: ["Supereroe DC", "Vigilante mascherato", "Opera a Gotham City"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina la saga", word: "STARWARS",
    clues: ["Franchise di fantascienza", "Spade laser e Jedi", "Darth Vader è tuo padre"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina il regista", word: "SPIELBERG",
    clues: ["Regista americano", "Dietro la macchina da presa di E.T.", "Jurassic Park, Lista di Schindler"], difficulty: "MEDIUM" },
];

async function main() {
  console.log(`🌱 Seed REACTION_CHAIN — ${ENTRIES.length} domande\n`);

  let created = 0;
  let skipped = 0;
  let missCat = 0;

  for (const e of ENTRIES) {
    const cat = await prisma.category.findUnique({ where: { slug: e.catSlug } });
    if (!cat) { missCat++; continue; }

    const exists = await prisma.question.findFirst({
      where: { categoryId: cat.id, type: "REACTION_CHAIN", openAnswer: e.word },
    });
    if (exists) { skipped++; continue; }

    await prisma.question.create({
      data: {
        text: e.prompt,
        type: "REACTION_CHAIN",
        difficulty: e.difficulty,
        timeLimit: 30,
        categoryId: cat.id,
        openAnswer: e.word,
        answers: {
          create: e.clues.map((c, i) => ({ text: c, isCorrect: false, order: i })),
        },
      },
    });
    created++;
  }

  const total = await prisma.question.count({ where: { type: "REACTION_CHAIN" } });
  console.log(`✅ Create: ${created}, saltate: ${skipped}, categoria mancante: ${missCat}`);
  console.log(`📊 Totale REACTION_CHAIN nel DB: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
