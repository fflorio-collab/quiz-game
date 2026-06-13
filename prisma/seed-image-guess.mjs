// Seed di 81 domande IMAGE_GUESS: 3 per categoria (1 EASY, 1 MEDIUM, 1 HARD).
// Schema: imageUrl OBBLIGATORIO, mediaType="image", openAnswer = riferimento.
// Usiamo URL Wikipedia Commons via Special:FilePath che fa redirect alla URL reale
// del file, indipendentemente dal prefisso MD5 (più stabile nel tempo).
//
//   node --experimental-sqlite prisma/seed-image-guess.mjs            # dry-run
//   node --experimental-sqlite prisma/seed-image-guess.mjs --apply

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function makeId() {
  let s = "ig";
  for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

// Wikipedia Commons via Special:FilePath: redirect automatico al file reale.
// Format: https://commons.wikimedia.org/wiki/Special:FilePath/FILENAME?width=800
function wiki(filename) {
  // Sostituisci spazi con underscore (Commons li accetta entrambi ma _ è canonico)
  const f = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=800`;
}

// Per ogni categoria: [difficulty, hintQuestion, expectedAnswer, wikipediaCommonsFilename]
const QUESTIONS_BY_SLUG = {
  // ── ROOT (7) ──
  "arte-cultura": [
    ["EASY",   "Quale celebre dipinto è raffigurato?",                  "Gioconda",                "Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg"],
    ["MEDIUM", "Quale celebre disegno di Leonardo è raffigurato?",      "Uomo Vitruviano",         "Da Vinci Vitruve Luc Viatour.jpg"],
    ["HARD",   "Quale opera surrealista di Dalí è in foto?",            "La persistenza della memoria", "The Persistence of Memory.jpg"],
  ],
  "scienza": [
    ["EASY",   "Quale celebre scienziato è in foto?",                   "Albert Einstein",         "Albert Einstein Head.jpg"],
    ["MEDIUM", "Quale strumento è raffigurato?",                        "Telescopio",              "Galileo's Telescope.JPG"],
    ["HARD",   "Quale fisica polacca-francese è in foto?",              "Marie Curie",             "Marie Curie c1920.jpg"],
  ],
  "storia": [
    ["EASY",   "Quale famoso monumento USA è in foto?",                 "Statua della Libertà",    "Statue of Liberty 7.jpg"],
    ["MEDIUM", "Quale leader politico britannico del WWII è in foto?",  "Winston Churchill",       "Churchill portrait NYP 45063.jpg"],
    ["HARD",   "Quale attivista pacifista indiano è in foto?",          "Mahatma Gandhi",          "Mahatma-Gandhi, studio, 1931.jpg"],
  ],
  "geografia": [
    ["EASY",   "Quale celebre torre parigina è in foto?",               "Tour Eiffel",             "Tour Eiffel Wikimedia Commons.jpg"],
    ["MEDIUM", "Quale antica struttura cinese è raffigurata?",          "Grande Muraglia",         "20090529 Great Wall 8125.jpg"],
    ["HARD",   "Quale antica città scolpita nella roccia in Giordania?","Petra",                   "Petra Jordan BW 21.JPG"],
  ],
  "scienze": [
    ["EASY",   "Quale schema rappresenta la struttura di un atomo?",    "Atomo",                   "Stylised Lithium Atom.svg"],
    ["MEDIUM", "Quale schema biologico è raffigurato?",                 "DNA",                     "DNA simple.svg"],
    ["HARD",   "Quale strumento ottico da laboratorio è in foto?",      "Microscopio",             "Optical microscope nikon alphaphot.jpg"],
  ],
  "cultura-pop": [
    ["EASY",   "Quale celebre cantante britannico dei Queen è in foto?","Freddie Mercury",         "Freddie Mercury performing in New Haven, CT, November 1977.jpg"],
    ["MEDIUM", "Quale conduttrice italiana è in foto?",                 "Mara Venier",             "Mara Venier 2010.jpg"],
    ["HARD",   "Quale fumettista belga di Tintin è in foto?",           "Hergé",                   "Hergé op zijn werkkamer met de Brusselse vlag op het bureau.jpg"],
  ],
  "sport": [
    ["EASY",   "Quale celebre stadio romano è raffigurato?",            "Colosseo",                "Colosseo 2020.jpg"],
    ["MEDIUM", "Quale ex pugile mondiale americano è in foto?",         "Muhammad Ali",            "Muhammad Ali NYWTS.jpg"],
    ["HARD",   "Quale ex motociclista italiano 9 volte campione è in foto?", "Valentino Rossi",   "Valentino Rossi (cropped).jpg"],
  ],

  // ── STORIA (sub) ──
  "storia-antica": [
    ["EASY",   "Quale anfiteatro romano è in foto?",                     "Colosseo",               "Colosseum in Rome, Italy - April 2007.jpg"],
    ["MEDIUM", "Quale tempio greco sull'Acropoli è in foto?",             "Partenone",              "The Parthenon in Athens.jpg"],
    ["HARD",   "Quale antica città vesuviana è in questa veduta?",       "Pompei",                 "Pompeii Forum Italy.jpg"],
  ],
  "storia-medievale": [
    ["EASY",   "Quale castello iconico tedesco è in foto?",              "Castello di Neuschwanstein", "Schloss Neuschwanstein 2013.jpg"],
    ["MEDIUM", "Quale scultura di Michelangelo a Firenze è in foto?",    "David",                  "Michelangelo's David - 63 grijswaarden.png"],
    ["HARD",   "Quale fortezza-cattedrale parigina è in foto?",          "Notre-Dame",             "Notre-Dame de Paris 2013-07-24.jpg"],
  ],
  "storia-moderna": [
    ["EASY",   "Quale imperatore francese in posa famosa di David è raffigurato?", "Napoleone Bonaparte", "Jacques-Louis David - The Emperor Napoleon in His Study at the Tuileries - Google Art Project.jpg"],
    ["MEDIUM", "Quale scultura francese alla foce dell'Hudson è in foto?", "Statua della Libertà",  "Liberty-statue-from-below.jpg"],
    ["HARD",   "Quale palazzo russo a San Pietroburgo è in foto?",       "Palazzo d'Inverno",      "Spb 06-2017 img15 Hermitage.jpg"],
  ],
  "storia-contemporanea": [
    ["EASY",   "Quale presidente USA assassinato a Dallas è in foto?",   "John F. Kennedy",        "John F. Kennedy, White House color photo portrait.jpg"],
    ["MEDIUM", "Quale icona del muro di Berlino, foto di addio?",        "Muro di Berlino",        "Berlinermauer.jpg"],
    ["HARD",   "Quale leader cinese fondatore della RPC è in foto?",     "Mao Zedong",             "Mao Zedong portrait.jpg"],
  ],
  "storia-elementare": [
    ["EASY",   "Quale animale era sacro per gli antichi Egizi?",          "Gatto",                 "Cat November 2010-1a.jpg"],
    ["MEDIUM", "Quale strumento di scrittura usavano i Romani su tavolette di cera?", "Stilo", "Roman stylus.jpg"],
    ["HARD",   "Quale veicolo da guerra trainato da cavalli era usato nell'antichità?", "Carro", "Quadriga at Brandenburger Tor.jpg"],
  ],

  // ── GEOGRAFIA (sub) ──
  "geografia-italia": [
    ["EASY",   "Quale celebre torre pendente è in foto?",                "Torre di Pisa",         "Leaning Tower of Pisa JD09.jpg"],
    ["MEDIUM", "Quale celebre piazza veneziana con campanile è in foto?", "Piazza San Marco",     "Venezia Piazza San Marco.jpg"],
    ["HARD",   "Quale antico borgo trullato della Puglia è in foto?",    "Alberobello",           "Alberobello BW 2016-10-13 14-04-50.jpg"],
  ],
  "geografia-europa": [
    ["EASY",   "Quale celebre arco trionfale parigino è in foto?",       "Arco di Trionfo",       "Arc de Triomphe Paris 1.jpg"],
    ["MEDIUM", "Quale celebre statua bronzea sul lungomare di Copenaghen?", "Sirenetta",         "The Little Mermaid in Copenhagen.jpg"],
    ["HARD",   "Quale fontana barocca romana è in foto?",                "Fontana di Trevi",      "Fontana di Trevi - Front view.jpg"],
  ],
  "geografia-mondo": [
    ["EASY",   "Quale ponte californiano rosso è in foto?",              "Golden Gate",           "GoldenGateBridge-001.jpg"],
    ["MEDIUM", "Quale tempio cambogiano dell'XII secolo è in foto?",     "Angkor Wat",            "Angkor Wat 2014.jpg"],
    ["HARD",   "Quale rovina maya messicana, piramide a 4 lati, è in foto?", "Chichén Itzá",     "El Castillo at Chichen Itza.jpg"],
  ],

  // ── SPORT (sub) ──
  "sport-calcio": [
    ["EASY",   "Quale calciatore argentino numero 10 è in foto?",         "Diego Armando Maradona", "Diego Maradona 1986.jpg"],
    ["MEDIUM", "Quale calciatore portoghese del Real Madrid e Manchester United è in foto?", "Cristiano Ronaldo", "Cristiano Ronaldo 2018.jpg"],
    ["HARD",   "Quale stadio di Manchester United è in foto?",            "Old Trafford",          "Old Trafford 2010.jpg"],
  ],
  "sport-tennis": [
    ["EASY",   "Quale tennista svizzero record di Wimbledon è in foto?",  "Roger Federer",         "Roger Federer 2009 Australian Open Champion.jpg"],
    ["MEDIUM", "Quale tennista spagnolo re della terra rossa è in foto?", "Rafael Nadal",          "Rafael Nadal 2011 Roland Garros.jpg"],
    ["HARD",   "Quale stadio del Roland Garros è in foto?",               "Stadio Philippe Chatrier", "Court Philippe Chatrier - 2018.jpg"],
  ],
  "sport-basket": [
    ["EASY",   "Quale leggendario cestista numero 23 dei Bulls è in foto?", "Michael Jordan",      "Michael Jordan 24 Sept 2014.jpg"],
    ["MEDIUM", "Quale arena dei Boston Celtics è in foto?",                "TD Garden",             "TD Garden 2017.jpg"],
    ["HARD",   "Quale ex Sixers e Lakers detentore del record di punti per partita è in foto?", "Wilt Chamberlain", "Wilt Chamberlain 1967.jpg"],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Quale celebre velocista giamaicano è in foto?",            "Usain Bolt",           "Usain Bolt celebrating victory.jpg"],
    ["MEDIUM", "Quale stadio di Atene fu sede delle prime Olimpiadi moderne 1896?", "Stadio Panathinaiko", "Panathenean Stadium.jpg"],
    ["HARD",   "Quale ginnasta romena 10 perfetti a Montreal 1976?",       "Nadia Comăneci",       "Nadia Comaneci 1976.jpg"],
  ],

  // ── SCIENZE (sub) ──
  "scienze-fisica": [
    ["EASY",   "Quale celebre formula di Einstein è raffigurata?",         "E=mc²",                 "Einstein equation.svg"],
    ["MEDIUM", "Quale strumento misura la temperatura?",                   "Termometro",            "Clinical thermometer 38.7.JPG"],
    ["HARD",   "Quale grande acceleratore di particelle del CERN è in foto?", "Large Hadron Collider", "CERN LHC Tunnel1.jpg"],
  ],
  "scienze-chimica": [
    ["EASY",   "Quale apparecchio da laboratorio per misurare volumi è in foto?", "Becher", "Beaker.jpg"],
    ["MEDIUM", "Quale celebre tabella ordina gli elementi chimici?",        "Tavola periodica",     "Simple Periodic Table Chart-blocks.svg"],
    ["HARD",   "Quale gas verrebbe emesso bruciando un fiammifero?",         "Anidride carbonica",   "Carbon dioxide pressure-temperature phase diagram.svg"],
  ],
  "scienze-biologia": [
    ["EASY",   "Quale animale terrestre più grande è in foto?",             "Elefante",             "African Bush Elephant.jpg"],
    ["MEDIUM", "Quale cellula sessuale femminile è raffigurata?",           "Ovulo",                "Sperm-egg.jpg"],
    ["HARD",   "Quale botanico svedese padre della tassonomia è in foto?",  "Carl Linnaeus",        "Carl von Linné.jpg"],
  ],
  "scienze-astronomia": [
    ["EASY",   "Quale pianeta del sistema solare con anelli è in foto?",    "Saturno",              "Saturn during Equinox.jpg"],
    ["MEDIUM", "Quale galassia a spirale è la nostra?",                     "Via Lattea",           "Milky Way Arch.jpg"],
    ["HARD",   "Quale famoso telescopio spaziale lanciato nel 1990 è in foto?", "Hubble",          "HST-SM4.jpeg"],
  ],

  // ── CULTURA POP (sub) ──
  "cinema": [
    ["EASY",   "Quale regista americano di Star Wars è in foto?",           "George Lucas",         "George Lucas cropped 2009.jpg"],
    ["MEDIUM", "Quale attore italiano di 'La vita è bella' è in foto?",     "Roberto Benigni",      "Roberto Benigni Cannes 2017.jpg"],
    ["HARD",   "Quale regista francese della Nouvelle Vague è in foto?",    "Jean-Luc Godard",      "Jean Luc Godard 1968.jpg"],
  ],
  "musica": [
    ["EASY",   "Quale leggendario cantante americano del rock è in foto?",  "Elvis Presley",        "Elvis Presley 1970.jpg"],
    ["MEDIUM", "Quale cantautore italiano genovese è in foto?",             "Fabrizio De André",    "Fabrizio De André 1977.jpg"],
    ["HARD",   "Quale compositore austriaco di 'Le nozze di Figaro' è in foto (ritratto)?", "Mozart", "Wolfgang-amadeus-mozart 1.jpg"],
  ],
  "serie-tv": [
    ["EASY",   "Quale famiglia gialla protagonista di una sitcom animata è in foto?", "Simpson", "The Simpsons 1990 Season 2.png"],
    ["MEDIUM", "Quale serie HBO sui troni e draghi è raffigurata dal logo?", "Game of Thrones",    "Game of Thrones 2011 logo.svg"],
    ["HARD",   "Quale serie britannica con il Dottore alieno è in foto?",   "Doctor Who",            "Doctor Who logo (2010-2017).svg"],
  ],
  "videogiochi": [
    ["EASY",   "Quale console portatile Nintendo del 1989 è in foto?",      "Game Boy",              "Nintendo-Game-Boy-FL.jpg"],
    ["MEDIUM", "Quale spada leggendaria di Zelda è raffigurata?",           "Master Sword",          "Master Sword.jpg"],
    ["HARD",   "Quale primo arcade Nintendo del 1981 con scimmione è in foto?", "Donkey Kong",      "Donkey Kong arcade.jpg"],
  ],
};

// ── Esecuzione ──
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
for (const c of db.prepare(`SELECT id, slug FROM Category`).all()) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, openAnswer, imageUrl, mediaType, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'IMAGE_GUESS', ?, 30, 100, ?, ?, 'image', ?, datetime('now'), datetime('now'))
`);

let total = 0, missing = 0;
for (const [slug, items] of Object.entries(QUESTIONS_BY_SLUG)) {
  const catId = slugToId.get(slug);
  if (!catId) { missing++; continue; }
  for (const [difficulty, text, openAns, filename] of items) {
    if (APPLY) {
      const url = wiki(filename);
      insertQ.run(makeId(), text, difficulty, openAns, url, catId);
    }
    total++;
  }
}

console.log(`Domande processate: ${total} (categorie mancanti: ${missing})`);
if (APPLY) {
  const counts = db.prepare(`
    SELECT c.slug,
      SUM(CASE WHEN q.difficulty='EASY' THEN 1 ELSE 0 END) AS e,
      SUM(CASE WHEN q.difficulty='MEDIUM' THEN 1 ELSE 0 END) AS m,
      SUM(CASE WHEN q.difficulty='HARD' THEN 1 ELSE 0 END) AS h
    FROM Category c
    LEFT JOIN Question q ON q.categoryId = c.id AND q.type='IMAGE_GUESS'
    GROUP BY c.id HAVING e + m + h > 0
    ORDER BY c.name
  `).all();
  for (const r of counts) console.log(`  ${r.slug}: E=${r.e} M=${r.m} H=${r.h}`);
}
console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run."}`);
db.close();
