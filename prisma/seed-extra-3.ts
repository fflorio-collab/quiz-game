/**
 * Seed: 3 domande extra a scelta multipla in categorie esistenti.
 * - La PRIMA risposta di ogni domanda è quella corretta (order/shuffle li gestisce l'app).
 * - Idempotente: salta se una domanda con lo stesso testo esiste già nella categoria.
 *
 * Gira su Neon iniettando l'URL (i seed leggono .env = SQLite morto):
 *   DATABASE_URL="postgresql://..."(da .env.local) npx tsx prisma/seed-extra-3.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  categorySlug: string;
  text: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  answers: [string, string, string, string]; // [0] = corretta
};

const QUESTIONS: Q[] = [
  {
    categorySlug: "leggi-assurde",
    text: "Nel Regno Unito, secondo una bizzarra ma rigidissima legge sui trasporti pubblici, quale di queste azioni è severamente vietata ai passeggeri mentre si trovano all'interno delle stazioni della metropolitana di Londra?",
    difficulty: "MEDIUM",
    answers: [
      "Mantenere il posto in coda per un amico che è andato in bagno",
      "Salire sulle scale mobili con scarpe con i lacci slacciati",
      "Portare a bordo di un vagone un pesce vivo dentro una boccia d'acqua",
      "Saltare i tornelli anche se si è perso il biglietto elettronico",
    ],
  },
  {
    categorySlug: "scienza-da-bar",
    text: "Immagina di prendere una classica tazza di caffè bollente e di lasciarla sul tavolo a raffreddare. La teoria della relatività di Einstein ci dice che, man mano che il caffè perde calore e si raffredda, succede qualcosa alla sua massa. Cosa?",
    difficulty: "HARD",
    answers: [
      "La massa diminuisce (il caffè diventa impercettibilmente più leggero)",
      "La massa aumenta (il caffè diventa impercettibilmente più pesante)",
      "La massa resta esattamente identica, cambia solo lo stato termico",
      "Il caffè evapora del tutto se non viene coperto",
    ],
  },
  {
    categorySlug: "grandi-campioni-sport",
    text: "Ai Giochi Olimpici estivi del 1968, a Città del Messico, l'atleta americano Dick Fosbury sconvolse il mondo e cambiò per sempre la storia di una disciplina sportiva introducendo una tecnica totalmente folle per l'epoca. Quale?",
    difficulty: "MEDIUM",
    answers: [
      "Saltare l'ostacolo nel salto in alto scavalcandolo di schiena",
      "Correre i 100 metri piani usando scarpe senza tacchetti per scivolare meglio",
      "Lanciare il giavellotto facendolo ruotare su se stesso come un frisbee",
      "Nuotare nello stile a rana tenendo la testa sempre sott'acqua",
    ],
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const q of QUESTIONS) {
    const cat = await prisma.category.findUnique({ where: { slug: q.categorySlug } });
    if (!cat) {
      console.log(`⚠️  Categoria '${q.categorySlug}' non trovata — skip: "${q.text.slice(0, 50)}…"`);
      continue;
    }

    const existing = await prisma.question.findFirst({
      where: { categoryId: cat.id, text: q.text },
    });
    if (existing) {
      skipped++;
      console.log(`⏭️  Già presente in ${cat.name}: "${q.text.slice(0, 50)}…"`);
      continue;
    }

    await prisma.question.create({
      data: {
        text: q.text,
        difficulty: q.difficulty,
        type: "MULTIPLE_CHOICE",
        categoryId: cat.id,
        answers: {
          create: q.answers.map((text, i) => ({ text, isCorrect: i === 0, order: i })),
        },
      },
    });
    created++;
    console.log(`✅ [${cat.name}] ${q.difficulty} — "${q.text.slice(0, 50)}…"`);
  }

  const total = await prisma.question.count();
  console.log(`\nFatto. Create: ${created}, saltate: ${skipped}. Totale domande nel DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
