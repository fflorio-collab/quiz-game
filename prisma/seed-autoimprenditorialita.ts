/**
 * Seed "Autoimprenditorialità": categoria utile come base per una lezione.
 * - 1 root + 6 sotto-categorie tematiche
 * - ~30 domande con scenari reali e `explanation` (da leggere a voce dopo il reveal)
 *
 * Esecuzione: `npx tsx prisma/seed-autoimprenditorialita.ts`
 * (oppure `npm run db:seed-autoimprenditorialita` se aggiunto a package.json)
 *
 * Idempotente: le sotto-categorie sono upsert per slug; le domande vengono create
 * solo se per quello slug di sotto-categoria non ci sono già domande con lo stesso
 * testo esatto (così si può rilanciare senza duplicare).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOT = {
  slug: "autoimprenditorialita",
  name: "Autoimprenditorialità",
  icon: "🚀",
  color: "#f97316",
};

const SUBS = [
  { slug: "auto-idea-validazione", name: "Idea & Validazione", icon: "💡", color: "#f97316" },
  { slug: "auto-business-model", name: "Business Model", icon: "🧩", color: "#f97316" },
  { slug: "auto-finanza", name: "Finanza & Cash flow", icon: "💶", color: "#f97316" },
  { slug: "auto-marketing-vendite", name: "Marketing & Vendite", icon: "📣", color: "#f97316" },
  { slug: "auto-team-legal-fundraising", name: "Team, Legale, Fundraising", icon: "📑", color: "#f97316" },
  { slug: "auto-casi-studio", name: "Casi di studio reali", icon: "📚", color: "#f97316" },
] as const;

type QType = "MULTIPLE_CHOICE" | "OPEN_ANSWER";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface SeedQuestion {
  subSlug: string;
  text: string;
  type: QType;
  difficulty: Difficulty;
  points?: number;
  explanation: string;
  answers?: Array<{ text: string; isCorrect: boolean }>;
  openAnswer?: string;
}

const QUESTIONS: SeedQuestion[] = [
  // ============ IDEA & VALIDAZIONE ============
  {
    subSlug: "auto-idea-validazione",
    text: "Sara ha un'idea per un'app di prenotazione parrucchieri. Ha 2.000€ di risparmi. Qual è il primo passo consigliato PRIMA di scrivere codice?",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    explanation:
      "Il Customer Development (Steve Blank) dice: prima di costruire il prodotto, parla con 20+ potenziali clienti. Capire il problema vale più di qualsiasi MVP tecnico.",
    answers: [
      { text: "Parlare con 20 parrucchieri e 20 clienti per validare il problema", isCorrect: true },
      { text: "Comprare un dominio e fare il logo", isCorrect: false },
      { text: "Assumere uno sviluppatore", isCorrect: false },
      { text: "Cercare un finanziatore", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-idea-validazione",
    text: "Cos'è un MVP (Minimum Viable Product)?",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    explanation:
      "L'MVP è la versione minima del prodotto che permette di testare un'ipotesi di business con risorse minime. Non è un prodotto povero: è un esperimento mirato.",
    answers: [
      { text: "La versione più economica del prodotto finale", isCorrect: false },
      { text: "La minima versione che ti permette di imparare dai clienti reali", isCorrect: true },
      { text: "Il prototipo interno prima del lancio", isCorrect: false },
      { text: "La demo del pitch per gli investitori", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-idea-validazione",
    text: "Marco dice: 'Il mio prodotto è per tutti, piace a chiunque lo prova'. Quale è il rischio più probabile?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Un prodotto 'per tutti' di solito non ha un cliente target preciso. Senza target preciso non sai a chi parlare, su quali canali, con che messaggio. Meglio essere 'must-have' per 100 persone che 'nice-to-have' per 10.000.",
    answers: [
      { text: "Manca un target preciso: sarà difficile acquisire clienti", isCorrect: true },
      { text: "Crescerà troppo velocemente", isCorrect: false },
      { text: "Piace perché è davvero geniale", isCorrect: false },
      { text: "Non ha bisogno di marketing", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-idea-validazione",
    text: "Giulia lancia un'app P2P per inviare soldi tra amici. Dopo 3 mesi nessuno la usa, ma 4 aziende le chiedono se può adattarla per i loro pagamenti fornitori. Cosa fa un imprenditore 'lean'?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Questo è un classico caso di 'pivot': cambiare direzione in base al mercato. È esattamente la storia di Slack (nato come chat interno di un videogioco) o Twitter (nato da Odeo, piattaforma podcast). Ignorare il segnale dei 4 clienti paganti è uno dei più grandi errori dei fondatori.",
    answers: [
      { text: "Pivot: riorienta il prodotto al B2B e monetizza subito", isCorrect: true },
      { text: "Insiste sul P2P perché l'idea originale era quella", isCorrect: false },
      { text: "Chiude l'azienda", isCorrect: false },
      { text: "Fa entrambe le cose allo stesso tempo", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-idea-validazione",
    text: "Nel framework 'Jobs To Be Done': quando un cliente compra un trapano, qual è il vero 'job' che sta assumendo?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Theodore Levitt (Harvard, 1960): 'Le persone non vogliono un trapano da un quarto di pollice. Vogliono un buco da un quarto di pollice'. Capire il vero 'job' ti porta a soluzioni non ovvie: adesivi 3M, colla forte, appendini senza foratura.",
    answers: [
      { text: "Un buco nel muro (il risultato desiderato)", isCorrect: true },
      { text: "Un trapano di qualità", isCorrect: false },
      { text: "Strumenti professionali", isCorrect: false },
      { text: "Un attrezzo da esibire in garage", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-idea-validazione",
    text: "Scrivi il nome della tecnica con cui metti online una landing page con il prodotto inesistente e un bottone 'Acquista' per misurare l'interesse reale PRIMA di costruire qualsiasi cosa.",
    type: "OPEN_ANSWER",
    difficulty: "HARD",
    explanation:
      "Il 'fake door test' (o 'smoke test' o 'pre-order landing') è il modo più veloce per validare domanda reale: chi clicca Acquista riceve una schermata 'Stiamo ancora completando il prodotto'. Se il CTR è basso, l'idea non decolla. Usato da Dropbox nel 2007 con un video prima del prodotto.",
    openAnswer: "fake door",
  },

  // ============ BUSINESS MODEL ============
  {
    subSlug: "auto-business-model",
    text: "In quanti blocchi è strutturato il Business Model Canvas di Alex Osterwalder?",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    explanation:
      "9 blocchi: Customer Segments, Value Proposition, Channels, Customer Relationships, Revenue Streams, Key Activities, Key Resources, Key Partners, Cost Structure. Il Lean Canvas di Ash Maurya (variante per startup) ne ha sempre 9 ma diversi (tra cui Problem e Unfair Advantage).",
    answers: [
      { text: "5", isCorrect: false },
      { text: "7", isCorrect: false },
      { text: "9", isCorrect: true },
      { text: "12", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-business-model",
    text: "Luca produce candele artigianali. Costo produzione: 8€. Prezzo vendita: 22€. Spende 7€ in ads per cliente. Spedizione a suo carico: 5€. Qual è il margine unitario?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Unit economics: 22 - 8 - 7 - 5 = 2€ di margine. È positivo (contribution margin > 0) ma molto basso: basta un reso e vai in perdita. La lezione: guarda sempre i COSTI TOTALI di acquisizione e consegna, non solo il costo di produzione.",
    answers: [
      { text: "2€ (positivo ma fragile)", isCorrect: true },
      { text: "14€ (prezzo - costo)", isCorrect: false },
      { text: "7€", isCorrect: false },
      { text: "-3€ (in perdita)", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-business-model",
    text: "Che cos'è l'MRR in un business a sottoscrizione?",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    explanation:
      "MRR = Monthly Recurring Revenue. È il ricavo ricorrente mensile, al netto di fatture una tantum. L'ARR è lo stesso concetto annualizzato. Sono le 2 metriche chiave del SaaS: gli investitori valutano l'azienda come multiplo dell'ARR.",
    answers: [
      { text: "Monthly Recurring Revenue — il ricavo ricorrente al mese", isCorrect: true },
      { text: "Marketing Return Ratio", isCorrect: false },
      { text: "Minimum Revenue Requirement", isCorrect: false },
      { text: "Mean Revenue per Reseller", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-business-model",
    text: "Paolo gestisce una palestra. 180 abbonati a 55€/mese. Affitto 3.200€, istruttori 3.800€, utenze 500€. Break-even mensile (quanti abbonati servono per pareggiare)?",
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    explanation:
      "Costi fissi: 3.200 + 3.800 + 500 = 7.500€. Break-even = 7.500 / 55 ≈ 137 abbonati. Paolo ne ha 180 → 43 abbonati di margine = ~2.365€ di profitto mensile. Lezione: il break-even analysis è il primo calcolo da fare prima di qualsiasi espansione.",
    answers: [
      { text: "137 abbonati", isCorrect: true },
      { text: "100 abbonati", isCorrect: false },
      { text: "180 abbonati (è già a break-even ora)", isCorrect: false },
      { text: "200 abbonati", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-business-model",
    text: "Netflix, Spotify e Adobe Creative Cloud sono esempi del modello di business chiamato ___ .",
    type: "OPEN_ANSWER",
    difficulty: "EASY",
    explanation:
      "Subscription (sottoscrizione) o SaaS per il software. Vantaggi: ricavi prevedibili, maggiore LTV per cliente, valutazioni più alte. Svantaggi: alta responsabilità di retention — un cliente insoddisfatto cancella in 10 secondi.",
    openAnswer: "subscription",
  },
  {
    subSlug: "auto-business-model",
    text: "Un marketplace che mette in contatto domanda e offerta (Airbnb, Uber, Etsy) e prende una commissione è un esempio di business model _____-sided.",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Two-sided marketplace: serve far crescere ENTRAMBI i lati in equilibrio. Il classico 'chicken-and-egg problem': senza host niente ospiti, senza ospiti niente host. Airbnb risolse con il famoso 'Craigslist hack' del 2008.",
    answers: [
      { text: "two-sided (due lati)", isCorrect: true },
      { text: "one-sided", isCorrect: false },
      { text: "zero-sided", isCorrect: false },
      { text: "multi-level", isCorrect: false },
    ],
  },

  // ============ FINANZA & CASH FLOW ============
  {
    subSlug: "auto-finanza",
    text: "Qual è la differenza tra PROFITTO e CASH FLOW?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Il profitto è la differenza tra ricavi e costi (competenza). Il cash flow è il movimento reale di denaro (cassa). Puoi essere in profitto ma senza soldi in banca (cliente che paga a 120 giorni) oppure avere molta cassa ma essere in perdita. Motto: 'Cash is king'.",
    answers: [
      { text: "Il profitto è una grandezza 'contabile', il cash flow è il vero denaro entrato/uscito dalla cassa", isCorrect: true },
      { text: "Sono sinonimi", isCorrect: false },
      { text: "Il cash flow si calcola solo a fine anno", isCorrect: false },
      { text: "Il profitto vale solo per le società, il cash flow per le ditte individuali", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-finanza",
    text: "Alessandra ha 90.000€ in banca. Ogni mese spende 18.000€ e incassa 6.000€. Qual è la sua 'runway' (mesi prima di finire i soldi)?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Burn rate = 18.000 - 6.000 = 12.000€/mese. Runway = 90.000 / 12.000 = 7,5 mesi. Regola d'oro: se hai meno di 6 mesi di runway, devi già parlare con investitori o tagliare costi. A 3 mesi è emergenza.",
    answers: [
      { text: "7,5 mesi", isCorrect: true },
      { text: "5 mesi", isCorrect: false },
      { text: "15 mesi", isCorrect: false },
      { text: "3 mesi", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-finanza",
    text: "Nel regime forfettario italiano, qual è l'aliquota agevolata applicata nei primi 5 anni di attività per chi rispetta i requisiti (start-up)?",
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    explanation:
      "Il 5% si applica per i primi 5 anni se: sei sotto i 85.000€ di ricavi, non hai svolto nei 3 anni precedenti attività in forma d'impresa o lavoro autonomo, e non stai continuando una precedente attività (es. stesso studio professionale). Dopo i 5 anni: 15%.",
    answers: [
      { text: "5%", isCorrect: true },
      { text: "15%", isCorrect: false },
      { text: "22%", isCorrect: false },
      { text: "0% (nessuna imposta)", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-finanza",
    text: "Qual è la soglia di ricavi/compensi oltre la quale una partita IVA in regime forfettario decade (Italia, 2024)?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "85.000€ è la soglia. Se nel corso dell'anno superi i 100.000€ esci dal regime immediatamente; tra 85.001 e 100.000€ resti nel regime per l'anno in corso ma esci da gennaio successivo. Importante: non è tutto il fatturato, è il coefficiente di redditività applicato.",
    answers: [
      { text: "85.000€", isCorrect: true },
      { text: "30.000€", isCorrect: false },
      { text: "65.000€", isCorrect: false },
      { text: "120.000€", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-finanza",
    text: "Qual è il capitale sociale minimo per costituire una SRL 'ordinaria' in Italia?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "SRL ordinaria: 10.000€ di capitale sociale (di cui almeno 2.500€ versati all'atto di costituzione). SRLS (semplificata): capitale da 1€ a 9.999€, atto costitutivo standard. Dal 2014 esiste anche la SRL 'a capitale ridotto'. Scegli in base a serietà, rapporto con banche e investitori.",
    answers: [
      { text: "10.000€", isCorrect: true },
      { text: "1€", isCorrect: false },
      { text: "50.000€", isCorrect: false },
      { text: "100.000€", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-finanza",
    text: "La 'bootstrap' di un'impresa significa ___",
    type: "OPEN_ANSWER",
    difficulty: "MEDIUM",
    explanation:
      "Bootstrapping = finanziare la crescita con le proprie risorse e i primi ricavi, senza raccogliere capitale esterno (VC, angel). Vantaggi: mantieni controllo e equity; svantaggi: crescita più lenta. Basecamp, Mailchimp (poi venduta a 12 miliardi) e Zoho sono casi famosi di aziende bootstrap.",
    openAnswer: "autofinanziamento",
  },

  // ============ MARKETING & VENDITE ============
  {
    subSlug: "auto-marketing-vendite",
    text: "Cosa significa l'acronimo CAC in marketing?",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    explanation:
      "Customer Acquisition Cost = costo medio per acquisire un cliente (spesa totale marketing/vendite diviso numero nuovi clienti). È la metrica più importante insieme all'LTV.",
    answers: [
      { text: "Customer Acquisition Cost", isCorrect: true },
      { text: "Content Advertising Cost", isCorrect: false },
      { text: "Campaign Activation Cost", isCorrect: false },
      { text: "Customer Audit Cycle", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-marketing-vendite",
    text: "La tua app costa 40€ per acquisire un cliente (CAC) e il cliente medio genera 200€ nella sua vita (LTV). Il ratio LTV:CAC è...",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "LTV:CAC = 200:40 = 5:1. Convenzione: sopra 3:1 è business sano, sotto 1:1 stai bruciando soldi. 5:1 è ottimo ma potresti investire di più in acquisition (se hai capacità di servire). Sotto 3:1 prova a: alzare prezzi, aumentare retention, ridurre CAC.",
    answers: [
      { text: "5:1 — sano, puoi scalare", isCorrect: true },
      { text: "1:5 — disastroso", isCorrect: false },
      { text: "40:200 — irrilevante", isCorrect: false },
      { text: "Non si può calcolare senza conoscere il margine", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-marketing-vendite",
    text: "Il framework AARRR (o 'Pirate Metrics' di Dave McClure) prevede quali 5 stadi del funnel?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Acquisition, Activation, Retention, Referral, Revenue. Utile per sapere DOVE nel funnel perdi utenti e cosa ottimizzare per primo. Regola: prima ottimizzi Retention (tieni chi arriva), poi Acquisition (porti più persone). Acquisire senza trattenere è buttare soldi.",
    answers: [
      { text: "Acquisition, Activation, Retention, Referral, Revenue", isCorrect: true },
      { text: "Awareness, Acquisition, Activation, Revenue, Retention", isCorrect: false },
      { text: "Advertising, Arrivals, Retention, Repurchase, Refund", isCorrect: false },
      { text: "Audience, Ads, Attention, Revenue, Return", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-marketing-vendite",
    text: "Volvo si è posizionata storicamente come 'la macchina più ___ '. Completa.",
    type: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    explanation:
      "Sicura. Un brand dovrebbe occupare UNA parola nella mente del cliente (Al Ries, Jack Trout 'Positioning'). BMW = guidabile, Volvo = sicura, Tesla = innovativa, Ferrari = prestazione. Voler essere 'tutto' significa essere niente.",
    answers: [
      { text: "sicura", isCorrect: true },
      { text: "veloce", isCorrect: false },
      { text: "economica", isCorrect: false },
      { text: "moderna", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-marketing-vendite",
    text: "Come si chiama il momento in cui un nuovo utente 'capisce il valore' di un prodotto (es. Facebook: 7 amici in 10 giorni)?",
    type: "OPEN_ANSWER",
    difficulty: "MEDIUM",
    explanation:
      "Aha moment. Ogni prodotto ne ha uno: Twitter = seguire 30 persone, Dropbox = installare su 2 device, Slack = 2000 messaggi tra team. Mappare il proprio aha moment e portare i nuovi utenti lì il prima possibile è il core dell'activation.",
    openAnswer: "aha moment",
  },
  {
    subSlug: "auto-marketing-vendite",
    text: "Chiara ha un e-commerce di cosmetici. CAC attuale su Meta Ads: 35€. Ordine medio: 30€. Margine 40%. Sta guadagnando su ogni cliente nuovo?",
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    explanation:
      "Margine per ordine = 30 × 40% = 12€. CAC = 35€. Perdita sul primo acquisto = 23€. Chiara guadagna solo se il cliente RITORNA almeno 3 volte. Qui il cuore del gioco e-commerce: senza repeat purchase, le ads ti bruciano.",
    answers: [
      { text: "No, perde 23€ per cliente al primo acquisto — servono acquisti ripetuti", isCorrect: true },
      { text: "Sì, guadagna 5€ per cliente subito", isCorrect: false },
      { text: "Sì, guadagna 40% di margine", isCorrect: false },
      { text: "Impossibile rispondere senza conoscere il CPM", isCorrect: false },
    ],
  },

  // ============ TEAM, LEGALE, FUNDRAISING ============
  {
    subSlug: "auto-team-legal-fundraising",
    text: "Marco e 2 co-fondatori si dividono l'azienda 33% + 33% + 33%. Danno 20% a un angel e creano un ESOP del 10% per futuri dipendenti. Quanto rimane a ciascun co-fondatore?",
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    explanation:
      "Dopo diluizione: 100% - 20% (angel) - 10% (ESOP) = 70% ai co-founder. Se si dividono 70%/3 ≈ 23,3% a testa. La lezione: ogni round diluisce, ogni ESOP diluisce. Parti 'largo' (tieniti almeno 60-70% come fondatore principale dopo il primo round) se punti a più round.",
    answers: [
      { text: "~23,3% a testa", isCorrect: true },
      { text: "33% a testa (non diluisce)", isCorrect: false },
      { text: "~26,7% a testa", isCorrect: false },
      { text: "~20% a testa", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-team-legal-fundraising",
    text: "Nel vesting standard di una startup (4 anni, 1 anno di cliff), cosa succede se un co-founder lascia dopo 6 mesi?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "4 anni con cliff di 1 anno significa: nessuna quota matura prima di 12 mesi. Se te ne vai a 6 mesi, perdi TUTTE le quote. Dopo 12 mesi ne maturi il 25% (il cliff 'scatta') poi l'altro 75% vesting lineare per i 3 anni restanti. Serve a proteggere l'azienda dal 'fondatore fantasma'.",
    answers: [
      { text: "Perde tutte le quote (cliff non raggiunto)", isCorrect: true },
      { text: "Tiene il 50%", isCorrect: false },
      { text: "Tiene il 12,5% (6/48 mesi)", isCorrect: false },
      { text: "Tiene tutto se ha firmato", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-team-legal-fundraising",
    text: "Un round 'Seed' in Italia oggi tipicamente raccoglie una somma nell'ordine di:",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Seed italiano: tipicamente 300k–1,5M€, a valutazione pre-money 1,5–5M€. 'Pre-seed' è più piccolo (50-300k, spesso da friends&family o angel). 'Series A' è il round successivo (2-10M€). I range variano per settore e periodo.",
    answers: [
      { text: "300k–1,5M€", isCorrect: true },
      { text: "10M–50M€", isCorrect: false },
      { text: "<50k€", isCorrect: false },
      { text: "oltre 100M€", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-team-legal-fundraising",
    text: "Quale di queste slide NON è essenziale in un pitch deck da 10-12 slide?",
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    explanation:
      "Essenziali: Problem, Solution, Market Size, Business Model, Traction, Team, Competition, Ask. La cronologia personale del fondatore (dalle elementari...) fa perdere tempo prezioso. L'investitore vuole sapere PERCHÉ QUEL team è il migliore per risolvere QUEL problema — non la biografia.",
    answers: [
      { text: "Biografia dettagliata del fondatore dall'infanzia a oggi", isCorrect: true },
      { text: "Dimensione del mercato (TAM/SAM/SOM)", isCorrect: false },
      { text: "Traction e metriche attuali", isCorrect: false },
      { text: "Quanto capitale chiedi e cosa farai coi soldi", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-team-legal-fundraising",
    text: "Dopo il seed round, la tua quota scende dal 40% al 28%. Di quanto sei stato diluito (in %)?",
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    explanation:
      "Diluizione = (quota_vecchia - quota_nuova) / quota_vecchia = (40 - 28) / 40 = 30%. È un errore comune dire '12%' guardando solo la differenza assoluta. Ogni round aggiunge diluizione sulla quota residua, non sul capitale originale.",
    answers: [
      { text: "30%", isCorrect: true },
      { text: "12%", isCorrect: false },
      { text: "28%", isCorrect: false },
      { text: "40%", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-team-legal-fundraising",
    text: "Come si chiama la clausola che permette alla società di riprendersi le quote di un co-fondatore o dipendente se lascia prima del completamento del vesting?",
    type: "OPEN_ANSWER",
    difficulty: "HARD",
    explanation:
      "'Reverse vesting' (o 'leaver clause' / 'buy-back clause'). Il fondatore ha il 100% delle quote all'inizio, ma la società può ri-acquistarle se lui va via prematuramente. È il meccanismo che rende davvero efficace il vesting: senza reverse vesting, un co-fondatore che se ne va a 6 mesi potrebbe in teoria tenere le sue azioni.",
    openAnswer: "reverse vesting",
  },

  // ============ CASI DI STUDIO REALI ============
  {
    subSlug: "auto-casi-studio",
    text: "Nel 2008 Airbnb era in crisi di liquidità. Come si autofinanziarono i fondatori?",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Vendettero cereali in scatole 'Obama O's' e 'Cap'n McCain's' durante la campagna presidenziale USA 2008. Incassarono circa 30.000$ che mantennero Airbnb in vita. Paul Graham (Y Combinator) li prese dopo aver sentito questa storia: 'Se sopravvivono vendendo cereali, sopravvivono a tutto'.",
    answers: [
      { text: "Vendendo cereali 'Obama O's' e 'Cap'n McCain's'", isCorrect: true },
      { text: "Prestito bancario da Goldman Sachs", isCorrect: false },
      { text: "Ipoteca sulle case dei fondatori", isCorrect: false },
      { text: "Crowdfunding su Kickstarter", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-casi-studio",
    text: "Slack, oggi azienda da miliardi, è nata come...",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "Slack era lo strumento di comunicazione interno del team di 'Glitch', un videogioco MMO che Stewart Butterfield stava sviluppando. Il gioco fallì ma il team si accorse che lo strumento di chat era molto migliore degli altri sul mercato. Pivot totale → Slack. Classico esempio di 'by-product' che diventa il prodotto.",
    answers: [
      { text: "Tool interno di un videogioco (Glitch) che fallì", isCorrect: true },
      { text: "Progetto universitario del MIT", isCorrect: false },
      { text: "Spin-off di Microsoft Teams", isCorrect: false },
      { text: "Idea presentata in un hackathon", isCorrect: false },
    ],
  },
  {
    subSlug: "auto-casi-studio",
    text: "Quale founder italiano ha guidato la crescita e l'IPO del gruppo YOOX Net-a-Porter, primo 'unicorno' italiano del fashion digitale?",
    type: "OPEN_ANSWER",
    difficulty: "HARD",
    explanation:
      "Federico Marchetti ha fondato YOOX nel 2000 a Milano, l'ha portata in borsa nel 2009 e nel 2015 l'ha fusa con Net-a-Porter creando uno dei più grandi player del luxury online (circa 5 miliardi di ricavi). Ha lasciato l'azienda nel 2021. Esempio raro e studiato di scale-up digitale italiano a livello globale.",
    openAnswer: "federico marchetti",
  },
  {
    subSlug: "auto-casi-studio",
    text: "Brian Chesky (CEO di Airbnb) ricevette dal suo mentore Paul Graham un consiglio diventato celebre: 'Do things that ___'. Completa.",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    explanation:
      "'Do things that don't scale' (Paul Graham, 2013). Agli albori devi fare cose manualmente, una a una: chiamare ogni cliente, risolvere ogni problema di persona. I fondatori di Airbnb andarono a New York a scattare le foto degli appartamenti uno per uno. Scalare prima di aver capito il cliente è un errore fatale.",
    answers: [
      { text: "don't scale (non scalano)", isCorrect: true },
      { text: "will scale (scalano)", isCorrect: false },
      { text: "work in reverse", isCorrect: false },
      { text: "make money", isCorrect: false },
    ],
  },
];

async function upsertCategory(
  slug: string,
  name: string,
  icon: string | null,
  color: string | null,
  parentId: string | null,
  sortOrder = 0
): Promise<string> {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: { name, icon, color, parentId, sortOrder },
    });
    return updated.id;
  }
  const created = await prisma.category.create({
    data: { slug, name, icon, color, parentId, sortOrder },
  });
  return created.id;
}

async function main() {
  // Root
  const rootId = await upsertCategory(ROOT.slug, ROOT.name, ROOT.icon, ROOT.color, null, 100);

  // Sub-categorie
  const subIdBySlug = new Map<string, string>();
  for (let i = 0; i < SUBS.length; i++) {
    const s = SUBS[i];
    const id = await upsertCategory(s.slug, s.name, s.icon, s.color, rootId, i);
    subIdBySlug.set(s.slug, id);
  }

  // Domande
  let created = 0;
  let skipped = 0;
  for (const q of QUESTIONS) {
    const categoryId = subIdBySlug.get(q.subSlug);
    if (!categoryId) {
      console.warn(`⚠️  Sotto-categoria non trovata: ${q.subSlug}`);
      continue;
    }
    // Check duplicato: stesso testo nella stessa categoria
    const duplicate = await prisma.question.findFirst({
      where: { categoryId, text: q.text },
    });
    if (duplicate) { skipped++; continue; }

    await prisma.question.create({
      data: {
        text: q.text,
        type: q.type,
        difficulty: q.difficulty,
        timeLimit: 30,
        points: q.points ?? 1000,
        explanation: q.explanation,
        categoryId,
        openAnswer: q.openAnswer ?? null,
        answers: q.answers
          ? { create: q.answers.map((a, idx) => ({ text: a.text, isCorrect: a.isCorrect, order: idx })) }
          : undefined,
      },
    });
    created++;
  }

  const totalInRoot = await prisma.question.count({
    where: { category: { OR: [{ slug: ROOT.slug }, { parent: { slug: ROOT.slug } }] } },
  });
  console.log(`✅ Seed autoimprenditorialità completato.`);
  console.log(`   Categorie: 1 root + ${SUBS.length} sub`);
  console.log(`   Domande create: ${created} · già presenti: ${skipped}`);
  console.log(`   Totale domande nella root 'Autoimprenditorialità': ${totalInRoot}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
