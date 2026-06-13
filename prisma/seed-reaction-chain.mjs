// Seed di 81 REACTION_CHAIN: 3 per categoria × 27 = 81.
// Schema: openAnswer = parola da indovinare; 3 Answer rows = 3 indizi progressivi
// (clue1 vago → clue3 più diretto). Auto-check su openAnswer.
//
//   node --experimental-sqlite prisma/seed-reaction-chain.mjs            # dry-run
//   node --experimental-sqlite prisma/seed-reaction-chain.mjs --apply

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function makeId() {
  let s = "rc";
  for (let i = 0; i < 22; i++) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}

// Per ogni categoria: 3 [difficulty, questionText, word, [clue1, clue2, clue3]]
const Q = {
  "arte-cultura": [
    ["EASY",   "Indovina l'oggetto",  "PENNELLO",  ["Strumento", "Si bagna in un liquido colorato", "Lo usa il pittore"]],
    ["MEDIUM", "Indovina l'opera",    "DAVIDE",    ["Scultura famosa", "Marmoreo, gigante", "Capolavoro di Michelangelo a Firenze"]],
    ["HARD",   "Indovina il movimento","DADAISMO", ["Avanguardia del 1916", "Nato a Zurigo", "Marcel Duchamp ne è esponente"]],
  ],
  "scienza": [
    ["EASY",   "Indovina lo strumento","BUSSOLA",  ["Strumento di orientamento", "Ago magnetico", "Indica sempre il Nord"]],
    ["MEDIUM", "Indovina lo scienziato","TESLA",   ["Inventore serbo-americano", "Pioniere della corrente alternata", "Rivale di Edison"]],
    ["HARD",   "Indovina la forza",   "CORIOLIS", ["Effetto fisico", "Devia oggetti in moto sulla Terra", "Rotazione causa la deviazione di venti"]],
  ],
  "storia": [
    ["EASY",   "Indovina il monumento","COLOSSEO", ["Anfiteatro", "A Roma", "Era usato per gladiatori"]],
    ["MEDIUM", "Indovina il personaggio","CESARE", ["Politico romano", "Conquistò la Gallia", "Ucciso alle Idi di Marzo"]],
    ["HARD",   "Indovina la civiltà",  "ITTITI",  ["Antica civiltà", "Anatolica", "Rivali degli Egizi nella battaglia di Qadesh"]],
  ],
  "geografia": [
    ["EASY",   "Indovina la città",   "VENEZIA",  ["Italiana", "Sull'acqua", "Famosa per gondole e canali"]],
    ["MEDIUM", "Indovina il fiume",   "DANUBIO",  ["Fiume europeo", "Attraversa Vienna e Budapest", "Sfocia nel Mar Nero"]],
    ["HARD",   "Indovina il deserto", "GOBI",     ["Deserto asiatico", "Tra Mongolia e Cina", "Patria di fossili di dinosauri"]],
  ],
  "scienze": [
    ["EASY",   "Indovina la frutta",  "MELA",     ["Frutto", "Cresce su un albero", "Cadde su Newton"]],
    ["MEDIUM", "Indovina la disciplina","BOTANICA",["Scienza naturale", "Studio di esseri viventi", "Si occupa delle piante"]],
    ["HARD",   "Indovina la teoria",  "EVOLUZIONE",["Concetto biologico", "Spiega la diversità delle specie", "Selezione naturale di Darwin"]],
  ],
  "cultura-pop": [
    ["EASY",   "Indovina il personaggio","SUPERMAN",["Supereroe", "Mantello rosso e tuta blu", "Viene dal pianeta Krypton"]],
    ["MEDIUM", "Indovina il gioco",   "TETRIS",   ["Videogioco", "Anni '80 sovietico", "Impila pezzi geometrici cadenti"]],
    ["HARD",   "Indovina il personaggio","DARTHVADER",["Antagonista famoso", "Veste tutto di nero con casco", "È il padre di Luke Skywalker"]],
  ],
  "sport": [
    ["EASY",   "Indovina lo sport",   "NUOTO",    ["Sport individuale", "Si pratica in vasca", "Stile libero, dorso, rana"]],
    ["MEDIUM", "Indovina la disciplina","SCHERMA", ["Sport di combattimento", "Spada, fioretto o sciabola", "Italia molto forte alle Olimpiadi"]],
    ["HARD",   "Indovina lo sport",   "RUGBY",    ["Sport di squadra", "Palla ovale", "Inventato in Inghilterra in una scuola omonima"]],
  ],

  "storia-antica": [
    ["EASY",   "Indovina il popolo",  "EGIZI",    ["Antico popolo", "Vivevano sul Nilo", "Costruivano piramidi"]],
    ["MEDIUM", "Indovina il filosofo","SOCRATE",  ["Filosofo greco", "Maestro di Platone", "Bevve la cicuta"]],
    ["HARD",   "Indovina la battaglia","ZAMA",   ["Battaglia antica", "Tra Romani e Cartaginesi", "Scipione sconfisse Annibale nel 202 a.C."]],
  ],
  "storia-medievale": [
    ["EASY",   "Indovina la figura",  "RE",       ["Sovrano", "Indossa una corona", "Comanda un regno"]],
    ["MEDIUM", "Indovina il personaggio","CARLOMAGNO",["Re d'Europa", "Fondò un grande impero", "Incoronato a Roma nell'800"]],
    ["HARD",   "Indovina il documento","BOLLA",   ["Documento ufficiale", "Sigillo di piombo", "Emessa dal papa medievale"]],
  ],
  "storia-moderna": [
    ["EASY",   "Indovina l'invenzione","STAMPA", ["Invenzione del XV secolo", "Permise libri rapidi", "Gutenberg la rivoluzionò"]],
    ["MEDIUM", "Indovina il personaggio","COLOMBO",["Esploratore italiano", "Navigò per la Spagna", "Sbarcò nel Nuovo Mondo nel 1492"]],
    ["HARD",   "Indovina la rivoluzione","INDUSTRIALE",["Cambiamento storico", "Iniziò in Inghilterra '700", "Macchina a vapore di Watt"]],
  ],
  "storia-contemporanea": [
    ["EASY",   "Indovina la guerra",  "MONDIALE",["Conflitto", "Coinvolge molti paesi", "La seconda finì nel 1945"]],
    ["MEDIUM", "Indovina il dittatore","STALIN",["Leader politico", "URSS", "Successore di Lenin"]],
    ["HARD",   "Indovina il movimento","GANDHI",["Personaggio storico XX secolo", "Indiano pacifista", "Lottò contro il dominio britannico"]],
  ],
  "storia-elementare": [
    ["EASY",   "Indovina l'oggetto",  "PENTOLA",["Oggetto da cucina", "Si mette sul fuoco", "Ci si bolle l'acqua"]],
    ["MEDIUM", "Indovina la figura",  "CAVALIERE",["Combattente medievale", "Indossa armatura", "Combatte a cavallo"]],
    ["HARD",   "Indovina la civiltà", "MAYA",    ["Civiltà precolombiana", "Mesoamericana", "Famosa per i calendari astronomici"]],
  ],

  "geografia-italia": [
    ["EASY",   "Indovina la città",   "ROMA",    ["Capitale", "Italiana", "Detta la città eterna"]],
    ["MEDIUM", "Indovina la regione", "TOSCANA",["Regione italiana", "Famosa per il vino", "Capoluogo Firenze"]],
    ["HARD",   "Indovina la città",   "MATERA", ["Città italiana", "Patrimonio UNESCO", "Famosa per i Sassi"]],
  ],
  "geografia-europa": [
    ["EASY",   "Indovina la nazione", "GRECIA", ["Stato europeo", "Bandiera blu e bianca", "Patria dei filosofi antichi"]],
    ["MEDIUM", "Indovina lo stato",   "OLANDA", ["Stato europeo", "Famosa per i tulipani", "Mulini a vento e biciclette"]],
    ["HARD",   "Indovina la repubblica","SANMARINO",["Microstato europeo", "Tra Marche e Romagna", "Più antica repubblica al mondo"]],
  ],
  "geografia-mondo": [
    ["EASY",   "Indovina il paese",   "GIAPPONE",["Stato asiatico", "Bandiera bianca con cerchio rosso", "Patria del sushi e samurai"]],
    ["MEDIUM", "Indovina il fiume",   "GANGE",  ["Fiume asiatico", "Sacro per gli Indù", "Attraversa l'India settentrionale"]],
    ["HARD",   "Indovina la città",   "TIMBUKTU",["Città africana", "Antica meta carovaniera", "Nel Mali, sul fiume Niger"]],
  ],

  "sport-calcio": [
    ["EASY",   "Indovina il ruolo",   "PORTIERE",["Giocatore", "Veste maglia diversa", "L'unico che può prendere la palla con le mani"]],
    ["MEDIUM", "Indovina il calciatore","PELE",  ["Brasiliano leggendario", "3 volte campione del mondo", "Soprannominato O Rei"]],
    ["HARD",   "Indovina il calciatore","ZIDANE",["Francese", "Pallone d'Oro 1998", "Diede una testata nella finale 2006"]],
  ],
  "sport-tennis": [
    ["EASY",   "Indovina lo strumento","RACCHETTA",["Attrezzo sportivo", "Ha corde", "Si usa per colpire la palla"]],
    ["MEDIUM", "Indovina il tennista","AGASSI", ["Americano", "Calvo iconico", "Vinse tutti gli Slam negli anni '90"]],
    ["HARD",   "Indovina la tennista","GRAF",   ["Tedesca", "Vinse il Golden Slam nel 1988", "22 Slam in carriera"]],
  ],
  "sport-basket": [
    ["EASY",   "Indovina lo sport",   "BASKET", ["Sport di squadra", "5 vs 5", "Fai canestro sul cerchio sospeso"]],
    ["MEDIUM", "Indovina il giocatore","ZIDANE",["Cestista USA", "Numero 8 e 24", "Lakers, morto nel 2020"]],
    ["HARD",   "Indovina il termine", "TRIPLODOPPIO",["Statistica NBA", "Numeri a doppia cifra in 3 categorie", "Speciale di Russell Westbrook"]],
  ],
  "sport-olimpiadi": [
    ["EASY",   "Indovina la disciplina","SCIO",["Sport invernale", "Si scivola sulla neve", "Usato anche per saltare"]],
    ["MEDIUM", "Indovina la nazione vincitrice","NORVEGIA",["Stato nordico", "Vince spesso ai Giochi invernali", "Patria di sciatori e campioni di fondo"]],
    ["HARD",   "Indovina l'atleta",   "PHELPS", ["Statunitense", "Nuotatore", "23 ori olimpici, recordman"]],
  ],

  "scienze-fisica": [
    ["EASY",   "Indovina il fenomeno","CALORE", ["Forma di energia", "Rende le cose calde", "Si trasferisce dal caldo al freddo"]],
    ["MEDIUM", "Indovina il fenomeno","ARCOBALENO",["Spettro luminoso", "Si forma dopo la pioggia", "Sette colori dal rosso al violetto"]],
    ["HARD",   "Indovina la teoria",  "RELATIVITA",["Teoria fisica", "Einstein la formulò", "Ridefinisce spazio e tempo"]],
  ],
  "scienze-chimica": [
    ["EASY",   "Indovina la sostanza","OSSIGENO",["Elemento chimico", "Lo respiriamo", "Simbolo O"]],
    ["MEDIUM", "Indovina il composto","AMMONIACA",["Sostanza chimica", "Odore pungente", "Composta da azoto e idrogeno"]],
    ["HARD",   "Indovina l'elemento", "URANIO", ["Elemento radioattivo", "Numero atomico 92", "Usato nei reattori nucleari"]],
  ],
  "scienze-biologia": [
    ["EASY",   "Indovina l'animale",  "RANA",   ["Anfibio", "Salta", "Vive vicino agli stagni"]],
    ["MEDIUM", "Indovina il regno",   "FUNGHI", ["Regno biologico", "Non sono né animali né piante", "Champignon ne è un esempio"]],
    ["HARD",   "Indovina il fenomeno","MITOSI", ["Processo cellulare", "Riproduzione di una cellula", "Divide una cellula in due identiche"]],
  ],
  "scienze-astronomia": [
    ["EASY",   "Indovina il pianeta", "VENERE", ["Pianeta del sistema solare", "Il più caldo", "Gemello della Terra per dimensioni"]],
    ["MEDIUM", "Indovina il fenomeno","ECLISSI",["Evento astronomico", "Allineamento di corpi celesti", "Solare o lunare"]],
    ["HARD",   "Indovina l'oggetto cosmico","BUCONERO",["Oggetto cosmico", "Ha gravità estrema", "Nemmeno la luce sfugge"]],
  ],

  "cinema": [
    ["EASY",   "Indovina il termine", "CIAK",   ["Oggetto del cinema", "Si batte all'inizio della scena", "Tradizionale 'azione!'"]],
    ["MEDIUM", "Indovina il film",    "MATRIX", ["Film del 1999", "Pillola rossa o blu", "Reality virtuale e Neo"]],
    ["HARD",   "Indovina il regista", "SCORSESE",["Regista americano", "Italiano d'origine", "Diresse 'Quei bravi ragazzi'"]],
  ],
  "musica": [
    ["EASY",   "Indovina lo strumento","CHITARRA",["Strumento musicale", "Ha sei corde solitamente", "Si suona con le dita o plettro"]],
    ["MEDIUM", "Indovina il cantante","BOWIE",  ["Cantante britannico", "Camaleontico", "Personaggio di Ziggy Stardust"]],
    ["HARD",   "Indovina il compositore","BACH",["Compositore tedesco", "Barocco", "Padre di una grande famiglia di musicisti"]],
  ],
  "serie-tv": [
    ["EASY",   "Indovina il personaggio","HOMER", ["Personaggio televisivo", "Animato", "Padre giallo dei Simpson"]],
    ["MEDIUM", "Indovina la serie",   "FRIENDS",["Sitcom americana", "Anni '90", "Sei amici a Manhattan"]],
    ["HARD",   "Indovina la serie",   "FARGO",  ["Serie antologica FX", "Tratta dal film dei Coen", "Ambientata nel Nord USA innevato"]],
  ],
  "videogiochi": [
    ["EASY",   "Indovina il personaggio","LUIGI",["Personaggio Nintendo", "Verde con baffi", "Fratello del più famoso idraulico"]],
    ["MEDIUM", "Indovina il gioco",   "FORTNITE",["Battle royale", "100 giocatori", "Costruisci e spara, lanciato da Epic"]],
    ["HARD",   "Indovina il gioco",   "DOOM",   ["Sparatutto in prima persona", "Anni '90", "Pionere del genere FPS, di id Software"]],
  ],
};

// ── Esecuzione ──
const db = new DatabaseSync(DB_PATH);
console.log(`Modalità: ${APPLY ? "APPLY" : "DRY-RUN"} su ${DB_PATH}\n`);

const slugToId = new Map();
for (const c of db.prepare(`SELECT id, slug FROM Category`).all()) slugToId.set(c.slug, c.id);

const insertQ = db.prepare(`
  INSERT INTO Question (id, text, type, difficulty, timeLimit, points, openAnswer, categoryId, createdAt, updatedAt)
  VALUES (?, ?, 'REACTION_CHAIN', ?, 30, 100, ?, ?, datetime('now'), datetime('now'))
`);
const insertA = db.prepare(`
  INSERT INTO Answer (id, text, isCorrect, questionId, "order")
  VALUES (?, ?, 0, ?, ?)
`);

let total = 0;
for (const [slug, items] of Object.entries(Q)) {
  const catId = slugToId.get(slug);
  if (!catId) continue;
  for (const [difficulty, text, word, clues] of items) {
    if (APPLY) {
      const qId = makeId();
      insertQ.run(qId, text, difficulty, word.toUpperCase(), catId);
      clues.forEach((clue, i) => insertA.run(makeId(), clue, qId, i));
    }
    total++;
  }
}

console.log(`Domande processate: ${total}`);
console.log(`\n${APPLY ? "✅ Inserimento completato." : "ℹ️ Dry-run."}`);
db.close();
