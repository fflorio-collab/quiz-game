/**
 * Seed REACTION_CHAIN — 50 domande aggiuntive con 3 indizi progressivi.
 * Il primo indizio è vago, l'ultimo è il più diretto (ma non contiene mai la parola).
 * Match risposta: trim + lowercase, confronto ESATTO (niente accenti/spazi tolti),
 * quindi le parole sono scelte senza accenti e i nomi composti hanno lo spazio naturale.
 * Lancialo con: `npx tsx prisma/seed-reaction-50.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Entry = {
  catSlug: string;                   // slug categoria (deve esistere)
  prompt: string;                    // istruzione mostrata ai giocatori
  word: string;                      // parola da indovinare (forma che il giocatore digita)
  clues: [string, string, string];   // 3 indizi progressivi: vago → diretto
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

export const ENTRIES: Entry[] = [
  // ───────────────────────── Geografia (9) ─────────────────────────
  { catSlug: "geografia", prompt: "Indovina la città", word: "ROMA",
    clues: ["Capitale europea fondata su sette colli", "Attraversata dal fiume Tevere", "Il Colosseo e la Città del Vaticano"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina la città", word: "PARIGI",
    clues: ["Capitale europea sulla Senna", "Capitale della moda e dei musei", "Torre Eiffel e museo del Louvre"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina la città", word: "LONDRA",
    clues: ["Capitale attraversata dal Tamigi", "Autobus rossi a due piani", "Big Ben e Buckingham Palace"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina il paese", word: "BRASILE",
    clues: ["Lo stato più grande del Sud America", "Carnevale, samba e calcio", "Rio de Janeiro e il Cristo Redentore"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina il deserto", word: "SAHARA",
    clues: ["Si estende nel nord dell'Africa", "Sabbia e dune a perdita d'occhio", "Il deserto caldo più grande del mondo"], difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Indovina la regione", word: "SICILIA",
    clues: ["Regione del sud Italia", "La più grande isola del Mediterraneo", "Il vulcano Etna e i cannoli"], difficulty: "EASY" },
  { catSlug: "geografia", prompt: "Indovina la foresta", word: "AMAZZONIA",
    clues: ["Si trova in Sud America", "La più grande foresta pluviale del pianeta", "Attraversata dal Rio delle Amazzoni"], difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Indovina il paese", word: "NORVEGIA",
    clues: ["Paese del nord Europa", "Fiordi profondi e aurore boreali", "Capitale Oslo, terra dei vichinghi"], difficulty: "MEDIUM" },
  { catSlug: "geografia", prompt: "Indovina la montagna", word: "EVEREST",
    clues: ["Si trova nel continente asiatico", "Sulla catena dell'Himalaya", "La vetta più alta della Terra, 8848 metri"], difficulty: "MEDIUM" },

  // ───────────────────────── Storia (9) ─────────────────────────
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "COSTANTINO",
    clues: ["Imperatore romano del IV secolo", "Spostò la capitale a Bisanzio", "Con l'Editto di Milano liberò i cristiani"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "MARCO POLO",
    clues: ["Mercante e viaggiatore veneziano", "Percorse la Via della Seta", "Raccontò la Cina nel libro Il Milione"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "ATTILA",
    clues: ["Condottiero barbaro del V secolo", "Re degli Unni", "Soprannominato il flagello di Dio"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "WASHINGTON",
    clues: ["Generale e statista del Settecento", "Primo presidente degli Stati Uniti", "La capitale americana porta il suo nome"], difficulty: "EASY" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "LINCOLN",
    clues: ["Presidente degli Stati Uniti dell'Ottocento", "Abolì la schiavitù", "Assassinato a teatro nel 1865"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "MANDELA",
    clues: ["Leader politico sudafricano", "Imprigionato per 27 anni", "Primo presidente nero del Sudafrica, premio Nobel per la pace"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "GANDHI",
    clues: ["Leader politico e spirituale indiano", "Predicava la non violenza", "Guidò l'India all'indipendenza"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina la città antica", word: "POMPEI",
    clues: ["Antica città dell'Impero romano", "Distrutta da un'eruzione nel 79 d.C.", "Sepolta dal Vesuvio, oggi sito archeologico"], difficulty: "MEDIUM" },
  { catSlug: "storia", prompt: "Indovina il personaggio", word: "CAVOUR",
    clues: ["Statista italiano dell'Ottocento", "Primo ministro del Regno di Sardegna", "Tra gli artefici dell'Unità d'Italia"], difficulty: "HARD" },

  // ───────────────────────── Scienza (8) ─────────────────────────
  { catSlug: "scienza", prompt: "Indovina l'elemento", word: "OSSIGENO",
    clues: ["Gas presente nell'aria", "Indispensabile per respirare", "Simbolo O, numero atomico 8"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina il pianeta", word: "GIOVE",
    clues: ["Pianeta del sistema solare", "Il più grande di tutti", "Famoso per la grande macchia rossa"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina lo scienziato", word: "NEWTON",
    clues: ["Fisico e matematico inglese", "La mela e la legge di gravità", "Formulò le tre leggi del moto"], difficulty: "MEDIUM" },
  { catSlug: "scienza", prompt: "Indovina la molecola", word: "DNA",
    clues: ["Si trova nel nucleo delle cellule", "Ha forma a doppia elica", "Contiene il codice genetico ereditario"], difficulty: "MEDIUM" },
  { catSlug: "scienza", prompt: "Indovina l'animale", word: "DELFINO",
    clues: ["Mammifero marino", "Molto intelligente e socievole", "Comunica con i fischi e nuota in branchi"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina il fenomeno naturale", word: "VULCANO",
    clues: ["Formazione geologica della crosta terrestre", "Può eruttare emettendo lava", "Etna e Vesuvio ne sono esempi famosi"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina l'organo", word: "CUORE",
    clues: ["Organo del corpo umano", "Grande all'incirca come un pugno", "Pompa il sangue in tutto il corpo"], difficulty: "EASY" },
  { catSlug: "scienza", prompt: "Indovina il processo", word: "FOTOSINTESI",
    clues: ["Processo biologico fondamentale", "Avviene nelle foglie delle piante", "Dalla luce produce zuccheri e ossigeno"], difficulty: "MEDIUM" },

  // ───────────────────────── Arte e Cultura (8) ─────────────────────────
  { catSlug: "arte-cultura", prompt: "Indovina l'artista", word: "MICHELANGELO",
    clues: ["Genio del Rinascimento italiano", "Scolpì la statua del David", "Affrescò la volta della Cappella Sistina"], difficulty: "EASY" },
  { catSlug: "arte-cultura", prompt: "Indovina l'opera", word: "ODISSEA",
    clues: ["Poema epico dell'antica Grecia", "Attribuito al poeta Omero", "Racconta il lungo viaggio di Ulisse"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina il personaggio", word: "PINOCCHIO",
    clues: ["Protagonista di un classico italiano per ragazzi", "Inventato dallo scrittore Collodi", "Burattino di legno dal naso lungo"], difficulty: "EASY" },
  { catSlug: "arte-cultura", prompt: "Indovina il compositore", word: "MOZART",
    clues: ["Compositore austriaco del Settecento", "Bambino prodigio della musica", "Il flauto magico e il Requiem"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina il pittore", word: "PICASSO",
    clues: ["Pittore spagnolo del Novecento", "Tra i padri del cubismo", "Dipinse Guernica"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina il pittore", word: "VAN GOGH",
    clues: ["Pittore olandese dell'Ottocento", "Si tagliò un orecchio", "Dipinse la Notte stellata e i Girasoli"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina il compositore", word: "VERDI",
    clues: ["Compositore italiano dell'Ottocento", "Maestro dell'opera lirica", "La Traviata, Aida e il Nabucco"], difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", prompt: "Indovina lo scrittore", word: "PIRANDELLO",
    clues: ["Scrittore e drammaturgo italiano", "Premio Nobel per la letteratura", "Sei personaggi in cerca d'autore"], difficulty: "HARD" },

  // ───────────────────────── Sport (8) ─────────────────────────
  { catSlug: "sport", prompt: "Indovina il calciatore", word: "RONALDO",
    clues: ["Calciatore portoghese", "Numero 7 leggendario", "Soprannominato CR7"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina lo sport", word: "CALCIO",
    clues: ["Sport di squadra", "Si gioca prevalentemente con i piedi", "Undici giocatori per squadra e una porta da difendere"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina la scuderia", word: "FERRARI",
    clues: ["Storica scuderia italiana", "Simbolo del cavallino rampante", "La rossa più famosa della Formula 1"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina il cestista", word: "JORDAN",
    clues: ["Cestista statunitense", "Numero 23 dei Chicago Bulls", "Sei titoli NBA, leggenda del basket"], difficulty: "MEDIUM" },
  { catSlug: "sport", prompt: "Indovina il pilota", word: "SCHUMACHER",
    clues: ["Pilota automobilistico tedesco", "Sette titoli mondiali in carriera", "Leggenda della Formula 1 in rosso"], difficulty: "MEDIUM" },
  { catSlug: "sport", prompt: "Indovina il calciatore", word: "MARADONA",
    clues: ["Calciatore argentino", "La mano de Dios ai Mondiali del 1986", "Idolo di Napoli, mitico numero 10"], difficulty: "MEDIUM" },
  { catSlug: "sport", prompt: "Indovina lo sport", word: "NUOTO",
    clues: ["Sport acquatico", "Si pratica in piscina o in acque libere", "Stili: rana, dorso, farfalla e stile libero"], difficulty: "EASY" },
  { catSlug: "sport", prompt: "Indovina il nuotatore", word: "PHELPS",
    clues: ["Nuotatore statunitense", "L'atleta più medagliato della storia olimpica", "23 ori alle Olimpiadi"], difficulty: "HARD" },

  // ───────────────────────── Cinema (8) ─────────────────────────
  { catSlug: "cinema", prompt: "Indovina il film", word: "AVATAR",
    clues: ["Film di fantascienza campione d'incassi", "Diretto da James Cameron", "Gli alieni blu del pianeta Pandora"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina il personaggio", word: "JOKER",
    clues: ["Personaggio dei fumetti DC", "Acerrimo nemico di Batman", "Clown criminale dal ghigno inquietante"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina il film", word: "MATRIX",
    clues: ["Film di fantascienza del 1999", "Pillola rossa o pillola blu", "Neo combatte l'agente Smith"], difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: "Indovina la casa di produzione", word: "DISNEY",
    clues: ["Casa di produzione americana", "Topolino è la sua mascotte", "Parchi a tema e principesse"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina la saga", word: "ROCKY",
    clues: ["Saga cinematografica sul pugilato", "Protagonista Sylvester Stallone", "L'allenamento sui gradini di Filadelfia"], difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: "Indovina il regista", word: "TARANTINO",
    clues: ["Regista e sceneggiatore americano", "Stile inconfondibile e violenza scenica", "Pulp Fiction e Kill Bill"], difficulty: "MEDIUM" },
  { catSlug: "cinema", prompt: "Indovina il luogo", word: "HOGWARTS",
    clues: ["Luogo immaginario di una celebre saga", "Scuola di magia e stregoneria", "Harry Potter vi studia incantesimi"], difficulty: "EASY" },
  { catSlug: "cinema", prompt: "Indovina il film", word: "INCEPTION",
    clues: ["Film di fantascienza del 2010", "Diretto da Christopher Nolan", "Sogni dentro i sogni e una trottola come totem"], difficulty: "MEDIUM" },
];

async function main() {
  console.log(`🌱 Seed REACTION_CHAIN (set 50) — ${ENTRIES.length} domande\n`);

  let created = 0;
  let skipped = 0;
  let missCat = 0;

  for (const e of ENTRIES) {
    const cat = await prisma.category.findUnique({ where: { slug: e.catSlug } });
    if (!cat) { console.warn(`⚠️  categoria mancante: ${e.catSlug} (${e.word})`); missCat++; continue; }

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
  console.log(`\n✅ Create: ${created}, saltate (già presenti): ${skipped}, categoria mancante: ${missCat}`);
  console.log(`📊 Totale REACTION_CHAIN nel DB: ${total}`);
}

// Esegui il seed solo quando il file è lanciato direttamente (non quando importato per test/validazione).
if (process.argv[1] && process.argv[1].includes("seed-reaction-50")) {
  main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
}
