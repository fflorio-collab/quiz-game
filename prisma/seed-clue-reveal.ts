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

  // ─────────────────────────────────────────────────────────────
  // +50 domande aggiuntive (immagini Wikimedia Commons verificate)
  // ─────────────────────────────────────────────────────────────

  // Storia — personaggi e reperti (10)
  { catSlug: "storia", text: "Chi è il presidente che si sta svelando?", openAnswer: "Abraham Lincoln",
    imageUrl: wiki("Abraham Lincoln O-77 matte collodion print.jpg"), difficulty: "EASY" },
  { catSlug: "storia", text: "Chi è il condottiero romano?", openAnswer: "Giulio Cesare",
    imageUrl: wiki("Gaius Iulius Caesar (Vatican Museum).jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Chi è la regina raffigurata?", openAnswer: "Cleopatra",
    imageUrl: wiki("Kleopatra-VII.-Altes-Museum-Berlin1.jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Chi è il personaggio?", openAnswer: "George Washington",
    imageUrl: wiki("Gilbert Stuart Williamstown Portrait of George Washington.jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Riconosci il volto?", openAnswer: "Martin Luther King",
    imageUrl: wiki("Martin Luther King, Jr..jpg"), difficulty: "EASY" },
  { catSlug: "storia", text: "Chi è il navigatore ritratto?", openAnswer: "Cristoforo Colombo",
    imageUrl: wiki("Portrait of a Man, Said to be Christopher Columbus.jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Chi è la sovrana?", openAnswer: "Elisabetta II",
    imageUrl: wiki("Queen Elizabeth II in March 2015.jpg"), difficulty: "EASY" },
  { catSlug: "storia", text: "Chi è il personaggio del Risorgimento?", openAnswer: "Giuseppe Garibaldi",
    imageUrl: wiki("Giuseppe Garibaldi (1866).jpg"), difficulty: "MEDIUM" },
  { catSlug: "storia", text: "Chi è l'eroina raffigurata?", openAnswer: "Giovanna d'Arco",
    imageUrl: wiki("Joan of Arc miniature graded.jpg"), difficulty: "HARD" },
  { catSlug: "storia", text: "Quale maschera funeraria si rivela?", openAnswer: "Tutankhamon",
    imageUrl: wiki("CairoEgMuseumTaaMaskMostlyPhotographed.jpg"), difficulty: "MEDIUM" },

  // Geografia — monumenti e luoghi iconici (11)
  { catSlug: "geografia", text: "Quale monumento si sta svelando?", openAnswer: "Big Ben",
    imageUrl: wiki("Clock Tower - Palace of Westminster, London - May 2007.jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Quale luogo è?", openAnswer: "Taj Mahal",
    imageUrl: wiki("Taj Mahal in March 2004.jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Quale statua si rivela?", openAnswer: "Cristo Redentore",
    imageUrl: wiki("Christ on Corcovado mountain.JPG"), difficulty: "MEDIUM" },
  { catSlug: "geografia", text: "Quale sito si sta svelando?", openAnswer: "Stonehenge",
    imageUrl: wiki("Stonehenge2007 07 30.jpg"), difficulty: "MEDIUM" },
  { catSlug: "geografia", text: "Quale monumento è?", openAnswer: "Torre di Pisa",
    imageUrl: wiki("Leaning Tower of Pisa (April 2012).jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Quale monumento si rivela?", openAnswer: "Sfinge di Giza",
    imageUrl: wiki("Great Sphinx of Giza - 20080716a.jpg"), difficulty: "MEDIUM" },
  { catSlug: "geografia", text: "Quale ponte si sta svelando?", openAnswer: "Golden Gate",
    imageUrl: wiki("GoldenGateBridge-001.jpg"), difficulty: "MEDIUM" },
  { catSlug: "geografia", text: "Quale monumento italiano è?", openAnswer: "Duomo di Milano",
    imageUrl: wiki("Milan Cathedral from Piazza del Duomo.jpg"), difficulty: "EASY" },
  { catSlug: "geografia", text: "Quale ponte è?", openAnswer: "Tower Bridge",
    imageUrl: wiki("Tower Bridge from Shad Thames.jpg"), difficulty: "MEDIUM" },
  { catSlug: "geografia", text: "Quale grattacielo si rivela?", openAnswer: "Empire State Building",
    imageUrl: wiki("Empire State Building (aerial view).jpg"), difficulty: "MEDIUM" },
  { catSlug: "geografia", text: "Quale luogo si sta svelando?", openAnswer: "Grande Muraglia",
    imageUrl: wiki("The Great Wall of China at Jinshanling-edit.jpg"), difficulty: "MEDIUM" },

  // Arte e Cultura — opere celebri (10)
  { catSlug: "arte-cultura", text: "Quale scultura si rivela?", openAnswer: "Pietà",
    imageUrl: wiki("Michelangelo's Pieta 5450 cropncleaned edit.jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale dipinto di Klimt è?", openAnswer: "Il Bacio",
    imageUrl: wiki("Gustav Klimt 016.jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale affresco si sta svelando?", openAnswer: "La Creazione di Adamo",
    imageUrl: wiki("Michelangelo - Creation of Adam (cropped).jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale dipinto di Botticelli è?", openAnswer: "La Nascita di Venere",
    imageUrl: wiki("Sandro Botticelli - La nascita di Venere - Google Art Project - edited.jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale dipinto di Vermeer è?", openAnswer: "Ragazza con l'orecchino di perla",
    imageUrl: wiki("1665 Girl with a Pearl Earring.jpg"), difficulty: "HARD" },
  { catSlug: "arte-cultura", text: "Quale dipinto di Delacroix è?", openAnswer: "La Libertà che guida il popolo",
    imageUrl: wiki("Eugène Delacroix - Le 28 Juillet. La Liberté guidant le peuple.jpg"), difficulty: "HARD" },
  { catSlug: "arte-cultura", text: "Quale statua si sta svelando?", openAnswer: "Venere di Milo",
    imageUrl: wiki("Venus de Milo Louvre Ma399 n4.jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale scultura di Rodin è?", openAnswer: "Il Pensatore",
    imageUrl: wiki("The Thinker, Rodin.jpg"), difficulty: "MEDIUM" },
  { catSlug: "arte-cultura", text: "Quale dipinto si rivela?", openAnswer: "American Gothic",
    imageUrl: wiki("Grant Wood - American Gothic - Google Art Project.jpg"), difficulty: "HARD" },
  { catSlug: "arte-cultura", text: "Quale dipinto di Rembrandt è?", openAnswer: "La Ronda di Notte",
    imageUrl: wiki("The Night Watch - HD.jpg"), difficulty: "HARD" },

  // Scienza — scienziati celebri (7)
  { catSlug: "scienza", text: "Quale scienziato si rivela?", openAnswer: "Charles Darwin",
    imageUrl: wiki("Charles Darwin by Julia Margaret Cameron 3.jpg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Chi è lo scienziato ritratto?", openAnswer: "Galileo Galilei",
    imageUrl: wiki("Justus Sustermans - Portrait of Galileo Galilei, 1636.jpg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Di chi è il volto?", openAnswer: "Nikola Tesla",
    imageUrl: wiki("Tesla circa 1890.jpeg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Chi è la scienziata raffigurata?", openAnswer: "Rosalind Franklin",
    imageUrl: wiki("Rosalind Franklin.jpg"), difficulty: "HARD" },
  { catSlug: "scienza", text: "Quale scienziato è?", openAnswer: "Louis Pasteur",
    imageUrl: wiki("Louis Pasteur, foto av Paul Nadar, Crisco edit.jpg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Chi è lo scienziato italiano?", openAnswer: "Alessandro Volta",
    imageUrl: wiki("Alessandro Volta.jpeg"), difficulty: "MEDIUM" },
  { catSlug: "scienza", text: "Quale matematico dell'antichità è?", openAnswer: "Archimede",
    imageUrl: wiki("Domenico-Fetti Archimedes 1620.jpg"), difficulty: "HARD" },

  // Sport — campioni iconici (6)
  { catSlug: "sport", text: "Chi è il calciatore?", openAnswer: "Lionel Messi",
    imageUrl: wiki("Lionel Messi 20180626.jpg"), difficulty: "EASY" },
  { catSlug: "sport", text: "Chi è il calciatore che si rivela?", openAnswer: "Cristiano Ronaldo",
    imageUrl: wiki("Cristiano Ronaldo 2018.jpg"), difficulty: "EASY" },
  { catSlug: "sport", text: "Chi è il cestista?", openAnswer: "Michael Jordan",
    imageUrl: wiki("Michael Jordan in 2014.jpg"), difficulty: "MEDIUM" },
  { catSlug: "sport", text: "Chi è il campione raffigurato?", openAnswer: "Maradona",
    imageUrl: wiki("Maradona-Mundial 86 con la copa.JPG"), difficulty: "MEDIUM" },
  { catSlug: "sport", text: "Chi è il tennista?", openAnswer: "Roger Federer",
    imageUrl: wiki("Roger Federer (26 June 2009, Wimbledon) 2 new.jpg"), difficulty: "MEDIUM" },
  { catSlug: "sport", text: "Chi è il calciatore leggendario?", openAnswer: "Pelé",
    imageUrl: wiki("Pelé 1960.jpg"), difficulty: "MEDIUM" },

  // Cinema — volti e loghi (6)
  { catSlug: "cinema", text: "Quale attore si sta svelando?", openAnswer: "Charlie Chaplin",
    imageUrl: wiki("Charlie Chaplin portrait.jpg"), difficulty: "EASY" },
  { catSlug: "cinema", text: "Quale regista è ritratto?", openAnswer: "Alfred Hitchcock",
    imageUrl: wiki("Alfred Hitchcock NYWTS.jpg"), difficulty: "MEDIUM" },
  { catSlug: "cinema", text: "Quale attrice si rivela?", openAnswer: "Audrey Hepburn",
    imageUrl: wiki("Audrey Hepburn 1956.jpg"), difficulty: "MEDIUM" },
  { catSlug: "cinema", text: "Quale attore è?", openAnswer: "Tom Hanks",
    imageUrl: wiki("Tom Hanks TIFF 2019.jpg"), difficulty: "EASY" },
  { catSlug: "cinema", text: "Quale logo si sta rivelando?", openAnswer: "Netflix",
    imageUrl: wiki("Netflix 2015 logo.svg"), difficulty: "EASY" },
  { catSlug: "cinema", text: "Quale studio di animazione è?", openAnswer: "Pixar",
    imageUrl: wiki("Pixar logo.svg"), difficulty: "EASY" },
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
