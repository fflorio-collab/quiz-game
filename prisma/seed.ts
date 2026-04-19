import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedData = [
  {
    category: { name: "Storia", slug: "storia", icon: "📜", color: "#f59e0b" },
    questions: [
      {
        text: "In che anno è caduto il Muro di Berlino?",
        difficulty: "EASY",
        answers: [
          { text: "1987", isCorrect: false },
          { text: "1989", isCorrect: true },
          { text: "1991", isCorrect: false },
          { text: "1985", isCorrect: false },
        ],
      },
      {
        text: "Chi era imperatore romano durante la costruzione del Colosseo?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Nerone", isCorrect: false },
          { text: "Traiano", isCorrect: false },
          { text: "Vespasiano", isCorrect: true },
          { text: "Augusto", isCorrect: false },
        ],
      },
      {
        text: "In che anno iniziò la Prima Guerra Mondiale?",
        difficulty: "EASY",
        answers: [
          { text: "1914", isCorrect: true },
          { text: "1918", isCorrect: false },
          { text: "1905", isCorrect: false },
          { text: "1920", isCorrect: false },
        ],
      },
      {
        text: "Chi firmò il trattato di Tordesillas?",
        difficulty: "HARD",
        answers: [
          { text: "Spagna e Francia", isCorrect: false },
          { text: "Spagna e Portogallo", isCorrect: true },
          { text: "Inghilterra e Francia", isCorrect: false },
          { text: "Portogallo e Inghilterra", isCorrect: false },
        ],
      },
      {
        text: "In quale anno Cristoforo Colombo arrivò in America?",
        difficulty: "EASY",
        answers: [
          { text: "1488", isCorrect: false },
          { text: "1492", isCorrect: true },
          { text: "1500", isCorrect: false },
          { text: "1510", isCorrect: false },
        ],
      },
      {
        text: "Chi fu il primo imperatore di Roma?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Giulio Cesare", isCorrect: false },
          { text: "Augusto", isCorrect: true },
          { text: "Nerone", isCorrect: false },
          { text: "Traiano", isCorrect: false },
        ],
      },
      {
        text: "In quale anno fu abolita la schiavitù negli Stati Uniti?",
        difficulty: "MEDIUM",
        answers: [
          { text: "1848", isCorrect: false },
          { text: "1861", isCorrect: false },
          { text: "1865", isCorrect: true },
          { text: "1870", isCorrect: false },
        ],
      },
      {
        text: "Quale civiltà costruì le piramidi di Giza?",
        difficulty: "EASY",
        answers: [
          { text: "I Romani", isCorrect: false },
          { text: "I Greci", isCorrect: false },
          { text: "Gli Egizi", isCorrect: true },
          { text: "I Mesopotamici", isCorrect: false },
        ],
      },
      {
        text: "In quale battaglia Napoleone fu definitivamente sconfitto?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Austerlitz", isCorrect: false },
          { text: "Borodino", isCorrect: false },
          { text: "Waterloo", isCorrect: true },
          { text: "Trafalgar", isCorrect: false },
        ],
      },
    ],
  },
  {
    category: { name: "Geografia", slug: "geografia", icon: "🌍", color: "#10b981" },
    questions: [
      {
        text: "Qual è la capitale dell'Australia?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Sydney", isCorrect: false },
          { text: "Melbourne", isCorrect: false },
          { text: "Canberra", isCorrect: true },
          { text: "Perth", isCorrect: false },
        ],
      },
      {
        text: "Qual è il fiume più lungo del mondo?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Nilo", isCorrect: false },
          { text: "Rio delle Amazzoni", isCorrect: true },
          { text: "Yangtze", isCorrect: false },
          { text: "Mississippi", isCorrect: false },
        ],
      },
      {
        text: "Quale paese ha più fusi orari?",
        difficulty: "HARD",
        answers: [
          { text: "Russia", isCorrect: false },
          { text: "Stati Uniti", isCorrect: false },
          { text: "Francia", isCorrect: true },
          { text: "Cina", isCorrect: false },
        ],
      },
      {
        text: "Qual è la montagna più alta d'Europa?",
        difficulty: "EASY",
        answers: [
          { text: "Monte Bianco", isCorrect: false },
          { text: "Elbrus", isCorrect: true },
          { text: "Cervino", isCorrect: false },
          { text: "Monte Rosa", isCorrect: false },
        ],
      },
      {
        text: "Qual è il paese più grande del mondo per superficie?",
        difficulty: "EASY",
        answers: [
          { text: "Canada", isCorrect: false },
          { text: "Cina", isCorrect: false },
          { text: "Russia", isCorrect: true },
          { text: "Stati Uniti", isCorrect: false },
        ],
      },
      {
        text: "Qual è la capitale del Brasile?",
        difficulty: "MEDIUM",
        answers: [
          { text: "São Paulo", isCorrect: false },
          { text: "Rio de Janeiro", isCorrect: false },
          { text: "Brasilia", isCorrect: true },
          { text: "Salvador", isCorrect: false },
        ],
      },
      {
        text: "Qual è l'oceano più grande del mondo?",
        difficulty: "EASY",
        answers: [
          { text: "Atlantico", isCorrect: false },
          { text: "Indiano", isCorrect: false },
          { text: "Pacifico", isCorrect: true },
          { text: "Artico", isCorrect: false },
        ],
      },
      {
        text: "In quale continente si trova il deserto del Sahara?",
        difficulty: "EASY",
        answers: [
          { text: "Asia", isCorrect: false },
          { text: "Africa", isCorrect: true },
          { text: "Australia", isCorrect: false },
          { text: "Sud America", isCorrect: false },
        ],
      },
      {
        text: "Quanti paesi ci sono nel continente africano?",
        difficulty: "HARD",
        answers: [
          { text: "48", isCorrect: false },
          { text: "52", isCorrect: false },
          { text: "54", isCorrect: true },
          { text: "57", isCorrect: false },
        ],
      },
    ],
  },
  {
    category: { name: "Scienza", slug: "scienza", icon: "🔬", color: "#6366f1" },
    questions: [
      {
        text: "Qual è il simbolo chimico dell'oro?",
        difficulty: "EASY",
        answers: [
          { text: "Go", isCorrect: false },
          { text: "Au", isCorrect: true },
          { text: "Ag", isCorrect: false },
          { text: "Or", isCorrect: false },
        ],
      },
      {
        text: "Quanti pianeti ci sono nel sistema solare?",
        difficulty: "EASY",
        answers: [
          { text: "7", isCorrect: false },
          { text: "8", isCorrect: true },
          { text: "9", isCorrect: false },
          { text: "10", isCorrect: false },
        ],
      },
      {
        text: "Chi ha formulato la teoria della relatività?",
        difficulty: "EASY",
        answers: [
          { text: "Isaac Newton", isCorrect: false },
          { text: "Albert Einstein", isCorrect: true },
          { text: "Niels Bohr", isCorrect: false },
          { text: "Max Planck", isCorrect: false },
        ],
      },
      {
        text: "Qual è la velocità della luce nel vuoto (approssimata)?",
        difficulty: "MEDIUM",
        answers: [
          { text: "300.000 km/s", isCorrect: true },
          { text: "150.000 km/s", isCorrect: false },
          { text: "1.000.000 km/s", isCorrect: false },
          { text: "30.000 km/s", isCorrect: false },
        ],
      },
      {
        text: "Qual è la formula chimica dell'acqua?",
        difficulty: "EASY",
        answers: [
          { text: "HO", isCorrect: false },
          { text: "H2O", isCorrect: true },
          { text: "H2O2", isCorrect: false },
          { text: "CO2", isCorrect: false },
        ],
      },
      {
        text: "Quale gas è il più abbondante nell'atmosfera terrestre?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Ossigeno", isCorrect: false },
          { text: "Anidride carbonica", isCorrect: false },
          { text: "Azoto", isCorrect: true },
          { text: "Argon", isCorrect: false },
        ],
      },
      {
        text: "Da cosa è composto il nucleo di un atomo?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Solo protoni", isCorrect: false },
          { text: "Protoni ed elettroni", isCorrect: false },
          { text: "Protoni e neutroni", isCorrect: true },
          { text: "Solo neutroni", isCorrect: false },
        ],
      },
      {
        text: "Qual è il numero atomico del carbonio?",
        difficulty: "MEDIUM",
        answers: [
          { text: "4", isCorrect: false },
          { text: "6", isCorrect: true },
          { text: "8", isCorrect: false },
          { text: "12", isCorrect: false },
        ],
      },
      {
        text: "Qual è l'unità di misura dell'energia nel Sistema Internazionale?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Watt", isCorrect: false },
          { text: "Newton", isCorrect: false },
          { text: "Joule", isCorrect: true },
          { text: "Pascal", isCorrect: false },
        ],
      },
    ],
  },
  {
    category: { name: "Arte e Cultura", slug: "arte-cultura", icon: "🎨", color: "#ec4899" },
    questions: [
      {
        text: "Chi ha dipinto la Gioconda?",
        difficulty: "EASY",
        answers: [
          { text: "Michelangelo", isCorrect: false },
          { text: "Raffaello", isCorrect: false },
          { text: "Leonardo da Vinci", isCorrect: true },
          { text: "Caravaggio", isCorrect: false },
        ],
      },
      {
        text: "In quale città si trova il Colosseo?",
        difficulty: "EASY",
        answers: [
          { text: "Atene", isCorrect: false },
          { text: "Roma", isCorrect: true },
          { text: "Napoli", isCorrect: false },
          { text: "Firenze", isCorrect: false },
        ],
      },
      {
        text: "Chi scrisse 'La Divina Commedia'?",
        difficulty: "EASY",
        answers: [
          { text: "Petrarca", isCorrect: false },
          { text: "Boccaccio", isCorrect: false },
          { text: "Dante Alighieri", isCorrect: true },
          { text: "Manzoni", isCorrect: false },
        ],
      },
      {
        text: "Quale movimento artistico è associato a Pablo Picasso?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Impressionismo", isCorrect: false },
          { text: "Cubismo", isCorrect: true },
          { text: "Surrealismo", isCorrect: false },
          { text: "Espressionismo", isCorrect: false },
        ],
      },
      {
        text: "Chi scrisse 'I Promessi Sposi'?",
        difficulty: "EASY",
        answers: [
          { text: "Dante Alighieri", isCorrect: false },
          { text: "Francesco Petrarca", isCorrect: false },
          { text: "Alessandro Manzoni", isCorrect: true },
          { text: "Giovanni Boccaccio", isCorrect: false },
        ],
      },
      {
        text: "In quale museo si trova la Gioconda?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Museo degli Uffizi, Firenze", isCorrect: false },
          { text: "Louvre, Parigi", isCorrect: true },
          { text: "National Gallery, Londra", isCorrect: false },
          { text: "Prado, Madrid", isCorrect: false },
        ],
      },
      {
        text: "Chi compose la Nona Sinfonia?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Mozart", isCorrect: false },
          { text: "Bach", isCorrect: false },
          { text: "Beethoven", isCorrect: true },
          { text: "Vivaldi", isCorrect: false },
        ],
      },
      {
        text: "Quale pittore olandese si tagliò un orecchio?",
        difficulty: "EASY",
        answers: [
          { text: "Rembrandt", isCorrect: false },
          { text: "Vermeer", isCorrect: false },
          { text: "Vincent van Gogh", isCorrect: true },
          { text: "Mondrian", isCorrect: false },
        ],
      },
      {
        text: "Chi scrisse 'Romeo e Giulietta'?",
        difficulty: "EASY",
        answers: [
          { text: "Charles Dickens", isCorrect: false },
          { text: "William Shakespeare", isCorrect: true },
          { text: "Victor Hugo", isCorrect: false },
          { text: "Jane Austen", isCorrect: false },
        ],
      },
    ],
  },
  {
    category: { name: "Sport", slug: "sport", icon: "⚽", color: "#ef4444" },
    questions: [
      {
        text: "Ogni quanti anni si svolgono le Olimpiadi estive?",
        difficulty: "EASY",
        answers: [
          { text: "2 anni", isCorrect: false },
          { text: "3 anni", isCorrect: false },
          { text: "4 anni", isCorrect: true },
          { text: "5 anni", isCorrect: false },
        ],
      },
      {
        text: "Quale nazione ha vinto più Mondiali di calcio?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Germania", isCorrect: false },
          { text: "Italia", isCorrect: false },
          { text: "Brasile", isCorrect: true },
          { text: "Argentina", isCorrect: false },
        ],
      },
      {
        text: "In quale sport si usa la 'racchetta'?",
        difficulty: "EASY",
        answers: [
          { text: "Calcio", isCorrect: false },
          { text: "Tennis", isCorrect: true },
          { text: "Nuoto", isCorrect: false },
          { text: "Pallavolo", isCorrect: false },
        ],
      },
      {
        text: "Quanti giocatori ci sono in campo per squadra nel basket?",
        difficulty: "EASY",
        answers: [
          { text: "4", isCorrect: false },
          { text: "5", isCorrect: true },
          { text: "6", isCorrect: false },
          { text: "7", isCorrect: false },
        ],
      },
      {
        text: "Dove si tennero le Olimpiadi estive del 2016?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Londra", isCorrect: false },
          { text: "Tokyo", isCorrect: false },
          { text: "Rio de Janeiro", isCorrect: true },
          { text: "Pechino", isCorrect: false },
        ],
      },
      {
        text: "Quante buche ha un campo da golf standard?",
        difficulty: "MEDIUM",
        answers: [
          { text: "9", isCorrect: false },
          { text: "12", isCorrect: false },
          { text: "18", isCorrect: true },
          { text: "24", isCorrect: false },
        ],
      },
      {
        text: "Quale paese ha vinto il Mondiale di calcio del 2018?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Germania", isCorrect: false },
          { text: "Brasile", isCorrect: false },
          { text: "Francia", isCorrect: true },
          { text: "Croazia", isCorrect: false },
        ],
      },
      {
        text: "In quale sport si esegue un 'canestro'?",
        difficulty: "EASY",
        answers: [
          { text: "Pallavolo", isCorrect: false },
          { text: "Pallacanestro", isCorrect: true },
          { text: "Calcio", isCorrect: false },
          { text: "Rugby", isCorrect: false },
        ],
      },
    ],
  },
  {
    category: { name: "Cinema", slug: "cinema", icon: "🎬", color: "#8b5cf6" },
    questions: [
      {
        text: "Chi ha diretto 'Il Padrino'?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Martin Scorsese", isCorrect: false },
          { text: "Francis Ford Coppola", isCorrect: true },
          { text: "Steven Spielberg", isCorrect: false },
          { text: "Quentin Tarantino", isCorrect: false },
        ],
      },
      {
        text: "Quale film ha vinto l'Oscar come miglior film nel 2020?",
        difficulty: "HARD",
        answers: [
          { text: "1917", isCorrect: false },
          { text: "Joker", isCorrect: false },
          { text: "Parasite", isCorrect: true },
          { text: "C'era una volta a Hollywood", isCorrect: false },
        ],
      },
      {
        text: "Chi interpreta Jack Sparrow nei 'Pirati dei Caraibi'?",
        difficulty: "EASY",
        answers: [
          { text: "Johnny Depp", isCorrect: true },
          { text: "Orlando Bloom", isCorrect: false },
          { text: "Brad Pitt", isCorrect: false },
          { text: "Leonardo DiCaprio", isCorrect: false },
        ],
      },
      {
        text: "Chi ha diretto il film 'Titanic' del 1997?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Steven Spielberg", isCorrect: false },
          { text: "James Cameron", isCorrect: true },
          { text: "Christopher Nolan", isCorrect: false },
          { text: "Ridley Scott", isCorrect: false },
        ],
      },
      {
        text: "In quale film Disney c'è la canzone 'Let It Go'?",
        difficulty: "EASY",
        answers: [
          { text: "Cenerentola", isCorrect: false },
          { text: "Rapunzel", isCorrect: false },
          { text: "Frozen", isCorrect: true },
          { text: "Oceania", isCorrect: false },
        ],
      },
      {
        text: "Chi ha doppiato Woody in 'Toy Story' (versione originale inglese)?",
        difficulty: "MEDIUM",
        answers: [
          { text: "Tom Hanks", isCorrect: true },
          { text: "Tom Cruise", isCorrect: false },
          { text: "Will Smith", isCorrect: false },
          { text: "Jim Carrey", isCorrect: false },
        ],
      },
      {
        text: "In quale anno uscì il primo film di 'Star Wars'?",
        difficulty: "MEDIUM",
        answers: [
          { text: "1975", isCorrect: false },
          { text: "1977", isCorrect: true },
          { text: "1980", isCorrect: false },
          { text: "1983", isCorrect: false },
        ],
      },
      {
        text: "Quale attore interpreta Iron Man nel Marvel Cinematic Universe?",
        difficulty: "EASY",
        answers: [
          { text: "Chris Evans", isCorrect: false },
          { text: "Chris Hemsworth", isCorrect: false },
          { text: "Robert Downey Jr.", isCorrect: true },
          { text: "Mark Ruffalo", isCorrect: false },
        ],
      },
    ],
  },
];

async function main() {
  console.log("🌱 Inizio seed del database...");

  // Pulisci il database
  await prisma.playerAnswer.deleteMany();
  await prisma.player.deleteMany();
  await prisma.gameQuestion.deleteMany();
  await prisma.game.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.question.deleteMany();
  await prisma.category.deleteMany();

  for (const data of seedData) {
    const category = await prisma.category.create({
      data: data.category,
    });
    console.log(`✓ Creata categoria: ${category.name}`);

    for (const q of data.questions) {
      await prisma.question.create({
        data: {
          text: q.text,
          difficulty: q.difficulty,
          categoryId: category.id,
          answers: {
            create: q.answers.map((a, i) => ({
              text: a.text,
              isCorrect: a.isCorrect,
              order: i,
            })),
          },
        },
      });
    }
    console.log(`  → Aggiunte ${data.questions.length} domande`);
  }

  const total = await prisma.question.count();
  console.log(`\n✅ Seed completato! Totale domande: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
