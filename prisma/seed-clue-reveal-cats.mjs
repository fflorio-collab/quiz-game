// Seed di 81 CLUE_REVEAL: 3 per categoria × 27. Schema: imageUrl OBBLIGATORIO,
// openAnswer = parola attesa. La UI sfoca progressivamente l'immagine.
// Uso URL Wikipedia Commons via Special:FilePath (stabile nel tempo).
//
//   node --experimental-sqlite prisma/seed-clue-reveal-cats.mjs            # dry-run
//   node --experimental-sqlite prisma/seed-clue-reveal-cats.mjs --apply

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function makeId() { let s = "cr"; for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36); return s; }

function wiki(filename) {
  const f = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=800`;
}

// [difficulty, hintQuestion, expectedAnswer, wikipediaCommonsFilename]
const Q = {
  "arte-cultura": [
    ["EASY",   "Indovina l'opera che si sta rivelando",     "La Notte Stellata",       "Van Gogh - Starry Night - Google Art Project.jpg"],
    ["MEDIUM", "Indovina la scultura",                       "Pietà",                   "Michelangelo's Pieta 5450 cropncleaned edit.jpg"],
    ["HARD",   "Indovina l'opera",                           "Il Bacio",                "Klimt - The Kiss - Belvedere.jpg"],
  ],
  "scienza": [
    ["EASY",   "Indovina lo scienziato che si rivela",       "Stephen Hawking",         "Stephen Hawking.StarChild.jpg"],
    ["MEDIUM", "Indovina lo scienziato",                     "Charles Darwin",          "Charles Darwin by Julia Margaret Cameron 3.jpg"],
    ["HARD",   "Indovina la scienziata",                     "Rosalind Franklin",       "Rosalind Franklin (1920-1958).jpg"],
  ],
  "storia": [
    ["EASY",   "Indovina il personaggio che si rivela",      "Napoleone Bonaparte",     "Napoleon - 2.jpg"],
    ["MEDIUM", "Indovina il personaggio",                    "Cleopatra",               "Berlin Cleopatra Altes Museum.jpg"],
    ["HARD",   "Indovina il personaggio",                    "Giulio Cesare",           "Gaius Julius Caesar (Vatican Museum).jpg"],
  ],
  "geografia": [
    ["EASY",   "Indovina il monumento",                       "Big Ben",                "Clock Tower - Palace of Westminster, London - May 2007.jpg"],
    ["MEDIUM", "Indovina la struttura",                       "Cristo Redentore",       "Cristo Redentor - Christ the Redeemer.jpg"],
    ["HARD",   "Indovina la struttura antica",                "Stonehenge",              "Stonehenge2007 07 30.jpg"],
  ],
  "scienze": [
    ["EASY",   "Indovina l'animale",                          "Delfino",                "Delphinus delphis crop.jpg"],
    ["MEDIUM", "Indovina l'animale marino",                   "Polpo",                  "Common Octopus.jpg"],
    ["HARD",   "Indovina l'organismo microscopico",           "Tardigrado",             "SEM image of Milnesium tardigradum in active state - journal.pone.0045682.g001-2.png"],
  ],
  "cultura-pop": [
    ["EASY",   "Indovina il personaggio dei fumetti",         "Topolino",                "Mickey-Mouse-Image.jpg"],
    ["MEDIUM", "Indovina il personaggio",                     "Charlie Chaplin",        "Charlie Chaplin.jpg"],
    ["HARD",   "Indovina il personaggio",                     "Andy Warhol",             "Andy Warhol 1975.jpg"],
  ],
  "sport": [
    ["EASY",   "Indovina lo sport raffigurato",               "Calcio",                  "Football iu 1996.jpg"],
    ["MEDIUM", "Indovina l'attrezzo",                         "Pallone da rugby",        "Rugby ball.jpg"],
    ["HARD",   "Indovina la disciplina",                      "Lacrosse",                "Lacrosse Cross check.jpg"],
  ],

  "storia-antica": [
    ["EASY",   "Indovina il monumento",                       "Sfinge di Giza",         "Great Sphinx of Giza - 20080716a.jpg"],
    ["MEDIUM", "Indovina la statua",                          "Discobolo",               "Discobolus Lancelotti Massimo.jpg"],
    ["HARD",   "Indovina il sito archeologico",               "Cnosso",                  "Knossos North Portico 02.jpg"],
  ],
  "storia-medievale": [
    ["EASY",   "Indovina la struttura",                       "Castello di Windsor",    "Windsor Castle at Sunset - Nov 2006.jpg"],
    ["MEDIUM", "Indovina la cattedrale",                      "Canterbury",              "Canterbury Cathedral - Portal Nave Cross-spire.jpeg"],
    ["HARD",   "Indovina la mappa",                           "Mappamondo medievale",    "Hereford-Karte.jpg"],
  ],
  "storia-moderna": [
    ["EASY",   "Indovina il personaggio",                     "George Washington",      "Gilbert Stuart Williamstown Portrait of George Washington.jpg"],
    ["MEDIUM", "Indovina il personaggio",                     "Voltaire",                "Atelier de Nicolas de Largillière, portrait de Voltaire, détail (musée Carnavalet) -002.jpg"],
    ["HARD",   "Indovina la nave",                            "HMS Victory",             "HMS Victory.JPG"],
  ],
  "storia-contemporanea": [
    ["EASY",   "Indovina la presidente",                      "Margaret Thatcher",      "Margaret Thatcher.png"],
    ["MEDIUM", "Indovina la fotografia storica",              "V-J Day Times Square",   "Legacy Kiss.jpg"],
    ["HARD",   "Indovina il monumento",                       "Memoriale Vietnam",      "Vietnam-Veterans-Memorial-Washington-DC.jpg"],
  ],
  "storia-elementare": [
    ["EASY",   "Indovina lo strumento antico",                "Clessidra",               "Sandglass.jpg"],
    ["MEDIUM", "Indovina lo strumento antico",                "Bussola",                 "Compass-1.jpg"],
    ["HARD",   "Indovina lo strumento antico",                "Astrolabio",              "Astrolabio.jpg"],
  ],

  "geografia-italia": [
    ["EASY",   "Indovina il monumento italiano",              "Duomo di Milano",        "MilanoDuomo.jpg"],
    ["MEDIUM", "Indovina il monumento",                       "Reggia di Caserta",      "Reggia di Caserta facade.jpg"],
    ["HARD",   "Indovina il monumento",                       "Nuraghe",                 "Su Nuraxi Barumini DSC02628.jpg"],
  ],
  "geografia-europa": [
    ["EASY",   "Indovina la torre",                           "Torre di Belém",         "Torre de Belém - 04-2009.jpg"],
    ["MEDIUM", "Indovina il castello",                        "Castello di Edimburgo",  "Edinburgh Castle from the south east.jpg"],
    ["HARD",   "Indovina il monumento",                       "Stupa Boudhanath",       "Boudhanath Stupa Kathmandu Nepal.jpg"],
  ],
  "geografia-mondo": [
    ["EASY",   "Indovina il monumento",                       "Taj Mahal",               "Taj Mahal in March 2004.jpg"],
    ["MEDIUM", "Indovina la statua",                          "Moai dell'Isola di Pasqua","Moai Rano raraku.jpg"],
    ["HARD",   "Indovina la rovina",                          "Borobudur",               "Borobudur-Nothwest-view.jpg"],
  ],

  "sport-calcio": [
    ["EASY",   "Indovina il calciatore",                      "Lionel Messi",            "Lionel Messi 20180626.jpg"],
    ["MEDIUM", "Indovina il calciatore italiano",              "Paolo Maldini",          "Maldini Milan-Werder Bremen 1990.jpg"],
    ["HARD",   "Indovina il giocatore brasiliano",             "Ronaldinho",              "Ronaldinho 2007.jpg"],
  ],
  "sport-tennis": [
    ["EASY",   "Indovina la tennista",                        "Serena Williams",         "Serena Williams (9544811969).jpg"],
    ["MEDIUM", "Indovina la tennista",                        "Maria Sharapova",         "Maria Sharapova at the 2008 WTA Tour Championships.jpg"],
    ["HARD",   "Indovina lo stadio",                          "Wimbledon",               "Wimbledon Centre Court 2014.jpg"],
  ],
  "sport-basket": [
    ["EASY",   "Indovina il cestista",                        "Kobe Bryant",             "Kobe Bryant 2014.jpg"],
    ["MEDIUM", "Indovina il cestista",                        "Shaquille O'Neal",        "Shaquille O'Neal Free Throw.jpg"],
    ["HARD",   "Indovina la coppa",                           "Larry O'Brien Trophy",    "Larry O'Brien Trophy.png"],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Indovina la medaglia",                        "Medaglia d'oro",          "Olympic gold medal.svg"],
    ["MEDIUM", "Indovina lo stadio",                          "Stadio Olimpico Berlino", "Olympiastadion Berlin Innenraum.jpg"],
    ["HARD",   "Indovina la torcia",                          "Torcia di Tokyo 2020",    "Tokyo 2020 Olympic Torch.jpg"],
  ],

  "scienze-fisica": [
    ["EASY",   "Indovina lo strumento di laboratorio",         "Pila",                    "Battery used in a flashlight.jpg"],
    ["MEDIUM", "Indovina la grandezza fisica visualizzata",    "Onda",                    "Simple sine wave.svg"],
    ["HARD",   "Indovina lo strumento",                        "Oscilloscopio",           "Oszilloskop.jpg"],
  ],
  "scienze-chimica": [
    ["EASY",   "Indovina la sostanza",                         "Sale",                    "Salt shaker on white background.jpg"],
    ["MEDIUM", "Indovina lo strumento di laboratorio",         "Bunsen",                  "Bunsen burner without flame.jpg"],
    ["HARD",   "Indovina la struttura molecolare",             "Benzene",                 "Benzene-2D-flat.png"],
  ],
  "scienze-biologia": [
    ["EASY",   "Indovina l'animale",                           "Tigre",                   "Tigerwasserloch.jpg"],
    ["MEDIUM", "Indovina la pianta carnivora",                 "Dionaea",                 "Venus Flytrap showing trigger hairs.jpg"],
    ["HARD",   "Indovina la cellula",                          "Eritrocita",              "Red blood cells.jpg"],
  ],
  "scienze-astronomia": [
    ["EASY",   "Indovina il pianeta",                          "Giove",                   "Jupiter and its shrunken Great Red Spot.jpg"],
    ["MEDIUM", "Indovina la nebulosa",                         "Nebulosa di Orione",      "Orion Nebula - Hubble 2006 mosaic 18000.jpg"],
    ["HARD",   "Indovina la galassia",                         "Galassia di Andromeda",   "Andromeda Galaxy (with h-alpha).jpg"],
  ],

  "cinema": [
    ["EASY",   "Indovina l'attore",                            "Charlie Chaplin",         "Charlie Chaplin portrait.jpg"],
    ["MEDIUM", "Indovina l'attrice italiana",                  "Anna Magnani",            "Anna Magnani Bellissima.jpg"],
    ["HARD",   "Indovina il regista",                          "Federico Fellini",        "Federico Fellini portrait.jpg"],
  ],
  "musica": [
    ["EASY",   "Indovina il cantante",                          "Michael Jackson",        "Michael Jackson 1984.jpg"],
    ["MEDIUM", "Indovina la cantante italiana",                  "Mina",                   "Mina-Mazzini-1969.jpg"],
    ["HARD",   "Indovina il direttore d'orchestra",              "Riccardo Muti",          "Riccardo Muti Salzburger Festspiele 2017.jpg"],
  ],
  "serie-tv": [
    ["EASY",   "Indovina il logo",                              "Netflix",                "Netflix 2015 logo.svg"],
    ["MEDIUM", "Indovina il personaggio",                        "Eleven (Stranger Things)","Stranger Things logo.png"],
    ["HARD",   "Indovina la serie animata",                      "Rick and Morty",         "Rick and Morty.svg"],
  ],
  "videogiochi": [
    ["EASY",   "Indovina la console",                            "PlayStation 5",         "PlayStation-5-DualSense-Controller.jpg"],
    ["MEDIUM", "Indovina il personaggio",                        "Lara Croft",             "Tomb Raider series logo.png"],
    ["HARD",   "Indovina il logo storico",                        "Atari",                  "Atari logo.svg"],
  ],
};

// ── Esecuzione ──
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
for (const c of db.prepare(`SELECT id, slug FROM Category`).all()) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, openAnswer, imageUrl, mediaType, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'CLUE_REVEAL', ?, 30, 100, ?, ?, 'image', ?, datetime('now'), datetime('now'))
`);

let total = 0;
for (const [slug, items] of Object.entries(Q)) {
  const catId = slugToId.get(slug);
  if (!catId) continue;
  for (const [difficulty, text, openAns, filename] of items) {
    if (APPLY) insertQ.run(makeId(), text, difficulty, openAns, wiki(filename), catId);
    total++;
  }
}

console.log(`Domande processate: ${total}`);
console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run."}`);
db.close();
