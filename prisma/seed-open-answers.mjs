// Seed di 81 domande OPEN_ANSWER: 3 per categoria (1 EASY, 1 MEDIUM, 1 HARD).
// Le categorie sono identificate per slug (più stabile dell'id).
// Esecuzione (raw SQL via node:sqlite, no Prisma):
//   node --experimental-sqlite prisma/seed-open-answers.mjs              # dry-run
//   node --experimental-sqlite prisma/seed-open-answers.mjs --apply      # inserisce nel DB

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

// cuid simile (Prisma usa cuid). Usiamo prefisso fisso "oa_" + 24 char base36 random.
function makeId() {
  let s = "oa";
  for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

// Domande organizzate per slug categoria. Per OPEN_ANSWER l'host giudica manualmente,
// ma openAnswer serve come riferimento per la valutazione + per i tipi auto-check (futuro).
// Domande con topic specifici, scelti per evitare sovrapposizione con il DB esistente
// (~1900 domande già presenti). Verificate dallo scanner: 0 sovrapposizioni significative.
const QUESTIONS_BY_SLUG = {
  // ── ROOT (7) ──
  "arte-cultura": [
    ["EASY",   "Quale artista olandese si tagliò un orecchio?", "Vincent van Gogh"],
    ["MEDIUM", "In quale chiesa di Roma si trova 'La Vocazione di San Matteo' di Caravaggio?", "San Luigi dei Francesi"],
    ["HARD",   "Quale architetto progettò la Sagrada Familia di Barcellona?", "Antoni Gaudí"],
  ],
  "scienza": [
    ["EASY",   "Quanti elettroni ha un atomo neutro di idrogeno?", "1"],
    ["MEDIUM", "Cosa significa l'acronimo LASER?", "Light Amplification by Stimulated Emission of Radiation"],
    ["HARD",   "Chi è considerato il padre della medicina occidentale?", "Ippocrate"],
  ],
  "storia": [
    ["EASY",   "Quale regina inglese ha regnato più a lungo nella storia britannica?", "Elisabetta II"],
    ["MEDIUM", "Quale assassinio del 1914 fece scoppiare la Prima Guerra Mondiale?", "Francesco Ferdinando d'Asburgo"],
    ["HARD",   "Quale faraone bambino vide la sua tomba scoperta da Howard Carter nel 1922?", "Tutankhamon"],
  ],
  "geografia": [
    ["EASY",   "In quale oceano si trovano le isole Hawaii?", "Pacifico"],
    ["MEDIUM", "Qual è il paese più popoloso al mondo (al 2024)?", "India"],
    ["HARD",   "Quale è il deserto più freddo del mondo?", "Antartide"],
  ],
  "scienze": [
    ["EASY",   "Qual è la velocità approssimata del suono nell'aria, in metri al secondo?", "343"],
    ["MEDIUM", "Come si chiama lo strumento usato per misurare la pressione del sangue?", "Sfigmomanometro"],
    ["HARD",   "Quale particella del Modello Standard è responsabile della massa?", "Bosone di Higgs"],
  ],
  "cultura-pop": [
    ["EASY",   "Quale band britannica ha pubblicato l'album 'Abbey Road'?", "Beatles"],
    ["MEDIUM", "Come si chiama il gioco da tavolo dove si comprano case e alberghi sui colori?", "Monopoly"],
    ["HARD",   "Quale romanzo di Tolkien, prequel del Signore degli Anelli, segue le avventure di Bilbo?", "Lo Hobbit"],
  ],
  "sport": [
    ["EASY",   "Quale sport si pratica colpendo un volano oltre la rete?", "Badminton"],
    ["MEDIUM", "Quale sport olimpico mescola scherma, equitazione, nuoto, tiro e corsa?", "Pentathlon moderno"],
    ["HARD",   "Quale paese ha vinto più medaglie d'oro nella storia delle Olimpiadi (totale)?", "Stati Uniti"],
  ],

  // ── STORIA (sub) ──
  "storia-antica": [
    ["EASY",   "In quale città si trova il Partenone?", "Atene"],
    ["MEDIUM", "Quale dio greco è il padre di Apollo e Artemide?", "Zeus"],
    ["HARD",   "Chi furono i due fondatori della scuola filosofica stoica?", "Zenone di Cizio"],
  ],
  "storia-medievale": [
    ["EASY",   "Quale re franco fu incoronato imperatore nel 800?", "Carlo Magno"],
    ["MEDIUM", "Quale dinastia governò la Cina dal 1368 al 1644, costruendo la Città Proibita?", "Ming"],
    ["HARD",   "Chi fu il fondatore dell'ordine monastico benedettino?", "San Benedetto da Norcia"],
  ],
  "storia-moderna": [
    ["EASY",   "Chi fu la regina di Francia ghigliottinata nel 1793?", "Maria Antonietta"],
    ["MEDIUM", "Quale principessa azteca fece da interprete a Hernán Cortés durante la conquista del Messico?", "La Malinche"],
    ["HARD",   "Chi guidò la Spedizione dei Mille nel 1860?", "Giuseppe Garibaldi"],
  ],
  "storia-contemporanea": [
    ["EASY",   "Quale evento del 2001 cambiò la geopolitica mondiale?", "Attentati dell'11 settembre"],
    ["MEDIUM", "Chi fu il primo Segretario Generale dell'ONU?", "Trygve Lie"],
    ["HARD",   "Chi fu il leader cinese che guidò la 'Lunga Marcia' nel 1934-35?", "Mao Zedong"],
  ],
  "storia-elementare": [
    ["EASY",   "Quale popolo costruiva piramidi sul Nilo?", "Egizi"],
    ["MEDIUM", "Come si chiamavano i guerrieri greci più temuti, originari di Sparta?", "Spartani"],
    ["HARD",   "Quale popolo dipinse le grotte di Lascaux nel Paleolitico?", "Cro-Magnon"],
  ],

  // ── GEOGRAFIA (sub) ──
  "geografia-italia": [
    ["EASY",   "In quale regione italiana si trova il monte Vesuvio?", "Campania"],
    ["MEDIUM", "Qual è il capoluogo della regione Marche?", "Ancona"],
    ["HARD",   "Qual è la vetta più alta delle Alpi italiane?", "Monte Bianco"],
  ],
  "geografia-europa": [
    ["EASY",   "In quale paese si trova la Tour Eiffel?", "Francia"],
    ["MEDIUM", "Qual è il paese più piccolo dell'Unione Europea per superficie?", "Malta"],
    ["HARD",   "Qual è il punto più alto della Germania?", "Zugspitze"],
  ],
  "geografia-mondo": [
    ["EASY",   "In quale paese si trovano le piramidi di Giza?", "Egitto"],
    ["MEDIUM", "Quale catena montuosa percorre per oltre 7000 km la costa occidentale del Sud America?", "Ande"],
    ["HARD",   "Qual è la cascata più alta del mondo, situata in Venezuela?", "Salto Angel"],
  ],

  // ── SPORT (sub) ──
  "sport-calcio": [
    ["EASY",   "Quale colore di cartellino indica un'espulsione?", "Rosso"],
    ["MEDIUM", "Quale calciatore ha vinto il maggior numero di Palloni d'Oro nella storia?", "Lionel Messi"],
    ["HARD",   "Chi è il calciatore con più presenze nella nazionale italiana?", "Gianluigi Buffon"],
  ],
  "sport-tennis": [
    ["EASY",   "Quanti giocatori si affrontano in una partita di singolo?", "2"],
    ["MEDIUM", "Quanti tornei dello Slam si giocano ogni anno?", "4"],
    ["HARD",   "Quale tennista svedese vinse 5 Wimbledon consecutivi tra 1976 e 1980?", "Björn Borg"],
  ],
  "sport-basket": [
    ["EASY",   "Quanti giocatori titolari ha una squadra di basket in campo?", "5"],
    ["MEDIUM", "Quanti minuti dura un quarto di una partita NBA?", "12"],
    ["HARD",   "Chi è il giocatore NBA che ha vinto più titoli MVP della stagione regolare?", "Kareem Abdul-Jabbar"],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Quanti tipi di medaglie esistono in un'Olimpiade (oro, argento, bronzo)?", "3"],
    ["MEDIUM", "In quale città si tennero le prime Olimpiadi del dopoguerra nel 1948?", "Londra"],
    ["HARD",   "Quale ginnasta sovietico vinse 8 medaglie a Mosca 1980?", "Aleksandr Dityatin"],
  ],

  // ── SCIENZE (sub) ──
  "scienze-fisica": [
    ["EASY",   "Quanti stati della materia si studiano nelle scuole superiori (esclusa la materia esotica)?", "3"],
    ["MEDIUM", "Cosa misura il decibel?", "Intensità sonora"],
    ["HARD",   "Quale fenomeno descrive la luce che cambia direzione passando da un mezzo all'altro?", "Rifrazione"],
  ],
  "scienze-chimica": [
    ["EASY",   "Qual è il simbolo chimico del rame?", "Cu"],
    ["MEDIUM", "Quale gas si forma come prodotto della fermentazione alcolica?", "Anidride carbonica"],
    ["HARD",   "Quale tipo di legame intermolecolare tiene unite le molecole d'acqua?", "Legame a idrogeno"],
  ],
  "scienze-biologia": [
    ["EASY",   "Quale organo respiratorio hanno i pesci?", "Branchie"],
    ["MEDIUM", "Quanti tipi di tessuto muscolare esistono nel corpo umano?", "3"],
    ["HARD",   "Quale parte del cervello è coinvolta nella regolazione di emozioni e memoria?", "Sistema limbico"],
  ],
  "scienze-astronomia": [
    ["EASY",   "Qual è la stella più luminosa che vediamo nel cielo notturno (esclusi i pianeti)?", "Sirio"],
    ["MEDIUM", "Quale sonda della NASA ha esplorato Plutone nel 2015?", "New Horizons"],
    ["HARD",   "Cosa rimane dopo l'esplosione di una supernova di tipo II di massa moderata?", "Stella di neutroni"],
  ],

  // ── CULTURA POP (sub) ──
  "cinema": [
    ["EASY",   "Quale film del 1997 racconta la storia d'amore di Jack e Rose sulla nave naufragata?", "Titanic"],
    ["MEDIUM", "Quale attrice italiana vinse l'Oscar come miglior attrice per 'La ciociara'?", "Sophia Loren"],
    ["HARD",   "Chi ha diretto 'C'era una volta in America'?", "Sergio Leone"],
  ],
  "musica": [
    ["EASY",   "Quanti tasti ha un pianoforte tradizionale?", "88"],
    ["MEDIUM", "Quale strumento musicale è iconicamente associato a Jimi Hendrix?", "Chitarra elettrica"],
    ["HARD",   "Chi è il chitarrista famoso per l'assolo di 'Stairway to Heaven' dei Led Zeppelin?", "Jimmy Page"],
  ],
  "serie-tv": [
    ["EASY",   "In quale serie un gruppo di scienziati nerd vive a Pasadena?", "The Big Bang Theory"],
    ["MEDIUM", "Quante stagioni ha la serie 'Lost' in totale?", "6"],
    ["HARD",   "Chi è il creatore della serie cult 'Twin Peaks'?", "David Lynch"],
  ],
  "videogiochi": [
    ["EASY",   "In quale gioco si costruisce e si esplora un mondo composto da blocchi cubici?", "Minecraft"],
    ["MEDIUM", "Chi è il protagonista della serie 'The Legend of Zelda'?", "Link"],
    ["HARD",   "Chi è l'informatico russo che ha creato il videogioco 'Tetris'?", "Aleksej Pažitnov"],
  ],
};

// ── Esecuzione ─────────────────────────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
const cats = db.prepare(`SELECT id, slug FROM Category`).all();
for (const c of cats) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, openAnswer, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'OPEN_ANSWER', ?, 30, 100, ?, ?, datetime('now'), datetime('now'))
`);

let total = 0, missing = 0;
const missingSlugs = [];

for (const [slug, items] of Object.entries(QUESTIONS_BY_SLUG)) {
  const catId = slugToId.get(slug);
  if (!catId) { missing++; missingSlugs.push(slug); continue; }
  for (const [difficulty, text, openAnswer] of items) {
    if (APPLY) insertQ.run(makeId(), text, difficulty, openAnswer, catId);
    total++;
  }
}

console.log(`Domande processate: ${total}/${total + missing * 3}`);
if (missingSlugs.length) console.log(`Slug categoria non trovati: ${missingSlugs.join(", ")}`);

if (APPLY) {
  // Verifica
  const counts = db.prepare(`
    SELECT c.slug, c.name,
      SUM(CASE WHEN q.difficulty='EASY' THEN 1 ELSE 0 END) AS e,
      SUM(CASE WHEN q.difficulty='MEDIUM' THEN 1 ELSE 0 END) AS m,
      SUM(CASE WHEN q.difficulty='HARD' THEN 1 ELSE 0 END) AS h
    FROM Category c
    LEFT JOIN Question q ON q.categoryId = c.id AND q.type='OPEN_ANSWER'
    GROUP BY c.id
    HAVING e + m + h > 0
    ORDER BY c.name
  `).all();
  console.log(`\nDistribuzione finale OPEN_ANSWER per categoria:`);
  for (const r of counts) console.log(`  ${r.slug}: E=${r.e} M=${r.m} H=${r.h}`);
}

console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run. Rilancia con --apply per scrivere."}`);
db.close();
