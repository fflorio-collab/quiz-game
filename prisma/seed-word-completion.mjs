// Seed di 81 domande WORD_COMPLETION: 3 per categoria (1 EASY, 1 MEDIUM, 1 HARD).
// Schema: Question con wordTemplate (es. "M_L_NO") + 1 Answer con la parola intera (isCorrect=true).
// Il template è generato automaticamente nascondendo le lettere in posizione dispari (alternato).
// Difficoltà = obscurità della parola, non % di lettere nascoste.
//
//   node --experimental-sqlite prisma/seed-word-completion.mjs            # dry-run
//   node --experimental-sqlite prisma/seed-word-completion.mjs --apply    # inserisce

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function makeId() {
  let s = "wc";
  for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

// Maschera alternata: nasconde le lettere in posizione dispari (M_L_N_ per "MILANO").
function template(word) {
  return word.toUpperCase().split("").map((c, i) => (i % 2 === 1 ? "_" : c)).join("");
}

// Per ogni categoria: 3 [difficulty, hintQuestion, fullWord]
const QUESTIONS_BY_SLUG = {
  // ── ROOT (7) ──
  "arte-cultura": [
    ["EASY",   "Capolavoro di Botticelli con la dea che esce dal mare",                 "VENERE"],
    ["MEDIUM", "Stile artistico italiano del XVII secolo, drammatico ed esuberante",     "BAROCCO"],
    ["HARD",   "Pittore norvegese autore del celebre 'L'Urlo'",                          "MUNCH"],
  ],
  "scienza": [
    ["EASY",   "Forma di carbonio che compone il piombo delle matite",                  "GRAFITE"],
    ["MEDIUM", "Strumento ottico che permette di osservare le cellule",                 "MICROSCOPIO"],
    ["HARD",   "Particella elementare quanto della luce",                                "FOTONE"],
  ],
  "storia": [
    ["EASY",   "Carica politica più alta dell'antica Repubblica Romana",                "CONSOLE"],
    ["MEDIUM", "Periodo che segue il Medioevo, di rinascita di arte e scienza",         "RINASCIMENTO"],
    ["HARD",   "Antica civiltà mesopotamica famosa per i Giardini Pensili",             "BABILONIA"],
  ],
  "geografia": [
    ["EASY",   "Vasta foresta tropicale del Sud America",                                "AMAZZONIA"],
    ["MEDIUM", "Antico monumento megalitico nel sud dell'Inghilterra fatto di grandi pietre", "STONEHENGE"],
    ["HARD",   "Capitale dei Paesi Bassi",                                               "AMSTERDAM"],
  ],
  "scienze": [
    ["EASY",   "Unità più piccola della materia con proprietà chimiche",                "ATOMO"],
    ["MEDIUM", "Proteina che catalizza reazioni biochimiche",                           "ENZIMA"],
    ["HARD",   "Particella subatomica neutra con massa quasi nulla",                    "NEUTRINO"],
  ],
  "cultura-pop": [
    ["EASY",   "Supereroe DC mascherato che vive a Gotham City",                        "BATMAN"],
    ["MEDIUM", "Film di James Cameron del 2009 ambientato su Pandora",                  "AVATAR"],
    ["HARD",   "Misterioso street artist britannico anonimo",                           "BANKSY"],
  ],
  "sport": [
    ["EASY",   "Sport che si gioca con racchetta su un campo con rete",                 "TENNIS"],
    ["MEDIUM", "Sport in cui si tira una pallina con una mazza in 18 buche",            "GOLF"],
    ["HARD",   "Sport invernale in cui si scivolano pietre sul ghiaccio",               "CURLING"],
  ],

  // ── STORIA (sub) ──
  "storia-antica": [
    ["EASY",   "Antica città-stato greca rivale di Atene",                              "SPARTA"],
    ["MEDIUM", "Combattente che si esibiva nei giochi del Colosseo",                    "GLADIATORE"],
    ["HARD",   "Tragediografo greco autore dei 'Persiani'",                             "ESCHILO"],
  ],
  "storia-medievale": [
    ["EASY",   "Costruzione fortificata medievale, casa dei nobili",                    "CASTELLO"],
    ["MEDIUM", "Cavaliere appartenente a un ordine religioso-militare medievale",       "TEMPLARE"],
    ["HARD",   "Popolo nordico che esplorò Europa e Nord America con drakkar",          "VICHINGHI"],
  ],
  "storia-moderna": [
    ["EASY",   "Continente scoperto da Cristoforo Colombo",                             "AMERICA"],
    ["MEDIUM", "Imperatore francese sconfitto a Waterloo",                              "NAPOLEONE"],
    ["HARD",   "Diplomatico francese protagonista del Congresso di Vienna",             "TALLEYRAND"],
  ],
  "storia-contemporanea": [
    ["EASY",   "Dittatore tedesco al potere dal 1933 al 1945",                          "HITLER"],
    ["MEDIUM", "Penisola asiatica divisa dalla guerra del 1950-1953",                   "COREA"],
    ["HARD",   "Leader sovietico riformatore della perestrojka",                        "GORBACEV"],
  ],
  "storia-elementare": [
    ["EASY",   "Monumento a forma di triangolo costruito dagli Egizi",                  "PIRAMIDE"],
    ["MEDIUM", "Arma corta romana, simbolo del legionario",                             "GLADIO"],
    ["HARD",   "Antico popolo navigatore del Mediterraneo, inventore dell'alfabeto",    "FENICI"],
  ],

  // ── GEOGRAFIA (sub) ──
  "geografia-italia": [
    ["EASY",   "Vulcano siciliano in costante attività",                                "ETNA"],
    ["MEDIUM", "Seconda isola più grande del Mediterraneo, italiana",                   "SARDEGNA"],
    ["HARD",   "Massiccio montuoso più alto della Sardegna",                            "GENNARGENTU"],
  ],
  "geografia-europa": [
    ["EASY",   "Famosa città universitaria inglese sul Tamigi",                         "OXFORD"],
    ["MEDIUM", "Penisola del sud-est europeo che include Grecia, Serbia, Bulgaria",     "BALCANI"],
    ["HARD",   "Capitale dell'Islanda",                                                 "REYKJAVIK"],
  ],
  "geografia-mondo": [
    ["EASY",   "Più grande deserto caldo del mondo, in Africa",                         "SAHARA"],
    ["MEDIUM", "Insieme di isole tropicali tra Nord e Sud America",                     "CARAIBI"],
    ["HARD",   "Iconico monolito rosso nel deserto australiano",                        "ULURU"],
  ],

  // ── SPORT (sub) ──
  "sport-calcio": [
    ["EASY",   "Funzionario in campo che fischia falli e ammonisce",                    "ARBITRO"],
    ["MEDIUM", "Tattica difensiva italiana resa celebre negli anni '60",                "CATENACCIO"],
    ["HARD",   "Allenatore italiano vincitore della Champions League con il Milan 1994", "CAPELLO"],
  ],
  "sport-tennis": [
    ["EASY",   "Colpo che inizia ogni punto in una partita di tennis",                  "SERVIZIO"],
    ["MEDIUM", "Quando il ricevitore vince un game al servizio dell'avversario",        "BREAK"],
    ["HARD",   "Tennista australiano vincitore di 8 Slam nell'era pre-Open",            "ROSEWALL"],
  ],
  "sport-basket": [
    ["EASY",   "Bersaglio del basket dove si manda la palla",                           "CANESTRO"],
    ["MEDIUM", "Tiro spettacolare a due mani direttamente nel canestro",                "SCHIACCIATA"],
    ["HARD",   "Ruolo del giocatore più alto, vicino a canestro",                       "PIVOT"],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Cosa viene portata fino allo stadio per accendere il braciere olimpico", "TORCIA"],
    ["MEDIUM", "Gara di corsa olimpica lunga 42,195 km",                                "MARATONA"],
    ["HARD",   "Velocista italiano oro nei 200m a Mosca 1980",                          "MENNEA"],
  ],

  // ── SCIENZE (sub) ──
  "scienze-fisica": [
    ["EASY",   "Unità di misura della densità del campo magnetico",                    "TESLA"],
    ["MEDIUM", "Particella elementare costituente di protoni e neutroni",               "QUARK"],
    ["HARD",   "Particella con spin semi-intero (es. elettroni e quark)",               "FERMIONE"],
  ],
  "scienze-chimica": [
    ["EASY",   "Composto NaCl che usiamo in cucina",                                    "SALE"],
    ["MEDIUM", "Alcol presente nelle bevande alcoliche",                                "ETANOLO"],
    ["HARD",   "Elemento chimico numero 4 della tavola periodica",                      "BERILLIO"],
  ],
  "scienze-biologia": [
    ["EASY",   "Cellula del sistema nervoso che trasmette segnali",                     "NEURONE"],
    ["MEDIUM", "Sostanza gelatinosa che riempie l'interno di una cellula",              "CITOPLASMA"],
    ["HARD",   "Organello cellulare deputato alla sintesi proteica",                    "RIBOSOMA"],
  ],
  "scienze-astronomia": [
    ["EASY",   "Corpo celeste luminoso come il Sole",                                   "STELLA"],
    ["MEDIUM", "Corpo celeste con coda visibile, fatto di ghiaccio e polvere",          "COMETA"],
    ["HARD",   "Oggetto cosmico estremamente luminoso al centro di galassie attive",    "QUASAR"],
  ],

  // ── CULTURA POP (sub) ──
  "cinema": [
    ["EASY",   "Persona che dirige un film",                                            "REGISTA"],
    ["MEDIUM", "Regista di '2001: Odissea nello Spazio' (cognome)",                     "KUBRICK"],
    ["HARD",   "Regista svedese di 'Il settimo sigillo' (cognome)",                     "BERGMAN"],
  ],
  "musica": [
    ["EASY",   "Pulsazione regolare di un brano musicale",                              "RITMO"],
    ["MEDIUM", "Strumento a fiato di legno tenuto orizzontalmente",                     "FLAUTO"],
    ["HARD",   "Antico strumento a tastiera barocco con corde pizzicate",               "CLAVICEMBALO"],
  ],
  "serie-tv": [
    ["EASY",   "Serie HBO sulla famiglia mafiosa newyorkese di Tony",                   "SOPRANOS"],
    ["MEDIUM", "Detective consulente di Baker Street nella serie BBC",                  "SHERLOCK"],
    ["HARD",   "Serie HBO ambientata in un parco a tema con androidi",                  "WESTWORLD"],
  ],
  "videogiochi": [
    ["EASY",   "Personaggio giallo che mangia pillole inseguito dai fantasmi",         "PACMAN"],
    ["MEDIUM", "Pokémon giallo elettrico mascotte della saga",                          "PIKACHU"],
    ["HARD",   "Game designer giapponese creatore di Metal Gear (cognome)",             "KOJIMA"],
  ],
};

// ── Esecuzione ──
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
for (const c of db.prepare(`SELECT id, slug FROM Category`).all()) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, wordTemplate, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'WORD_COMPLETION', ?, 20, 100, ?, ?, datetime('now'), datetime('now'))
`);
const insertA = db.prepare(`
  INSERT INTO Answer (id, text, isCorrect, questionId, "order")
  VALUES (?, ?, 1, ?, 0)
`);

let total = 0, missing = 0;
for (const [slug, items] of Object.entries(QUESTIONS_BY_SLUG)) {
  const catId = slugToId.get(slug);
  if (!catId) { missing++; continue; }
  for (const [difficulty, text, word] of items) {
    const tpl = template(word);
    if (APPLY) {
      const qId = makeId();
      insertQ.run(qId, text, difficulty, tpl, catId);
      insertA.run(makeId(), word.toUpperCase(), qId);
    }
    total++;
  }
}

console.log(`Domande processate: ${total} (categorie mancanti: ${missing})\n`);

if (APPLY) {
  const counts = db.prepare(`
    SELECT c.slug,
      SUM(CASE WHEN q.difficulty='EASY' THEN 1 ELSE 0 END) AS e,
      SUM(CASE WHEN q.difficulty='MEDIUM' THEN 1 ELSE 0 END) AS m,
      SUM(CASE WHEN q.difficulty='HARD' THEN 1 ELSE 0 END) AS h
    FROM Category c
    LEFT JOIN Question q ON q.categoryId = c.id AND q.type='WORD_COMPLETION'
    GROUP BY c.id HAVING e + m + h > 0
    ORDER BY c.name
  `).all();
  for (const r of counts) console.log(`  ${r.slug}: E=${r.e} M=${r.m} H=${r.h}`);
}

console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run."}`);
db.close();
