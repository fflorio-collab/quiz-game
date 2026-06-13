// Seed di 81 ONLY_CONNECT: 3 per categoria × 27.
// Schema: 4 Answer rows (4 elementi che condividono qualcosa), openAnswer = il link comune.
// L'host giudica manualmente le risposte dei player (cosa accomuna i 4 elementi).
//
//   node --experimental-sqlite prisma/seed-only-connect-cats.mjs            # dry-run
//   node --experimental-sqlite prisma/seed-only-connect-cats.mjs --apply

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function makeId() { let s = "oc"; for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36); return s; }

// [difficulty, questionText, [4 items], linkAnswer]
const Q = {
  "arte-cultura": [
    ["EASY",   "Cosa accomuna questi 4 elementi?", ["Tela", "Pennello", "Cavalletto", "Tavolozza"], "Strumenti del pittore"],
    ["MEDIUM", "Cosa accomuna queste 4 opere?",    ["Gioconda", "Notte stellata", "L'Urlo", "Le ninfee"], "Famosi dipinti"],
    ["HARD",   "Cosa accomuna questi 4 artisti?",  ["Picasso", "Braque", "Léger", "Gris"], "Cubisti"],
  ],
  "scienza": [
    ["EASY",   "Cosa accomuna questi 4?",          ["Lampadina", "Telefono", "Cinema", "Fonografo"], "Invenzioni di Edison o suoi associati"],
    ["MEDIUM", "Cosa hanno in comune questi 4?",   ["Newton", "Einstein", "Galileo", "Maxwell"], "Fisici famosi"],
    ["HARD",   "Cosa lega questi 4 scienziati?",   ["Curie", "Bohr", "Fermi", "Heisenberg"], "Premi Nobel per la Fisica"],
  ],
  "storia": [
    ["EASY",   "Cosa lega questi 4 monumenti?",     ["Colosseo", "Foro", "Pantheon", "Circo Massimo"], "Monumenti di Roma antica"],
    ["MEDIUM", "Cosa accomuna questi 4 personaggi?",["Cesare", "Augusto", "Nerone", "Traiano"], "Imperatori romani"],
    ["HARD",   "Cosa lega questi 4?",               ["Tordesillas", "Versailles", "Vestfalia", "Vienna"], "Trattati di pace storici"],
  ],
  "geografia": [
    ["EASY",   "Cosa lega questi 4?",                ["Po", "Tevere", "Arno", "Adige"], "Fiumi italiani"],
    ["MEDIUM", "Cosa accomuna queste 4 capitali?",  ["Parigi", "Madrid", "Lisbona", "Roma"], "Capitali europee del Sud"],
    ["HARD",   "Cosa lega questi 4 deserti?",        ["Sahara", "Gobi", "Atacama", "Kalahari"], "Deserti del mondo"],
  ],
  "scienze": [
    ["EASY",   "Cosa lega questi 4 animali?",         ["Gatto", "Cane", "Coniglio", "Criceto"], "Animali domestici"],
    ["MEDIUM", "Cosa accomuna questi 4 organi?",      ["Cuore", "Polmoni", "Reni", "Fegato"], "Organi interni vitali"],
    ["HARD",   "Cosa lega questi 4 elementi chimici?",["Idrogeno", "Elio", "Ossigeno", "Carbonio"], "Elementi presenti negli esseri viventi"],
  ],
  "cultura-pop": [
    ["EASY",   "Cosa lega questi 4 personaggi?",       ["Mickey", "Minnie", "Pluto", "Paperino"], "Personaggi Disney"],
    ["MEDIUM", "Cosa accomuna queste 4 band?",          ["Beatles", "Rolling Stones", "Led Zeppelin", "Pink Floyd"], "Band rock britanniche"],
    ["HARD",   "Cosa lega questi 4 fumetti italiani?",  ["Tex", "Diabolik", "Dylan Dog", "Topolino"], "Fumetti italiani classici"],
  ],
  "sport": [
    ["EASY",   "Cosa accomuna questi 4 sport?",         ["Tennis", "Squash", "Badminton", "Padel"], "Sport con la racchetta"],
    ["MEDIUM", "Cosa lega questi 4?",                    ["Schermitore", "Maratoneta", "Nuotatore", "Saltatore"], "Atleti olimpici"],
    ["HARD",   "Cosa accomuna questi 4 sport?",          ["Football americano", "Baseball", "Basket", "Hockey"], "Sport delle leghe USA"],
  ],

  "storia-antica": [
    ["EASY",   "Cosa lega questi 4 popoli?",             ["Egizi", "Greci", "Romani", "Fenici"], "Civiltà del Mediterraneo"],
    ["MEDIUM", "Cosa accomuna questi 4 dei?",             ["Zeus", "Apollo", "Atena", "Poseidone"], "Dei dell'Olimpo greco"],
    ["HARD",   "Cosa lega questi 4 filosofi?",            ["Talete", "Anassimandro", "Anassimene", "Eraclito"], "Filosofi presocratici"],
  ],
  "storia-medievale": [
    ["EASY",   "Cosa lega questi 4 personaggi?",          ["Re", "Regina", "Cavaliere", "Vassallo"], "Figure del feudalesimo"],
    ["MEDIUM", "Cosa accomuna questi 4?",                  ["Merlino", "Artù", "Lancillotto", "Ginevra"], "Ciclo arturiano"],
    ["HARD",   "Cosa lega questi 4 ordini?",               ["Templari", "Ospitalieri", "Teutonici", "Cistercensi"], "Ordini religiosi medievali"],
  ],
  "storia-moderna": [
    ["EASY",   "Cosa lega questi 4 personaggi?",            ["Colombo", "Magellano", "Vasco da Gama", "Cabot"], "Esploratori del Rinascimento"],
    ["MEDIUM", "Cosa accomuna questi 4?",                    ["Robespierre", "Marat", "Danton", "Saint-Just"], "Protagonisti della Rivoluzione Francese"],
    ["HARD",   "Cosa lega questi 4 scienziati?",             ["Copernico", "Galileo", "Keplero", "Brahe"], "Astronomi moderni"],
  ],
  "storia-contemporanea": [
    ["EASY",   "Cosa lega questi 4?",                          ["Hitler", "Mussolini", "Stalin", "Franco"], "Dittatori del XX secolo"],
    ["MEDIUM", "Cosa accomuna questi 4 eventi?",                ["Sarajevo", "Pearl Harbor", "Hiroshima", "Yalta"], "Eventi delle Guerre Mondiali"],
    ["HARD",   "Cosa lega questi 4?",                            ["Roosevelt", "Truman", "Eisenhower", "Kennedy"], "Presidenti USA del Novecento"],
  ],
  "storia-elementare": [
    ["EASY",   "Cosa lega questi 4 monumenti?",                ["Piramide", "Sfinge", "Tempio", "Obelisco"], "Monumenti dell'antico Egitto"],
    ["MEDIUM", "Cosa accomuna questi 4 mestieri antichi?",     ["Vasaio", "Fabbro", "Tessitore", "Mugnaio"], "Mestieri del passato"],
    ["HARD",   "Cosa lega questi 4 popoli?",                    ["Goti", "Vandali", "Unni", "Longobardi"], "Popoli barbari delle invasioni"],
  ],

  "geografia-italia": [
    ["EASY",   "Cosa lega queste 4 città?",                     ["Milano", "Roma", "Napoli", "Torino"], "Grandi città italiane"],
    ["MEDIUM", "Cosa accomuna queste 4 regioni?",                ["Toscana", "Lazio", "Umbria", "Marche"], "Regioni del Centro Italia"],
    ["HARD",   "Cosa lega questi 4 fiumi?",                      ["Tagliamento", "Piave", "Brenta", "Adige"], "Fiumi del Veneto"],
  ],
  "geografia-europa": [
    ["EASY",   "Cosa lega queste 4 nazioni?",                    ["Italia", "Francia", "Spagna", "Portogallo"], "Paesi del Sud Europa"],
    ["MEDIUM", "Cosa accomuna queste 4 nazioni?",                 ["Norvegia", "Svezia", "Finlandia", "Danimarca"], "Paesi scandinavi/nordici"],
    ["HARD",   "Cosa lega queste 4 capitali?",                    ["Vilnius", "Riga", "Tallinn", "Helsinki"], "Capitali del Baltico/Nord"],
  ],
  "geografia-mondo": [
    ["EASY",   "Cosa lega questi 4 paesi?",                       ["Brasile", "Argentina", "Cile", "Perù"], "Paesi del Sud America"],
    ["MEDIUM", "Cosa accomuna questi 4 luoghi?",                   ["Everest", "K2", "Aconcagua", "Monte Bianco"], "Montagne più alte (per continente)"],
    ["HARD",   "Cosa lega questi 4 paesi?",                        ["Vaticano", "Monaco", "San Marino", "Liechtenstein"], "Microstati europei"],
  ],

  "sport-calcio": [
    ["EASY",   "Cosa lega questi 4?",                              ["Maglia", "Pantaloncini", "Calzettoni", "Scarpini"], "Equipaggiamento del calciatore"],
    ["MEDIUM", "Cosa accomuna questi 4?",                            ["Juventus", "Milan", "Inter", "Roma"], "Club italiani di Serie A"],
    ["HARD",   "Cosa lega questi 4 calciatori?",                     ["Pelé", "Maradona", "Cruyff", "Beckenbauer"], "Leggende mondiali del calcio"],
  ],
  "sport-tennis": [
    ["EASY",   "Cosa lega questi 4 colpi?",                          ["Dritto", "Rovescio", "Servizio", "Volée"], "Colpi del tennis"],
    ["MEDIUM", "Cosa accomuna questi 4 tornei?",                     ["Wimbledon", "US Open", "Roland Garros", "Australian Open"], "Tornei dello Slam"],
    ["HARD",   "Cosa lega questi 4 tennisti?",                        ["Federer", "Nadal", "Djokovic", "Murray"], "Big Four del tennis maschile"],
  ],
  "sport-basket": [
    ["EASY",   "Cosa lega questi 4 ruoli?",                            ["Playmaker", "Guardia", "Ala", "Centro"], "Ruoli nel basket"],
    ["MEDIUM", "Cosa accomuna queste 4 franchigie?",                    ["Lakers", "Celtics", "Bulls", "Warriors"], "Squadre NBA storiche"],
    ["HARD",   "Cosa lega questi 4 cestisti?",                          ["Jordan", "Bryant", "James", "Bird"], "Leggende NBA"],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Cosa lega queste 4 Olimpiadi?",                          ["Atene", "Roma", "Tokyo", "Parigi"], "Città che hanno ospitato Olimpiadi estive"],
    ["MEDIUM", "Cosa accomuna questi 4 sport olimpici?",                  ["Atletica", "Nuoto", "Ginnastica", "Ciclismo"], "Sport simbolo dei Giochi estivi"],
    ["HARD",   "Cosa lega questi 4 atleti italiani?",                    ["Mennea", "Berruti", "Tomba", "Pellegrini"], "Atleti italiani medagliati olimpici"],
  ],

  "scienze-fisica": [
    ["EASY",   "Cosa lega queste 4 unità di misura?",                     ["Metro", "Chilogrammo", "Secondo", "Ampere"], "Unità base SI"],
    ["MEDIUM", "Cosa accomuna queste 4 forze?",                              ["Gravitazionale", "Elettromagnetica", "Forte", "Debole"], "Forze fondamentali della natura"],
    ["HARD",   "Cosa lega questi 4 fisici?",                                  ["Planck", "Bohr", "Schrödinger", "Heisenberg"], "Padri della fisica quantistica"],
  ],
  "scienze-chimica": [
    ["EASY",   "Cosa lega questi 4 elementi?",                                ["Oro", "Argento", "Rame", "Ferro"], "Metalli"],
    ["MEDIUM", "Cosa accomuna questi 4?",                                     ["H2O", "CO2", "NaCl", "CH4"], "Composti chimici comuni"],
    ["HARD",   "Cosa lega questi 4 gas?",                                     ["Elio", "Neon", "Argon", "Kripton"], "Gas nobili"],
  ],
  "scienze-biologia": [
    ["EASY",   "Cosa lega questi 4 animali?",                                  ["Aquila", "Falco", "Gufo", "Civetta"], "Uccelli rapaci"],
    ["MEDIUM", "Cosa accomuna questi 4 organi?",                                ["Stomaco", "Intestino", "Esofago", "Bocca"], "Organi del sistema digerente"],
    ["HARD",   "Cosa lega questi 4 vegetali?",                                   ["Felce", "Muschio", "Equiseto", "Lichene"], "Piante non fiorifere"],
  ],
  "scienze-astronomia": [
    ["EASY",   "Cosa lega questi 4 pianeti?",                                  ["Mercurio", "Venere", "Terra", "Marte"], "Pianeti rocciosi del sistema solare"],
    ["MEDIUM", "Cosa accomuna questi 4?",                                       ["Saturno", "Giove", "Urano", "Nettuno"], "Pianeti gassosi del sistema solare"],
    ["HARD",   "Cosa lega questi 4 satelliti?",                                  ["Io", "Europa", "Ganimede", "Callisto"], "Lune galileiane di Giove"],
  ],

  "cinema": [
    ["EASY",   "Cosa lega questi 4 film?",                                       ["Titanic", "Avatar", "Aliens", "The Terminator"], "Film di James Cameron"],
    ["MEDIUM", "Cosa accomuna questi 4?",                                        ["Bond", "Indiana Jones", "Rocky", "Rambo"], "Saghe cinematografiche"],
    ["HARD",   "Cosa lega questi 4 registi?",                                    ["Tarantino", "Scorsese", "Spielberg", "Coppola"], "Grandi registi americani contemporanei"],
  ],
  "musica": [
    ["EASY",   "Cosa lega questi 4 strumenti?",                                  ["Violino", "Viola", "Violoncello", "Contrabbasso"], "Strumenti ad arco"],
    ["MEDIUM", "Cosa accomuna questi 4 cantanti italiani?",                       ["Battisti", "Mogol", "Dalla", "De André"], "Cantautori italiani leggendari"],
    ["HARD",   "Cosa lega questi 4?",                                              ["Bach", "Mozart", "Beethoven", "Brahms"], "Compositori classici tedeschi/austriaci"],
  ],
  "serie-tv": [
    ["EASY",   "Cosa lega queste 4 serie?",                                       ["Friends", "Seinfeld", "How I Met Your Mother", "Big Bang Theory"], "Sitcom americane di successo"],
    ["MEDIUM", "Cosa accomuna queste 4 serie?",                                    ["Breaking Bad", "Better Call Saul", "Ozark", "Narcos"], "Serie crime su droga"],
    ["HARD",   "Cosa lega queste 4 serie?",                                         ["Sopranos", "The Wire", "Game of Thrones", "Westworld"], "Serie HBO acclamate"],
  ],
  "videogiochi": [
    ["EASY",   "Cosa lega questi 4 giochi Nintendo?",                              ["Mario", "Zelda", "Donkey Kong", "Metroid"], "Saghe Nintendo"],
    ["MEDIUM", "Cosa accomuna questi 4?",                                            ["FIFA", "PES", "NBA 2K", "Madden"], "Videogiochi sportivi"],
    ["HARD",   "Cosa lega questi 4 giochi?",                                          ["Skyrim", "Fallout", "Witcher 3", "Mass Effect"], "RPG occidentali"],
  ],
};

// ── Esecuzione ──
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
for (const c of db.prepare(`SELECT id, slug FROM Category`).all()) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, openAnswer, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'ONLY_CONNECT', ?, 45, 100, ?, ?, datetime('now'), datetime('now'))
`);
const insertA = db.prepare(`
  INSERT INTO Answer (id, text, isCorrect, questionId, "order")
  VALUES (?, ?, 0, ?, ?)
`);

let total = 0;
for (const [slug, items] of Object.entries(Q)) {
  const catId = slugToId.get(slug);
  if (!catId) continue;
  for (const [difficulty, text, four, link] of items) {
    if (APPLY) {
      const qId = makeId();
      insertQ.run(qId, text, difficulty, link, catId);
      four.forEach((item, i) => insertA.run(makeId(), item, qId, i));
    }
    total++;
  }
}

console.log(`Domande processate: ${total}`);
console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run."}`);
db.close();
