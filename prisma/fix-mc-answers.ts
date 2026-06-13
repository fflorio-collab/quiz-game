// Script di pulizia per le domande MULTIPLE_CHOICE.
// 1) Rimuove i "spoiler parentesi" — testo fra parentesi presente SOLO nella risposta
//    corretta che ne svela la natura (es. "Roma (capitale d'Italia)" mentre le altre
//    sono solo "Milano", "Torino", "Napoli"). Se più risposte hanno parentesi è un
//    pattern strutturale legittimo (es. "Italia (Roma)" / "Francia (Parigi)") e le lascia.
// 2) Randomizza la posizione (`order`) della risposta corretta — corregge il bias verso "A".
//
// Uso (dalla root del progetto):
//   npx tsx prisma/fix-mc-answers.ts            # dry-run, mostra cosa cambierebbe
//   npx tsx prisma/fix-mc-answers.ts --apply    # applica le modifiche al DB

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// Helper: estrae e rimuove tutto il testo fra parentesi (incluso le tonde stesse e gli spazi attorno).
// "Roma (capitale d'Italia)" → "Roma"
// "  Cervo  (mammifero)  " → "Cervo"
function stripParens(text: string): string {
  return text.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function hasParens(text: string): boolean {
  return /\([^)]*\)/.test(text);
}

// Fisher-Yates shuffle in place
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

(async () => {
  console.log(`Modalità: ${APPLY ? "APPLY (scrive sul DB)" : "DRY-RUN (nessuna modifica)"}\n`);

  const questions = await prisma.question.findMany({
    where: { type: "MULTIPLE_CHOICE" },
    include: { answers: { orderBy: { order: "asc" } } },
  });
  console.log(`Trovate ${questions.length} domande MULTIPLE_CHOICE\n`);

  // ── Step 1: spoiler parens ──
  let spoilerFixed = 0;
  let spoilerSkipped = 0;
  const spoilerExamples: string[] = [];

  for (const q of questions) {
    const withParens = q.answers.filter((a) => hasParens(a.text));
    if (withParens.length === 0) continue;

    if (withParens.length > 1) {
      // Pattern strutturale, non spoiler. Lascio così.
      spoilerSkipped++;
      continue;
    }

    // Una sola risposta con parens → spoiler candidato
    const offender = withParens[0];
    const cleaned = stripParens(offender.text);
    if (cleaned === offender.text || cleaned.length === 0) continue; // niente da cambiare o cleanup vuoto

    if (spoilerExamples.length < 15) {
      spoilerExamples.push(`  Q: ${q.text.slice(0, 80)}\n     "${offender.text}" → "${cleaned}" ${offender.isCorrect ? "(era la corretta)" : "(era sbagliata)"}`);
    }

    if (APPLY) {
      await prisma.answer.update({ where: { id: offender.id }, data: { text: cleaned } });
    }
    spoilerFixed++;
  }

  console.log(`── Step 1: parentesi spoiler ──`);
  console.log(`  Risposte ripulite: ${spoilerFixed}`);
  console.log(`  Domande con parens "strutturali" lasciate: ${spoilerSkipped}`);
  if (spoilerExamples.length > 0) {
    console.log(`  Esempi:\n${spoilerExamples.join("\n")}`);
  }

  // ── Step 2: shuffle order ──
  // Distribuzione PRE-shuffle (per audit)
  const distBefore: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const q of questions) {
    const c = q.answers.find((a) => a.isCorrect);
    if (c) distBefore[c.order] = (distBefore[c.order] ?? 0) + 1;
  }

  console.log(`\n── Step 2: distribuzione corretta PRE-shuffle ──`);
  console.log(`  A=${distBefore[0]} · B=${distBefore[1]} · C=${distBefore[2]} · D=${distBefore[3]}`);

  let shuffled = 0;
  for (const q of questions) {
    if (q.answers.length !== 4) continue; // anomalie: skip
    // Genera nuovo ordine 0..3 e applica
    const newOrder = shuffle([0, 1, 2, 3]);
    if (APPLY) {
      // Update in transazione per evitare collisioni di unique constraint (se ce ne sono)
      await prisma.$transaction(
        q.answers.map((a, i) =>
          prisma.answer.update({ where: { id: a.id }, data: { order: newOrder[i] } })
        )
      );
    }
    shuffled++;
  }
  console.log(`  Domande con order shuffled: ${shuffled}`);

  if (APPLY) {
    // Distribuzione POST-shuffle
    const after = await prisma.question.findMany({
      where: { type: "MULTIPLE_CHOICE" },
      include: { answers: true },
    });
    const distAfter: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const q of after) {
      const c = q.answers.find((a) => a.isCorrect);
      if (c) distAfter[c.order] = (distAfter[c.order] ?? 0) + 1;
    }
    console.log(`\n  Distribuzione corretta POST-shuffle:`);
    console.log(`  A=${distAfter[0]} · B=${distAfter[1]} · C=${distAfter[2]} · D=${distAfter[3]}`);
  }

  console.log(`\n${APPLY ? "✅ Modifiche applicate al DB." : "ℹ️  Dry-run completato. Rilancia con --apply per scrivere."}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
