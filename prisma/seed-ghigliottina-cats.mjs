// Seed di 81 domande GHIGLIOTTINA: 3 per categoria (E/M/H).
// Schema: text = frase-indizio, openAnswer = parola da indovinare.
// Differente dal seed-ghigliottina.ts originale (che mette tutto in 1 sola categoria).
// Qui distribuiamo per categoria, con parole/frasi distinte da quelle già nel DB.
//
//   node --experimental-sqlite prisma/seed-ghigliottina-cats.mjs            # dry-run
//   node --experimental-sqlite prisma/seed-ghigliottina-cats.mjs --apply

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function makeId() {
  let s = "gh";
  for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

// [difficulty, hint, word]
const QUESTIONS_BY_SLUG = {
  "arte-cultura": [
    ["EASY",   "Si dipingeva su intonaco fresco",               "AFFRESCO"],
    ["MEDIUM", "Tecnica musiva di tessere colorate",            "MOSAICO"],
    ["HARD",   "Stile decorativo francese del Settecento",      "ROCOCO"],
  ],
  "scienza": [
    ["EASY",   "Lo accendiamo per illuminare la stanza",        "LAMPADA"],
    ["MEDIUM", "Fenomeno per cui la pelle si abbronza al sole", "MELANINA"],
    ["HARD",   "Strumento per misurare l'umidità dell'aria",    "IGROMETRO"],
  ],
  "storia": [
    ["EASY",   "Documento solenne firmato dai capi di Stato",   "TRATTATO"],
    ["MEDIUM", "Periodo italiano di unificazione nazionale",    "RISORGIMENTO"],
    ["HARD",   "Documento che pose limiti al re inglese 1215",  "MAGNACARTA"],
  ],
  "geografia": [
    ["EASY",   "Linea immaginaria che divide la Terra a metà",  "EQUATORE"],
    ["MEDIUM", "Penisola scandinava più a nord",                "LAPPONIA"],
    ["HARD",   "Stretto tra Sicilia e Calabria",                "MESSINA"],
  ],
  "scienze": [
    ["EASY",   "Bevanda calda d'inverno fatta con foglie",      "TISANA"],
    ["MEDIUM", "Disciplina che studia gli insetti",             "ENTOMOLOGIA"],
    ["HARD",   "Disciplina che studia i terremoti",             "SISMOLOGIA"],
  ],
  "cultura-pop": [
    ["EASY",   "Festa con maschere e travestimenti",            "CARNEVALE"],
    ["MEDIUM", "Romanzo grafico illustrato a strisce",          "FUMETTO"],
    ["HARD",   "Piattaforma streaming Netflix concorrente nata da Disney", "DISNEYPLUS"],
  ],
  "sport": [
    ["EASY",   "Lo si fa correndo sulla neve con due assi",     "SCI"],
    ["MEDIUM", "Disciplina con cavallo e ostacoli",             "EQUITAZIONE"],
    ["HARD",   "Sport orientale con cintura nera",              "JUDO"],
  ],

  "storia-antica": [
    ["EASY",   "Lingua parlata dai Romani",                     "LATINO"],
    ["MEDIUM", "Tela tessuta che raccontava battaglie",         "ARAZZO"],
    ["HARD",   "Carro da guerra a due ruote",                   "BIGA"],
  ],
  "storia-medievale": [
    ["EASY",   "Cavaliere errante in cerca d'avventure",        "PALADINO"],
    ["MEDIUM", "Spada a due mani lunga e pesante",              "SPADONE"],
    ["HARD",   "Tassa medievale pagata al signore feudale",     "DECIMA"],
  ],
  "storia-moderna": [
    ["EASY",   "Macchina inventata per cucire",                 "TELAIO"],
    ["MEDIUM", "Strumento di tortura della Rivoluzione",        "GHIGLIOTTINA"],
    ["HARD",   "Documento che dichiarò l'indipendenza USA",     "DICHIARAZIONE"],
  ],
  "storia-contemporanea": [
    ["EASY",   "Periodo di pace tesa tra USA e URSS",           "GUERRAFREDDA"],
    ["MEDIUM", "Cortina che divideva Est e Ovest in Europa",    "FERRO"],
    ["HARD",   "Movimento femminile per il voto",               "SUFFRAGETTE"],
  ],
  "storia-elementare": [
    ["EASY",   "Veicolo a due ruote che si pedala",             "BICICLETTA"],
    ["MEDIUM", "Cosa portavano i Re Magi a Gesù",               "DONI"],
    ["HARD",   "Antico simbolo di buon augurio piegato a barchetta", "ORIGAMI"],
  ],

  "geografia-italia": [
    ["EASY",   "Catena montuosa che attraversa l'Italia da nord a sud", "APPENNINI"],
    ["MEDIUM", "Lago italiano sul confine tra Lombardia e Veneto",       "GARDA"],
    ["HARD",   "Pianura più estesa d'Italia",                            "PADANA"],
  ],
  "geografia-europa": [
    ["EASY",   "Edificio sacro con guglie tipico tedesco",                "DUOMO"],
    ["MEDIUM", "Piccola repubblica enclave nelle Alpi",                  "LIECHTENSTEIN"],
    ["HARD",   "Penisola mediterranea con Spagna e Portogallo",           "IBERICA"],
  ],
  "geografia-mondo": [
    ["EASY",   "Liquido salato dell'oceano",                              "ACQUASALATA"],
    ["MEDIUM", "Animale simbolo dell'Australia con il pugile",            "CANGURO"],
    ["HARD",   "Vento caldo del Sahara che arriva in Europa",             "SCIROCCO"],
  ],

  "sport-calcio": [
    ["EASY",   "Lo indossa il portiere ma non l'attaccante",              "GUANTI"],
    ["MEDIUM", "Coppa internazionale per club europei",                   "CHAMPIONS"],
    ["HARD",   "Tornante difensivo che gioca anche d'attacco",            "TERZINO"],
  ],
  "sport-tennis": [
    ["EASY",   "Punteggio dopo un punto vinto al servizio",              "QUINDICI"],
    ["MEDIUM", "Quando il punteggio è 40 pari",                           "DEUCE"],
    ["HARD",   "Vittoria di tre Slam consecutivi nello stesso anno",      "TRIPLETTA"],
  ],
  "sport-basket": [
    ["EASY",   "Linea oltre cui il tiro vale 3 punti",                   "ARCO"],
    ["MEDIUM", "Movimento di rimbalzare la palla a terra",                "PALLEGGIO"],
    ["HARD",   "Tiro morbido che bacia il tabellone",                     "TABELLA"],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Suono che dà il via alla gara di sprint",                 "PISTOLA"],
    ["MEDIUM", "Premio del podio per il vincitore",                       "ORO"],
    ["HARD",   "Cinque continenti rappresentati su sfondo bianco",        "BANDIERA"],
  ],

  "scienze-fisica": [
    ["EASY",   "Si misura in chilogrammi sulla bilancia",                 "MASSA"],
    ["MEDIUM", "Forza che attira gli oggetti verso il basso",              "GRAVITA"],
    ["HARD",   "Energia in movimento di un oggetto",                       "CINETICA"],
  ],
  "scienze-chimica": [
    ["EASY",   "Liquido trasparente di cui siamo fatti",                  "ACQUA"],
    ["MEDIUM", "Soluzione acida usata per le batterie auto",               "SOLFORICO"],
    ["HARD",   "Reazione chimica con liberazione di ossigeno",             "OSSIDAZIONE"],
  ],
  "scienze-biologia": [
    ["EASY",   "Sistema di tubi che porta sangue al corpo",                "VENE"],
    ["MEDIUM", "Sostanza prodotta dalla tiroide",                          "ORMONE"],
    ["HARD",   "Processo per cui un girino diventa rana",                  "METAMORFOSI"],
  ],
  "scienze-astronomia": [
    ["EASY",   "Pianeta noto per il suo colore rosso",                    "MARTE"],
    ["MEDIUM", "Esplosione finale di una stella morente",                  "SUPERNOVA"],
    ["HARD",   "Polvere cosmica in rotazione intorno a stelle giovani",    "PROTOPLANETARIO"],
  ],

  "cinema": [
    ["EASY",   "Edificio dove si proiettano i film",                       "CINEMA"],
    ["MEDIUM", "Premio cinematografico americano dato ogni marzo",         "OSCAR"],
    ["HARD",   "Tecnica di montaggio rapido che alterna scene",            "CROSSCUTTING"],
  ],
  "musica": [
    ["EASY",   "Lo segue il direttore d'orchestra",                        "SPARTITO"],
    ["MEDIUM", "Concerto live di musica rock all'aperto",                  "CONCERTO"],
    ["HARD",   "Voce maschile più alta dell'opera",                        "TENORE"],
  ],
  "serie-tv": [
    ["EASY",   "Insieme di episodi raggruppati nello stesso ciclo",        "STAGIONE"],
    ["MEDIUM", "Inizio del prossimo episodio dopo l'ultimo cliffhanger",   "EPISODIO"],
    ["HARD",   "Episodio speciale fuori dalla stagione regolare",          "PILOTA"],
  ],
  "videogiochi": [
    ["EASY",   "Dispositivo per giocare collegato alla TV",                "CONSOLE"],
    ["MEDIUM", "Dispositivo manuale per controllare il gioco",             "JOYSTICK"],
    ["HARD",   "Modalità di gioco multiplayer online a squadre",           "ESPORTS"],
  ],
};

// ── Esecuzione ──
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
for (const c of db.prepare(`SELECT id, slug FROM Category`).all()) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, openAnswer, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'GHIGLIOTTINA', ?, 60, 0, ?, ?, datetime('now'), datetime('now'))
`);

let total = 0;
for (const [slug, items] of Object.entries(QUESTIONS_BY_SLUG)) {
  const catId = slugToId.get(slug);
  if (!catId) continue;
  for (const [difficulty, hint, word] of items) {
    if (APPLY) insertQ.run(makeId(), hint, difficulty, word.toUpperCase(), catId);
    total++;
  }
}

console.log(`Domande processate: ${total}`);
console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run."}`);
db.close();
