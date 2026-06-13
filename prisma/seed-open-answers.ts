/**
 * Seed: 50 domande OPEN_ANSWER di cultura generale mista, con difficoltà variabili
 * (EASY / MEDIUM / HARD). Ogni domanda è agganciata a una categoria esistente tramite
 * slug (più stabile dell'id): l'argomento è vario, ma il DB richiede comunque una categoria.
 *
 * `openAnswer` è la risposta attesa: l'host la usa come riferimento per il giudizio manuale
 * e serve al confronto automatico case-insensitive (vedi schema.prisma).
 *
 * Idempotente: salta le domande con lo stesso testo nella stessa categoria.
 * Lancia con:  tsx prisma/seed-open-answers.ts   (oppure: npm run db:seed-open-answers)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  text: string;
  openAnswer: string;
};

const QUESTIONS: Q[] = [
  // ── STORIA ──
  { slug: "storia", difficulty: "EASY",   text: "In quale anno cadde il Muro di Berlino?", openAnswer: "1989" },
  { slug: "storia", difficulty: "EASY",   text: "Chi fu il primo Presidente degli Stati Uniti d'America?", openAnswer: "George Washington" },
  { slug: "storia", difficulty: "MEDIUM", text: "Quale imperatore romano emanò l'Editto di Milano nel 313 d.C.?", openAnswer: "Costantino" },
  { slug: "storia", difficulty: "MEDIUM", text: "Quale trattato del 1957 diede vita alla Comunità Economica Europea?", openAnswer: "Trattato di Roma" },
  { slug: "storia", difficulty: "HARD",   text: "In quale anno fu firmata la Magna Carta in Inghilterra?", openAnswer: "1215" },
  { slug: "storia", difficulty: "HARD",   text: "Chi fu l'ultimo imperatore romano d'Occidente?", openAnswer: "Romolo Augustolo" },

  // ── STORIA ANTICA ──
  { slug: "storia-antica", difficulty: "MEDIUM", text: "Quale comandante cartaginese attraversò le Alpi con gli elefanti?", openAnswer: "Annibale" },
  { slug: "storia-antica", difficulty: "HARD",   text: "In quale anno fu fondata Roma secondo la tradizione?", openAnswer: "753 a.C." },

  // ── GEOGRAFIA ──
  { slug: "geografia", difficulty: "EASY",   text: "Qual è la capitale dell'Australia?", openAnswer: "Canberra" },
  { slug: "geografia", difficulty: "EASY",   text: "In quale continente si trova il deserto del Sahara?", openAnswer: "Africa" },
  { slug: "geografia", difficulty: "MEDIUM", text: "Qual è il fiume più lungo d'Europa?", openAnswer: "Volga" },
  { slug: "geografia", difficulty: "MEDIUM", text: "Qual è il lago d'acqua dolce più profondo del mondo?", openAnswer: "Lago Bajkal" },
  { slug: "geografia", difficulty: "HARD",   text: "Qual è la capitale della Mongolia?", openAnswer: "Ulan Bator" },
  { slug: "geografia", difficulty: "HARD",   text: "Quale stretto separa la Spagna dal Marocco?", openAnswer: "Stretto di Gibilterra" },

  // ── GEOGRAFIA ITALIA ──
  { slug: "geografia-italia", difficulty: "EASY",   text: "Qual è il fiume più lungo d'Italia?", openAnswer: "Po" },
  { slug: "geografia-italia", difficulty: "MEDIUM", text: "Qual è il vulcano attivo più alto d'Europa, situato in Sicilia?", openAnswer: "Etna" },

  // ── SCIENZA ──
  { slug: "scienza", difficulty: "EASY",   text: "Qual è il simbolo chimico dell'oro?", openAnswer: "Au" },
  { slug: "scienza", difficulty: "EASY",   text: "Quale pianeta è soprannominato il 'Pianeta Rosso'?", openAnswer: "Marte" },
  { slug: "scienza", difficulty: "MEDIUM", text: "Quanti pianeti compongono il Sistema Solare?", openAnswer: "8" },
  { slug: "scienza", difficulty: "MEDIUM", text: "Quale scienziato elaborò la teoria della relatività?", openAnswer: "Albert Einstein" },
  { slug: "scienza", difficulty: "HARD",   text: "Qual è l'osso più lungo del corpo umano?", openAnswer: "Femore" },

  // ── SCIENZE (root) ──
  { slug: "scienze", difficulty: "EASY",   text: "Quanti gradi misura un angolo retto?", openAnswer: "90" },
  { slug: "scienze", difficulty: "EASY",   text: "Qual è il gas più abbondante nell'atmosfera terrestre?", openAnswer: "Azoto" },
  { slug: "scienze", difficulty: "MEDIUM", text: "Qual è l'unico metallo liquido a temperatura ambiente?", openAnswer: "Mercurio" },
  { slug: "scienze", difficulty: "MEDIUM", text: "Quante ossa ha lo scheletro di un essere umano adulto?", openAnswer: "206" },
  { slug: "scienze", difficulty: "HARD",   text: "Qual è l'unità di misura dell'intensità di corrente elettrica nel Sistema Internazionale?", openAnswer: "Ampere" },
  { slug: "scienze", difficulty: "HARD",   text: "Qual è approssimativamente la velocità della luce nel vuoto, in km/s?", openAnswer: "300000" },

  // ── ARTE E CULTURA ──
  { slug: "arte-cultura", difficulty: "EASY",   text: "Chi dipinse gli affreschi della volta della Cappella Sistina?", openAnswer: "Michelangelo" },
  { slug: "arte-cultura", difficulty: "EASY",   text: "Chi scrisse la 'Divina Commedia'?", openAnswer: "Dante Alighieri" },
  { slug: "arte-cultura", difficulty: "MEDIUM", text: "Quale pittore spagnolo dipinse 'Guernica'?", openAnswer: "Pablo Picasso" },
  { slug: "arte-cultura", difficulty: "MEDIUM", text: "Chi scrisse la tragedia 'Romeo e Giulietta'?", openAnswer: "William Shakespeare" },
  { slug: "arte-cultura", difficulty: "HARD",   text: "In quale città si trova il museo del Prado?", openAnswer: "Madrid" },
  { slug: "arte-cultura", difficulty: "HARD",   text: "Chi scrisse il romanzo 'I promessi sposi'?", openAnswer: "Alessandro Manzoni" },

  // ── CULTURA POP ──
  { slug: "cultura-pop", difficulty: "EASY",   text: "Come si chiama il mago protagonista dei romanzi di J.K. Rowling?", openAnswer: "Harry Potter" },
  { slug: "cultura-pop", difficulty: "MEDIUM", text: "Quale azienda giapponese produce la console PlayStation?", openAnswer: "Sony" },
  { slug: "cultura-pop", difficulty: "HARD",   text: "In quale anno uscì nelle sale il primo film di 'Guerre Stellari'?", openAnswer: "1977" },

  // ── CINEMA ──
  { slug: "cinema", difficulty: "EASY",   text: "Quale film d'animazione Disney ha per protagonista il leoncino Simba?", openAnswer: "Il Re Leone" },
  { slug: "cinema", difficulty: "MEDIUM", text: "Chi diresse il film 'Pulp Fiction'?", openAnswer: "Quentin Tarantino" },
  { slug: "cinema", difficulty: "HARD",   text: "Chi diresse la trilogia cinematografica de 'Il Signore degli Anelli'?", openAnswer: "Peter Jackson" },

  // ── MUSICA ──
  { slug: "musica", difficulty: "EASY",   text: "Quante corde ha una chitarra classica standard?", openAnswer: "6" },
  { slug: "musica", difficulty: "MEDIUM", text: "Quale compositore tedesco scrisse la 'Nona Sinfonia' pur essendo ormai sordo?", openAnswer: "Ludwig van Beethoven" },
  { slug: "musica", difficulty: "HARD",   text: "Di quale strumento musicale era celebre virtuoso Niccolò Paganini?", openAnswer: "Violino" },

  // ── SERIE TV ──
  { slug: "serie-tv", difficulty: "EASY",   text: "In quale città è ambientata la sitcom 'Friends'?", openAnswer: "New York" },
  { slug: "serie-tv", difficulty: "MEDIUM", text: "Qual è il nome del professore di chimica protagonista di 'Breaking Bad'?", openAnswer: "Walter White" },

  // ── VIDEOGIOCHI ──
  { slug: "videogiochi", difficulty: "EASY", text: "Qual è il nome dell'idraulico baffuto mascotte della Nintendo?", openAnswer: "Mario" },
  { slug: "videogiochi", difficulty: "HARD", text: "In quale anno fu pubblicato il primo 'Super Mario Bros.'?", openAnswer: "1985" },

  // ── SPORT ──
  { slug: "sport", difficulty: "EASY",   text: "Ogni quanti anni si svolgono i Giochi Olimpici estivi?", openAnswer: "4" },
  { slug: "sport", difficulty: "EASY",   text: "Quanti giocatori compongono una squadra di pallavolo schierata in campo?", openAnswer: "6" },
  { slug: "sport", difficulty: "MEDIUM", text: "In quale città si tennero le prime Olimpiadi dell'era moderna, nel 1896?", openAnswer: "Atene" },
  { slug: "sport", difficulty: "HARD",   text: "Chi detiene il record mondiale dei 100 metri piani maschili?", openAnswer: "Usain Bolt" },
];

async function main() {
  let created = 0;
  let skipped = 0;
  const missingSlugs = new Set<string>();

  // Cache categoria per slug per non interrogare il DB più volte.
  const catCache = new Map<string, string | null>();
  async function categoryId(slug: string): Promise<string | null> {
    if (!catCache.has(slug)) {
      const cat = await prisma.category.findUnique({ where: { slug } });
      catCache.set(slug, cat?.id ?? null);
    }
    return catCache.get(slug)!;
  }

  for (const q of QUESTIONS) {
    const catId = await categoryId(q.slug);
    if (!catId) {
      missingSlugs.add(q.slug);
      continue;
    }

    const existing = await prisma.question.findFirst({
      where: { categoryId: catId, text: q.text },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.question.create({
      data: {
        text: q.text,
        type: "OPEN_ANSWER",
        difficulty: q.difficulty,
        timeLimit: 30,
        points: 100,
        openAnswer: q.openAnswer,
        categoryId: catId,
      },
    });
    created++;
  }

  console.log(`\n✅ Seed OPEN_ANSWER completato. Create: ${created}, Saltate (già presenti): ${skipped}.`);
  if (missingSlugs.size > 0) {
    console.log(
      `⚠️  Categorie non trovate nel DB (domande saltate): ${[...missingSlugs].join(", ")}.\n` +
        `   Esegui prima i seed delle categorie (es. npm run db:seed, db:seed-50, db:seed-subcategories).`,
    );
  }

  const totalOpen = await prisma.question.count({ where: { type: "OPEN_ANSWER" } });
  console.log(`Totale domande OPEN_ANSWER nel DB: ${totalOpen}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
