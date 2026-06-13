// Versione "raw SQL" dello script di pulizia, usabile anche se il client Prisma
// non è disponibile per la piattaforma corrente. Usa il modulo sperimentale
// `node:sqlite` (Node ≥ 22). Equivalente funzionale a fix-mc-answers.ts.
//
// Uso:
//   node --experimental-sqlite prisma/fix-mc-answers.mjs            # dry-run
//   node --experimental-sqlite prisma/fix-mc-answers.mjs --apply    # applica

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "dev.db");
const APPLY = process.argv.includes("--apply");

function stripParens(text) {
  return text.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}
function hasParens(text) {
  return /\([^)]*\)/.test(text);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const db = new DatabaseSync(DB_PATH);

console.log(`Modalità: ${APPLY ? "APPLY (scrive sul DB)" : "DRY-RUN (nessuna modifica)"}\n`);

const questions = db
  .prepare(`SELECT id, text FROM Question WHERE type = 'MULTIPLE_CHOICE'`)
  .all();
console.log(`Trovate ${questions.length} domande MULTIPLE_CHOICE\n`);

const answersStmt = db.prepare(
  `SELECT id, text, isCorrect, "order" FROM Answer WHERE questionId = ? ORDER BY "order" ASC`
);
const updateAnswerText = db.prepare(`UPDATE Answer SET text = ? WHERE id = ?`);
const updateAnswerOrder = db.prepare(`UPDATE Answer SET "order" = ? WHERE id = ?`);

// ── Step 1: parens spoiler ──
let spoilerFixed = 0;
let spoilerSkipped = 0;
const spoilerExamples = [];

for (const q of questions) {
  const answers = answersStmt.all(q.id);
  const withParens = answers.filter((a) => hasParens(a.text));
  if (withParens.length === 0) continue;
  if (withParens.length > 1) { spoilerSkipped++; continue; }
  const offender = withParens[0];
  const cleaned = stripParens(offender.text);
  if (cleaned === offender.text || cleaned.length === 0) continue;

  if (spoilerExamples.length < 15) {
    spoilerExamples.push(`  Q: ${q.text.slice(0, 80)}\n     "${offender.text}" → "${cleaned}" ${offender.isCorrect ? "(era la corretta)" : "(era sbagliata)"}`);
  }
  if (APPLY) updateAnswerText.run(cleaned, offender.id);
  spoilerFixed++;
}

console.log(`── Step 1: parentesi spoiler ──`);
console.log(`  Risposte ripulite: ${spoilerFixed}`);
console.log(`  Domande con parens "strutturali" lasciate: ${spoilerSkipped}`);
if (spoilerExamples.length > 0) {
  console.log(`  Esempi:\n${spoilerExamples.join("\n")}`);
}

// ── Step 2: shuffle order ──
const distBefore = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (const q of questions) {
  const c = answersStmt.all(q.id).find((a) => a.isCorrect);
  if (c) distBefore[c.order] = (distBefore[c.order] ?? 0) + 1;
}
console.log(`\n── Step 2: distribuzione corretta PRE-shuffle ──`);
console.log(`  A=${distBefore[0]} · B=${distBefore[1]} · C=${distBefore[2]} · D=${distBefore[3]}`);

let shuffled = 0;
// Per evitare collisioni di unique constraint (se l'order avesse @@unique con questionId),
// faccio l'update in 2 passaggi: prima sposto fuori range, poi ai valori target.
for (const q of questions) {
  const answers = answersStmt.all(q.id);
  if (answers.length !== 4) continue;
  const newOrder = shuffle([0, 1, 2, 3]);
  if (APPLY) {
    db.exec("BEGIN");
    try {
      // Step a: tutti su valori temporanei (10..13) — niente collisioni con 0..3
      answers.forEach((a, i) => updateAnswerOrder.run(10 + i, a.id));
      // Step b: assegno il valore finale
      answers.forEach((a, i) => updateAnswerOrder.run(newOrder[i], a.id));
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  shuffled++;
}
console.log(`  Domande con order shuffled: ${shuffled}`);

if (APPLY) {
  const distAfter = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const q of questions) {
    const c = answersStmt.all(q.id).find((a) => a.isCorrect);
    if (c) distAfter[c.order] = (distAfter[c.order] ?? 0) + 1;
  }
  console.log(`\n  Distribuzione corretta POST-shuffle:`);
  console.log(`  A=${distAfter[0]} · B=${distAfter[1]} · C=${distAfter[2]} · D=${distAfter[3]}`);
}

console.log(`\n${APPLY ? "✅ Modifiche applicate al DB." : "ℹ️  Dry-run completato. Rilancia con --apply per scrivere."}`);
db.close();
