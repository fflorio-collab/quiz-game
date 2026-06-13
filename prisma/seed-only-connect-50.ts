/**
 * Seed ONLY_CONNECT (lotto da 50) — 4 elementi che condividono un collegamento comune.
 * L'host giudica la risposta (il "link") data a voce dai giocatori.
 * Lancialo con: `npm run db:seed-only-connect-50`
 *
 * Le entry usano `link` diversi da quelli già presenti in seed-only-connect.ts,
 * così il check anti-duplicati (categoria + tipo + prompt + link) non le salta.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = {
  catSlug: string;
  prompt: string;                            // istruzione ai giocatori
  items: [string, string, string, string];   // 4 elementi mostrati
  link: string;                               // la risposta (riferimento per il giudizio host)
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

const PROMPT = "Cosa hanno in comune?";

const ENTRIES: Entry[] = [
  // ── Geografia ────────────────────────────────────────────────
  { catSlug: "geografia", prompt: PROMPT,
    items: ["Pacifico", "Atlantico", "Indiano", "Artico"], link: "Oceani della Terra", difficulty: "EASY" },
  { catSlug: "geografia", prompt: PROMPT,
    items: ["Caspio", "Superiore", "Vittoria", "Aral"], link: "Laghi più grandi del mondo", difficulty: "HARD" },
  { catSlug: "geografia-italia", prompt: PROMPT,
    items: ["Lombardia", "Veneto", "Piemonte", "Liguria"], link: "Regioni del Nord Italia", difficulty: "EASY" },
  { catSlug: "geografia-italia", prompt: PROMPT,
    items: ["Garda", "Maggiore", "Como", "Trasimeno"], link: "Laghi italiani", difficulty: "EASY" },
  { catSlug: "geografia-europa", prompt: PROMPT,
    items: ["Lisbona", "Oslo", "Vienna", "Varsavia"], link: "Capitali europee", difficulty: "MEDIUM" },
  { catSlug: "geografia-europa", prompt: PROMPT,
    items: ["Danubio", "Reno", "Volga", "Senna"], link: "Fiumi europei", difficulty: "EASY" },
  { catSlug: "geografia-mondo", prompt: PROMPT,
    items: ["Sahara", "Gobi", "Kalahari", "Atacama"], link: "Deserti del mondo", difficulty: "MEDIUM" },
  { catSlug: "geografia-mondo", prompt: PROMPT,
    items: ["Ande", "Montagne Rocciose", "Urali", "Appalachi"], link: "Catene montuose", difficulty: "MEDIUM" },

  // ── Storia ───────────────────────────────────────────────────
  { catSlug: "storia", prompt: PROMPT,
    items: ["Lincoln", "Garfield", "McKinley", "Kennedy"], link: "Presidenti USA assassinati", difficulty: "HARD" },
  { catSlug: "storia", prompt: PROMPT,
    items: ["Cleopatra", "Nefertiti", "Hatshepsut", "Tutankhamon"], link: "Sovrani dell'antico Egitto", difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: PROMPT,
    items: ["Solferino", "Custoza", "Magenta", "San Martino"], link: "Battaglie del Risorgimento", difficulty: "HARD" },
  { catSlug: "storia-antica", prompt: PROMPT,
    items: ["Sparta", "Atene", "Tebe", "Corinto"], link: "Città-stato dell'antica Grecia", difficulty: "MEDIUM" },
  { catSlug: "storia-elementare", prompt: PROMPT,
    items: ["Romolo", "Numa Pompilio", "Servio Tullio", "Tarquinio il Superbo"], link: "Re di Roma", difficulty: "MEDIUM" },
  { catSlug: "storia-medievale", prompt: PROMPT,
    items: ["Carlo Magno", "Ottone I", "Federico Barbarossa", "Enrico IV"], link: "Imperatori del Sacro Romano Impero", difficulty: "HARD" },
  { catSlug: "storia-moderna", prompt: PROMPT,
    items: ["Lutero", "Calvino", "Zwingli", "Enrico VIII"], link: "Protagonisti della Riforma protestante", difficulty: "HARD" },
  { catSlug: "storia-contemporanea", prompt: PROMPT,
    items: ["Berlino", "Corea", "Vietnam", "Cuba"], link: "Teatri di crisi della Guerra Fredda", difficulty: "MEDIUM" },

  // ── Scienza ──────────────────────────────────────────────────
  { catSlug: "scienza", prompt: PROMPT,
    items: ["Mitocondrio", "Nucleo", "Ribosoma", "Lisosoma"], link: "Organuli della cellula", difficulty: "MEDIUM" },
  { catSlug: "scienza", prompt: PROMPT,
    items: ["Glucosio", "Fruttosio", "Saccarosio", "Lattosio"], link: "Zuccheri", difficulty: "MEDIUM" },
  { catSlug: "scienze-chimica", prompt: PROMPT,
    items: ["Au", "Ag", "Fe", "Na"], link: "Simboli chimici derivati dal nome latino", difficulty: "HARD" },
  { catSlug: "scienze-chimica", prompt: PROMPT,
    items: ["Diamante", "Grafite", "Grafene", "Fullerene"], link: "Forme allotropiche del carbonio", difficulty: "HARD" },
  { catSlug: "scienze-fisica", prompt: PROMPT,
    items: ["Newton", "Joule", "Watt", "Pascal"], link: "Unità di misura del SI intitolate a scienziati", difficulty: "MEDIUM" },
  { catSlug: "scienze-biologia", prompt: PROMPT,
    items: ["Anfibi", "Rettili", "Uccelli", "Mammiferi"], link: "Classi di vertebrati", difficulty: "EASY" },
  { catSlug: "scienze-astronomia", prompt: PROMPT,
    items: ["Giove", "Saturno", "Urano", "Nettuno"], link: "Pianeti giganti gassosi", difficulty: "EASY" },
  { catSlug: "scienze-astronomia", prompt: PROMPT,
    items: ["Luna", "Io", "Europa", "Titano"], link: "Satelliti naturali del sistema solare", difficulty: "MEDIUM" },

  // ── Arte e Cultura ───────────────────────────────────────────
  { catSlug: "arte-cultura", prompt: PROMPT,
    items: ["Monet", "Renoir", "Degas", "Pissarro"], link: "Pittori impressionisti", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: PROMPT,
    items: ["Notte stellata", "Girasoli", "I mangiatori di patate", "Caffè di notte"], link: "Opere di Van Gogh", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: PROMPT,
    items: ["Odissea", "Iliade", "Eneide", "Argonautiche"], link: "Poemi epici dell'antichità", difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: PROMPT,
    items: ["Do", "Re", "Mi", "Fa"], link: "Note musicali", difficulty: "EASY" },
  { catSlug: "arte-cultura", prompt: PROMPT,
    items: ["Re", "Regina", "Alfiere", "Cavallo"], link: "Pezzi degli scacchi", difficulty: "EASY" },

  // ── Sport ────────────────────────────────────────────────────
  { catSlug: "sport-calcio", prompt: PROMPT,
    items: ["Brasile", "Germania", "Italia", "Argentina"], link: "Nazionali campioni del mondo di calcio", difficulty: "EASY" },
  { catSlug: "sport-tennis", prompt: PROMPT,
    items: ["Federer", "Nadal", "Djokovic", "Murray"], link: "I Big Four del tennis", difficulty: "EASY" },
  { catSlug: "sport-basket", prompt: PROMPT,
    items: ["Jordan", "LeBron", "Kobe", "Magic"], link: "Leggende dell'NBA", difficulty: "EASY" },
  { catSlug: "sport-olimpiadi", prompt: PROMPT,
    items: ["Atene", "Parigi", "Tokyo", "Los Angeles"], link: "Città dei Giochi Olimpici estivi", difficulty: "MEDIUM" },
  { catSlug: "sport", prompt: PROMPT,
    items: ["Coppi", "Bartali", "Merckx", "Pantani"], link: "Campioni del ciclismo", difficulty: "MEDIUM" },
  { catSlug: "sport", prompt: PROMPT,
    items: ["Schumacher", "Senna", "Hamilton", "Prost"], link: "Campioni del mondo di Formula 1", difficulty: "EASY" },

  // ── Cinema ───────────────────────────────────────────────────
  { catSlug: "cinema", prompt: PROMPT,
    items: ["Spielberg", "Scorsese", "Coppola", "Kubrick"], link: "Registi celebri", difficulty: "EASY" },
  { catSlug: "cinema", prompt: PROMPT,
    items: ["Lo squalo", "E.T.", "Jurassic Park", "Schindler's List"], link: "Film di Steven Spielberg", difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: PROMPT,
    items: ["Iron Man", "Thor", "Hulk", "Capitan America"], link: "I Vendicatori (Avengers)", difficulty: "EASY" },
  { catSlug: "cinema", prompt: PROMPT,
    items: ["Roma", "Parasite", "Drive My Car", "La grande bellezza"], link: "Vincitori dell'Oscar al miglior film internazionale", difficulty: "HARD" },
  { catSlug: "cinema", prompt: PROMPT,
    items: ["Anthony Hopkins", "Jack Nicholson", "Daniel Day-Lewis", "Tom Hanks"], link: "Attori premiati con l'Oscar", difficulty: "MEDIUM" },

  // ── Musica ───────────────────────────────────────────────────
  { catSlug: "musica", prompt: PROMPT,
    items: ["John", "Paul", "George", "Ringo"], link: "I Beatles", difficulty: "EASY" },
  { catSlug: "musica", prompt: PROMPT,
    items: ["Mercury", "May", "Taylor", "Deacon"], link: "Membri dei Queen", difficulty: "MEDIUM" },
  { catSlug: "musica", prompt: PROMPT,
    items: ["Vivaldi", "Bach", "Mozart", "Beethoven"], link: "Compositori di musica classica", difficulty: "EASY" },
  { catSlug: "musica", prompt: PROMPT,
    items: ["Battisti", "De André", "Dalla", "Battiato"], link: "Cantautori italiani", difficulty: "MEDIUM" },

  // ── Serie TV ─────────────────────────────────────────────────
  { catSlug: "serie-tv", prompt: PROMPT,
    items: ["Breaking Bad", "I Soprano", "Mad Men", "The Wire"], link: "Serie TV drammatiche acclamate", difficulty: "MEDIUM" },
  { catSlug: "serie-tv", prompt: PROMPT,
    items: ["Approdo del Re", "Grande Inverno", "Westeros", "Essos"], link: "Luoghi di Game of Thrones", difficulty: "HARD" },
  { catSlug: "serie-tv", prompt: PROMPT,
    items: ["Ross", "Rachel", "Monica", "Chandler"], link: "Personaggi di Friends", difficulty: "EASY" },

  // ── Videogiochi ──────────────────────────────────────────────
  { catSlug: "videogiochi", prompt: PROMPT,
    items: ["Mario", "Link", "Samus", "Kirby"], link: "Personaggi Nintendo", difficulty: "MEDIUM" },
  { catSlug: "videogiochi", prompt: PROMPT,
    items: ["Tetris", "Pac-Man", "Space Invaders", "Donkey Kong"], link: "Videogiochi arcade classici", difficulty: "MEDIUM" },

  // ── Cultura pop ──────────────────────────────────────────────
  { catSlug: "cultura-pop", prompt: PROMPT,
    items: ["Grifondoro", "Serpeverde", "Tassorosso", "Corvonero"], link: "Case di Hogwarts", difficulty: "EASY" },
];

async function main() {
  console.log(`🌱 Seed ONLY_CONNECT (lotto 50) — ${ENTRIES.length} domande\n`);

  let created = 0;
  let skipped = 0;
  let missCat = 0;

  for (const e of ENTRIES) {
    const cat = await prisma.category.findUnique({ where: { slug: e.catSlug } });
    if (!cat) { missCat++; console.warn(`⚠️  categoria mancante: ${e.catSlug} (${e.link})`); continue; }

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
  console.log(`\n✅ Create: ${created}, saltate: ${skipped}, categoria mancante: ${missCat}`);
  console.log(`📊 Totale ONLY_CONNECT nel DB: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
