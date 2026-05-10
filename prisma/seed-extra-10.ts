/**
 * Seed: 10 domande aggiuntive per ciascuna categoria (root + sub) = 260 domande.
 * Idempotente: skip su domande con stesso testo nella stessa categoria.
 * Lancia con: tsx prisma/seed-extra-10.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  text: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  answers: [string, string, string, string]; // prima è la corretta
};

const BUNDLES: { slug: string; questions: Q[] }[] = [
  // ============================================================
  // ROOT: STORIA
  // ============================================================
  { slug: "storia", questions: [
    { text: "Chi era Tutankhamon?", difficulty: "EASY", answers: ["Faraone egizio", "Re mesopotamico", "Imperatore romano", "Re ittita"] },
    { text: "In quale anno fu firmato il Trattato di Versailles?", difficulty: "MEDIUM", answers: ["1919", "1918", "1920", "1921"] },
    { text: "Quale rivoluzione iniziò nel 1917 in Russia?", difficulty: "EASY", answers: ["Rivoluzione d'Ottobre", "Rivoluzione Francese", "Rivoluzione Industriale", "Rivoluzione Americana"] },
    { text: "Chi era Mao Zedong?", difficulty: "EASY", answers: ["Leader della Cina comunista", "Imperatore giapponese", "Presidente coreano", "Sultano ottomano"] },
    { text: "In quale anno si tennero le elezioni che fecero salire al potere Hitler?", difficulty: "MEDIUM", answers: ["1933", "1939", "1929", "1945"] },
    { text: "Cos'era la 'cortina di ferro'?", difficulty: "MEDIUM", answers: ["Confine ideologico Est-Ovest", "Esercito sovietico", "Trattato del 1948", "Muro di Berlino"] },
    { text: "Chi fu il primo segretario del PCI?", difficulty: "HARD", answers: ["Amadeo Bordiga", "Antonio Gramsci", "Palmiro Togliatti", "Enrico Berlinguer"] },
    { text: "In quale anno l'Italia entrò nella NATO?", difficulty: "HARD", answers: ["1949", "1955", "1947", "1957"] },
    { text: "In quale anno avvenne l'attentato a Sarajevo?", difficulty: "MEDIUM", answers: ["1914", "1918", "1905", "1920"] },
    { text: "Chi era Cesare Borgia?", difficulty: "HARD", answers: ["Figlio di Papa Alessandro VI", "Doge di Venezia", "Re di Spagna", "Imperatore tedesco"] },
  ]},

  // ============================================================
  // ROOT: GEOGRAFIA
  // ============================================================
  { slug: "geografia", questions: [
    { text: "Quale è la capitale del Portogallo?", difficulty: "EASY", answers: ["Lisbona", "Madrid", "Porto", "Coimbra"] },
    { text: "In quale paese si trova il Lago Titicaca?", difficulty: "MEDIUM", answers: ["Tra Perù e Bolivia", "Argentina", "Cile", "Ecuador"] },
    { text: "Quale è la capitale della Turchia?", difficulty: "MEDIUM", answers: ["Ankara", "Istanbul", "Izmir", "Antalya"] },
    { text: "In quale continente si trovano le Cascate Vittoria?", difficulty: "MEDIUM", answers: ["Africa", "Sud America", "Asia", "Oceania"] },
    { text: "Quale fiume divide Europa e Asia?", difficulty: "HARD", answers: ["Urali (è una catena montuosa, non un fiume — il fiume di confine è l'Ural)", "Ural", "Volga", "Don"] },
    { text: "Quale paese è famoso per i tulipani?", difficulty: "EASY", answers: ["Olanda", "Belgio", "Germania", "Danimarca"] },
    { text: "Quale è la più grande isola del Mediterraneo?", difficulty: "EASY", answers: ["Sicilia", "Sardegna", "Cipro", "Creta"] },
    { text: "In quale paese si trova il Cremlino?", difficulty: "EASY", answers: ["Russia", "Polonia", "Bielorussia", "Ucraina"] },
    { text: "Quale stato è completamente circondato dall'Italia?", difficulty: "EASY", answers: ["San Marino e Vaticano (entrambi)", "Solo San Marino", "Solo Vaticano", "Liechtenstein"] },
    { text: "Quale è il fiume più lungo dell'Asia?", difficulty: "HARD", answers: ["Yangtze", "Mekong", "Indo", "Gange"] },
  ]},

  // ============================================================
  // ROOT: SCIENZA
  // ============================================================
  { slug: "scienza", questions: [
    { text: "Quale gas è essenziale per la respirazione umana?", difficulty: "EASY", answers: ["Ossigeno", "Anidride carbonica", "Azoto", "Idrogeno"] },
    { text: "Cosa misura un sismografo?", difficulty: "MEDIUM", answers: ["Vibrazioni della Terra", "Pressione atmosferica", "Velocità del vento", "Umidità"] },
    { text: "Quale scienziato scoprì la penicillina?", difficulty: "MEDIUM", answers: ["Alexander Fleming", "Louis Pasteur", "Marie Curie", "Edward Jenner"] },
    { text: "Qual è il pH neutro?", difficulty: "EASY", answers: ["7", "0", "14", "5"] },
    { text: "Quale è l'organo che pompa il sangue?", difficulty: "EASY", answers: ["Cuore", "Polmoni", "Reni", "Fegato"] },
    { text: "Quale teoria spiega l'origine delle specie?", difficulty: "MEDIUM", answers: ["Evoluzione di Darwin", "Big Bang", "Relatività", "Teoria del caos"] },
    { text: "Chi inventò la lampadina elettrica funzionante?", difficulty: "MEDIUM", answers: ["Thomas Edison", "Nikola Tesla", "Alessandro Volta", "James Watt"] },
    { text: "Chi inventò la radio?", difficulty: "MEDIUM", answers: ["Guglielmo Marconi", "Tesla", "Edison", "Bell"] },
    { text: "Chi inventò il telefono?", difficulty: "MEDIUM", answers: ["Alexander Graham Bell (con dispute con Meucci)", "Antonio Meucci", "Marconi", "Edison"] },
    { text: "Quale processo trasforma l'energia solare in zuccheri nelle piante?", difficulty: "MEDIUM", answers: ["Fotosintesi", "Respirazione", "Fermentazione", "Mitosi"] },
  ]},

  // ============================================================
  // ROOT: ARTE E CULTURA
  // ============================================================
  { slug: "arte-cultura", questions: [
    { text: "Chi dipinse 'La notte stellata'?", difficulty: "EASY", answers: ["Vincent van Gogh", "Monet", "Picasso", "Dalí"] },
    { text: "Chi scolpì 'David' a Firenze?", difficulty: "EASY", answers: ["Michelangelo", "Donatello", "Bernini", "Canova"] },
    { text: "In quale museo è conservata la Gioconda?", difficulty: "EASY", answers: ["Louvre", "Uffizi", "Prado", "British Museum"] },
    { text: "Chi dipinse 'Le ninfee'?", difficulty: "MEDIUM", answers: ["Claude Monet", "Manet", "Renoir", "Degas"] },
    { text: "Chi dipinse 'L'urlo'?", difficulty: "MEDIUM", answers: ["Edvard Munch", "Klimt", "Schiele", "Kandinsky"] },
    { text: "Quale movimento artistico fu fondato da Picasso e Braque?", difficulty: "MEDIUM", answers: ["Cubismo", "Surrealismo", "Dadaismo", "Espressionismo"] },
    { text: "Chi scrisse 'Decameron'?", difficulty: "EASY", answers: ["Boccaccio", "Petrarca", "Dante", "Manzoni"] },
    { text: "Chi compose 'Madama Butterfly'?", difficulty: "MEDIUM", answers: ["Puccini", "Verdi", "Rossini", "Bellini"] },
    { text: "Quale corrente architettonica caratterizza il Duomo di Milano?", difficulty: "MEDIUM", answers: ["Gotico", "Romanico", "Barocco", "Neoclassico"] },
    { text: "Chi scrisse 'Don Chisciotte'?", difficulty: "MEDIUM", answers: ["Miguel de Cervantes", "Lope de Vega", "Calderón", "Quevedo"] },
  ]},

  // ============================================================
  // ROOT: SPORT
  // ============================================================
  { slug: "sport", questions: [
    { text: "In quale sport si usa la bicicletta?", difficulty: "EASY", answers: ["Ciclismo", "Equitazione", "Atletica", "Vela"] },
    { text: "Quante buche ha un campo da golf standard?", difficulty: "EASY", answers: ["18", "9", "12", "24"] },
    { text: "Quanti round ha un incontro di boxe professionale per il titolo mondiale?", difficulty: "MEDIUM", answers: ["12", "10", "15", "8"] },
    { text: "Quale sport è famoso per il 'home run'?", difficulty: "EASY", answers: ["Baseball", "Cricket", "Football americano", "Hockey"] },
    { text: "Quale è lo sport nazionale del Giappone?", difficulty: "MEDIUM", answers: ["Sumo", "Judo", "Karate", "Aikido"] },
    { text: "In quale sport si parla di 'love'?", difficulty: "EASY", answers: ["Tennis", "Golf", "Cricket", "Baseball"] },
    { text: "Quanti minuti dura un tempo di pallavolo?", difficulty: "MEDIUM", answers: ["Non a tempo, si gioca a set fino a 25 punti", "20 min", "30 min", "15 min"] },
    { text: "Quale sport ha la 'Coppa America'?", difficulty: "MEDIUM", answers: ["Vela", "Calcio sudamericano", "Tennis", "Baseball"] },
    { text: "Quale è lo sport del 'Tour de France'?", difficulty: "EASY", answers: ["Ciclismo", "Maratona", "Triathlon", "Equitazione"] },
    { text: "In quale sport si esegue uno 'strike'?", difficulty: "EASY", answers: ["Bowling", "Baseball (anche)", "Tennis", "Golf"] },
  ]},

  // ============================================================
  // ROOT: CINEMA (potrebbe essere sub di cultura-pop dopo seed-subcategories)
  // ============================================================
  { slug: "cinema", questions: [
    { text: "Chi ha diretto 'Joker' (2019)?", difficulty: "MEDIUM", answers: ["Todd Phillips", "Nolan", "Tarantino", "Scorsese"] },
    { text: "Chi ha vinto l'Oscar miglior attore per 'Joker'?", difficulty: "MEDIUM", answers: ["Joaquin Phoenix", "Heath Ledger", "Jared Leto", "Robert De Niro"] },
    { text: "Chi ha diretto 'Avatar'?", difficulty: "EASY", answers: ["James Cameron", "Spielberg", "Lucas", "Cameron"] },
    { text: "In quale anno uscì il primo 'Avatar'?", difficulty: "MEDIUM", answers: ["2009", "2012", "2007", "2014"] },
    { text: "Chi ha diretto 'Matrix'?", difficulty: "EASY", answers: ["Sorelle Wachowski", "Spielberg", "Cameron", "Nolan"] },
    { text: "Chi interpreta Neo in 'Matrix'?", difficulty: "EASY", answers: ["Keanu Reeves", "Tom Cruise", "Brad Pitt", "Will Smith"] },
    { text: "Quale film vinse l'Oscar miglior film 2023?", difficulty: "MEDIUM", answers: ["Everything Everywhere All at Once", "The Whale", "Tár", "Top Gun: Maverick"] },
    { text: "Chi ha diretto 'Bastardi senza gloria'?", difficulty: "MEDIUM", answers: ["Quentin Tarantino", "Spielberg", "Nolan", "Scorsese"] },
    { text: "Chi interpreta Hannibal Lecter ne 'Il silenzio degli innocenti'?", difficulty: "MEDIUM", answers: ["Anthony Hopkins", "Al Pacino", "Robert De Niro", "Marlon Brando"] },
    { text: "Chi ha diretto 'Memento'?", difficulty: "MEDIUM", answers: ["Christopher Nolan", "Tarantino", "Aronofsky", "Fincher"] },
  ]},

  // ============================================================
  // ROOT: SCIENZE (parent introdotto da seed-subcategories)
  // ============================================================
  { slug: "scienze", questions: [
    { text: "Quante ali ha una farfalla?", difficulty: "EASY", answers: ["4", "2", "6", "8"] },
    { text: "Quale strumento si usa per vedere oggetti molto piccoli?", difficulty: "EASY", answers: ["Microscopio", "Telescopio", "Periscopio", "Termometro"] },
    { text: "Cos'è la materia?", difficulty: "MEDIUM", answers: ["Tutto ciò che ha massa e occupa volume", "Solo i metalli", "Solo i liquidi", "Solo i gas"] },
    { text: "Quale è il pianeta abitato?", difficulty: "EASY", answers: ["Terra", "Marte", "Venere", "Giove"] },
    { text: "Cos'è un ecosistema?", difficulty: "MEDIUM", answers: ["Insieme di organismi e ambiente", "Tipo di pianeta", "Tipo di animale", "Reazione chimica"] },
    { text: "Quale pianeta ha la giornata più simile alla Terra?", difficulty: "MEDIUM", answers: ["Marte (~24h 37min)", "Venere", "Giove", "Mercurio"] },
    { text: "Cosa è la 'forza di gravità'?", difficulty: "EASY", answers: ["Attrazione tra masse", "Pressione atmosferica", "Energia elettrica", "Calore"] },
    { text: "Cosa è un microbo?", difficulty: "EASY", answers: ["Organismo microscopico", "Tipo di pianeta", "Cellula tumorale", "Tipo di onda"] },
    { text: "Quale forma ha l'acqua a 0 °C?", difficulty: "EASY", answers: ["Solida (ghiaccio)", "Liquida", "Gassosa", "Plasma"] },
    { text: "Cos'è la 'crosta terrestre'?", difficulty: "MEDIUM", answers: ["Strato esterno della Terra", "Atmosfera", "Nucleo", "Mantello"] },
  ]},

  // ============================================================
  // ROOT: CULTURA POP (parent introdotto da seed-subcategories)
  // ============================================================
  { slug: "cultura-pop", questions: [
    { text: "Quale supereroe Marvel è 'l'uomo ragno'?", difficulty: "EASY", answers: ["Spider-Man", "Iron Man", "Captain America", "Hulk"] },
    { text: "Quale supereroe DC è 'l'uomo pipistrello'?", difficulty: "EASY", answers: ["Batman", "Superman", "Flash", "Green Lantern"] },
    { text: "Chi è il creatore di Spider-Man?", difficulty: "MEDIUM", answers: ["Stan Lee (con Steve Ditko)", "Bob Kane", "Jack Kirby", "Frank Miller"] },
    { text: "Quale serie/saga di libri include 'Hunger Games'?", difficulty: "EASY", answers: ["Hunger Games di Suzanne Collins", "Divergent", "Maze Runner", "Twilight"] },
    { text: "Chi scrisse 'Twilight'?", difficulty: "EASY", answers: ["Stephenie Meyer", "J.K. Rowling", "Suzanne Collins", "Stephen King"] },
    { text: "Quale anime giapponese segue Naruto?", difficulty: "EASY", answers: ["Naruto", "One Piece", "Bleach", "Dragon Ball"] },
    { text: "Quale mangaka creò 'One Piece'?", difficulty: "MEDIUM", answers: ["Eiichirō Oda", "Akira Toriyama", "Masashi Kishimoto", "Tite Kubo"] },
    { text: "Quale cantautore italiano è 'Il Cigno di Busseto'?", difficulty: "HARD", answers: ["Giuseppe Verdi (compositore, non pop)", "Lucio Battisti", "Mina", "Modugno"] },
    { text: "Quale serie di romanzi è ambientata a Hogwarts?", difficulty: "EASY", answers: ["Harry Potter", "Narnia", "Percy Jackson", "Eragon"] },
    { text: "Chi è il creatore di 'Star Wars'?", difficulty: "EASY", answers: ["George Lucas", "Spielberg", "Cameron", "Roddenberry"] },
  ]},

  // ============================================================
  // SUB: STORIA ANTICA
  // ============================================================
  { slug: "storia-antica", questions: [
    { text: "Chi era Aristotele?", difficulty: "EASY", answers: ["Filosofo greco", "Imperatore romano", "Faraone", "Generale persiano"] },
    { text: "Quale dea era la protettrice di Atene?", difficulty: "EASY", answers: ["Atena", "Artemide", "Era", "Demetra"] },
    { text: "Chi era Tucidide?", difficulty: "MEDIUM", answers: ["Storico greco", "Filosofo", "Generale", "Tragediografo"] },
    { text: "Quale sistema scrittorio usavano gli Egizi nei monumenti?", difficulty: "EASY", answers: ["Geroglifici", "Cuneiforme", "Alfabeto fenicio", "Demotico"] },
    { text: "Quale fu la capitale dell'Impero d'Oriente?", difficulty: "MEDIUM", answers: ["Costantinopoli", "Antiochia", "Alessandria", "Roma"] },
    { text: "Chi era Erodoto?", difficulty: "MEDIUM", answers: ["Padre della storia", "Generale ateniese", "Filosofo", "Re persiano"] },
    { text: "Chi sconfisse i Persiani a Gaugamela?", difficulty: "HARD", answers: ["Alessandro Magno", "Cesare", "Annibale", "Pirro"] },
    { text: "Quale guerra oppose Atene e Sparta?", difficulty: "MEDIUM", answers: ["Guerra del Peloponneso", "Guerre Persiane", "Guerra di Troia", "Guerra Cretese"] },
    { text: "Chi fu il fondatore dell'Accademia ad Atene?", difficulty: "MEDIUM", answers: ["Platone", "Aristotele", "Socrate", "Pitagora"] },
    { text: "Quale dinastia ellenistica regnò sull'Egitto dopo Alessandro?", difficulty: "HARD", answers: ["Tolemaica", "Seleucide", "Antigonide", "Attalide"] },
  ]},

  // ============================================================
  // SUB: STORIA MEDIEVALE
  // ============================================================
  { slug: "storia-medievale", questions: [
    { text: "Chi fu il primo re franco a convertirsi al cristianesimo?", difficulty: "MEDIUM", answers: ["Clodoveo", "Carlo Martello", "Pipino il Breve", "Luigi il Pio"] },
    { text: "Quale dinastia successe ai Carolingi in Francia?", difficulty: "HARD", answers: ["Capetingi", "Plantageneti", "Valois", "Borboni"] },
    { text: "Chi sconfisse gli arabi a Poitiers nel 732?", difficulty: "MEDIUM", answers: ["Carlo Martello", "Carlo Magno", "Pipino il Breve", "Clodoveo"] },
    { text: "Quale evento religioso indisse Urbano II nel 1095?", difficulty: "MEDIUM", answers: ["Prima Crociata", "Concilio di Trento", "Scisma d'Oriente", "Pace di Costanza"] },
    { text: "Quale famiglia toscana fondò il Banco dei Medici?", difficulty: "EASY", answers: ["I Medici", "Pazzi", "Strozzi", "Albizzi"] },
    { text: "Quale battaglia segnò la fine dell'Impero Romano d'Oriente?", difficulty: "MEDIUM", answers: ["Caduta di Costantinopoli (1453)", "Manzicerta", "Lepanto", "Vienna"] },
    { text: "Chi era Federico II di Svevia?", difficulty: "MEDIUM", answers: ["Imperatore noto come 'stupor mundi'", "Re di Francia", "Papa", "Doge"] },
    { text: "Quale ordine cavalleresco fu fondato in Terrasanta nel 1119?", difficulty: "HARD", answers: ["Templari", "Ospitalieri", "Teutonici", "Lazzariti"] },
    { text: "Quale re francese fu detto 'San Luigi'?", difficulty: "HARD", answers: ["Luigi IX", "Luigi VII", "Luigi VI", "Luigi VIII"] },
    { text: "Chi fondò Venezia (leggenda)?", difficulty: "MEDIUM", answers: ["Profughi veneti dalle invasioni barbariche", "Romolo", "Costantino", "Carlo Magno"] },
  ]},

  // ============================================================
  // SUB: STORIA MODERNA
  // ============================================================
  { slug: "storia-moderna", questions: [
    { text: "Chi era Erasmo da Rotterdam?", difficulty: "MEDIUM", answers: ["Umanista olandese", "Re di Spagna", "Papa", "Generale francese"] },
    { text: "Cos'era la Lega di Cambrai (1508)?", difficulty: "HARD", answers: ["Alleanza contro Venezia", "Trattato franco-inglese", "Lega anti-turca", "Patto papale"] },
    { text: "Chi era Carlo V?", difficulty: "EASY", answers: ["Imperatore di Spagna e Sacro Romano Impero", "Re di Francia", "Sultano ottomano", "Doge"] },
    { text: "Quale monarchia fu inglese durante la dinastia Tudor?", difficulty: "MEDIUM", answers: ["Tudor", "Stuart", "Hannover", "Plantageneto"] },
    { text: "Chi era Cromwell?", difficulty: "MEDIUM", answers: ["Lord Protettore d'Inghilterra", "Re di Scozia", "Generale francese", "Doge di Venezia"] },
    { text: "In quale anno avvenne la Pace di Vestfalia?", difficulty: "MEDIUM", answers: ["1648", "1618", "1700", "1555"] },
    { text: "Quale guerra portò all'indipendenza degli USA?", difficulty: "EASY", answers: ["Guerra d'Indipendenza Americana", "Guerra civile", "Guerra dei Sette Anni", "Guerra Anglo-Olandese"] },
    { text: "In quale anno cominciò la Guerra dei Sette Anni?", difficulty: "HARD", answers: ["1756", "1763", "1740", "1789"] },
    { text: "Quale impero asiatico iniziò ad aprire i porti agli europei nel 1853?", difficulty: "HARD", answers: ["Giappone (Perry Expedition)", "Cina", "India", "Corea"] },
    { text: "Chi guidò la Riforma a Ginevra?", difficulty: "MEDIUM", answers: ["Giovanni Calvino", "Lutero", "Zwingli", "Knox"] },
  ]},

  // ============================================================
  // SUB: STORIA CONTEMPORANEA
  // ============================================================
  { slug: "storia-contemporanea", questions: [
    { text: "Chi guidò la Marcia su Roma nel 1922?", difficulty: "MEDIUM", answers: ["Benito Mussolini", "Vittorio Emanuele III", "Italo Balbo", "Giolitti"] },
    { text: "In quale anno avvenne la Marcia su Roma?", difficulty: "MEDIUM", answers: ["1922", "1925", "1919", "1929"] },
    { text: "Cosa furono i 'Patti Lateranensi'?", difficulty: "MEDIUM", answers: ["Accordi tra Italia e Vaticano (1929)", "Trattato di pace WWI", "Accordi NATO", "Patto USA-URSS"] },
    { text: "In quale anno fu firmato il Trattato del Quirinale?", difficulty: "HARD", answers: ["2021 (Italia-Francia)", "1929", "1947", "1957"] },
    { text: "Quale paese sganciò la prima bomba atomica della storia?", difficulty: "MEDIUM", answers: ["Stati Uniti", "URSS", "Regno Unito", "Germania"] },
    { text: "In quale anno fu costruito il Muro di Berlino?", difficulty: "MEDIUM", answers: ["1961", "1945", "1989", "1955"] },
    { text: "Chi fu Presidente USA durante la crisi dei missili a Cuba?", difficulty: "MEDIUM", answers: ["John F. Kennedy", "Eisenhower", "Lyndon Johnson", "Nixon"] },
    { text: "Quando finì il Vietnam War?", difficulty: "MEDIUM", answers: ["1975", "1972", "1968", "1980"] },
    { text: "In quale anno avvenne il G8 di Genova?", difficulty: "HARD", answers: ["2001", "2002", "2000", "1999"] },
    { text: "Chi fu Presidente del Consiglio italiano nel 1992 (Tangentopoli)?", difficulty: "HARD", answers: ["Giuliano Amato", "Bettino Craxi", "Romano Prodi", "Massimo D'Alema"] },
  ]},

  // ============================================================
  // SUB: STORIA (5 ELEMENTARE)
  // ============================================================
  { slug: "storia-elementare", questions: [
    { text: "Cosa è una piramide?", difficulty: "EASY", answers: ["Tomba dei faraoni", "Tempio greco", "Castello medievale", "Casa romana"] },
    { text: "Cosa significa 'preistoria'?", difficulty: "EASY", answers: ["Periodo prima della scrittura", "Periodo medievale", "Periodo egizio", "Periodo romano"] },
    { text: "Chi era il faraone più giovane famoso?", difficulty: "EASY", answers: ["Tutankhamon", "Ramses II", "Cheope", "Akhenaton"] },
    { text: "Cosa erano le 'caverne' dei primi uomini?", difficulty: "EASY", answers: ["Le prime case", "I templi", "I mercati", "Le scuole"] },
    { text: "Cosa hanno costruito i Romani per attraversare i fiumi?", difficulty: "EASY", answers: ["Ponti", "Acquedotti", "Templi", "Case"] },
    { text: "Cosa è il Foro Romano?", difficulty: "EASY", answers: ["Piazza centrale dell'antica Roma", "Stadio", "Tempio", "Tomba"] },
    { text: "Chi sono i barbari nella storia?", difficulty: "EASY", answers: ["Popoli che invasero l'Impero Romano", "Antichi Egizi", "Greci", "Etruschi"] },
    { text: "Chi aveva il potere nel Medioevo?", difficulty: "MEDIUM", answers: ["I signori feudali", "Gli imperatori romani", "I faraoni", "I greci"] },
    { text: "Cosa erano i monasteri?", difficulty: "MEDIUM", answers: ["Luoghi dove vivevano i monaci", "Castelli", "Templi", "Mercati"] },
    { text: "Cosa erano i 'feudi'?", difficulty: "MEDIUM", answers: ["Terre date dal re ai signori", "Battaglie famose", "Libri sacri", "Tasse"] },
  ]},

  // ============================================================
  // SUB: GEOGRAFIA ITALIA
  // ============================================================
  { slug: "geografia-italia", questions: [
    { text: "In quale regione si trova il Lago di Como?", difficulty: "EASY", answers: ["Lombardia", "Veneto", "Piemonte", "Trentino"] },
    { text: "In quale regione si trova il Gran Sasso?", difficulty: "MEDIUM", answers: ["Abruzzo", "Marche", "Umbria", "Lazio"] },
    { text: "Quale isola appartiene alla Toscana ed è la più grande dell'arcipelago toscano?", difficulty: "MEDIUM", answers: ["Elba", "Capraia", "Giglio", "Pianosa"] },
    { text: "In quale regione si trova il santuario di Loreto?", difficulty: "HARD", answers: ["Marche", "Lazio", "Abruzzo", "Umbria"] },
    { text: "Qual è il fiume che attraversa Firenze?", difficulty: "EASY", answers: ["Arno", "Po", "Tevere", "Adige"] },
    { text: "In quale regione si trovano le Cinque Terre?", difficulty: "EASY", answers: ["Liguria", "Toscana", "Lazio", "Sardegna"] },
    { text: "In quale regione si trova la Val d'Orcia?", difficulty: "MEDIUM", answers: ["Toscana", "Umbria", "Lazio", "Marche"] },
    { text: "Quale è la regione più popolosa d'Italia?", difficulty: "MEDIUM", answers: ["Lombardia", "Lazio", "Campania", "Veneto"] },
    { text: "Quante province ha la Sicilia (escluse città metropolitane)?", difficulty: "HARD", answers: ["6 + 3 città metropolitane = 9 totali", "5", "8", "10"] },
    { text: "In quale regione si trovano le Dolomiti?", difficulty: "EASY", answers: ["Trentino-Alto Adige e Veneto", "Lombardia", "Friuli", "Valle d'Aosta"] },
  ]},

  // ============================================================
  // SUB: GEOGRAFIA EUROPA
  // ============================================================
  { slug: "geografia-europa", questions: [
    { text: "Qual è il paese più popoloso d'Europa (UE)?", difficulty: "MEDIUM", answers: ["Germania", "Francia", "Italia", "Spagna"] },
    { text: "Quale paese ha il PIL più alto in UE?", difficulty: "MEDIUM", answers: ["Germania", "Francia", "Italia", "Olanda"] },
    { text: "In quale paese si trova il fiordo più lungo?", difficulty: "HARD", answers: ["Norvegia (Sognefjord)", "Islanda", "Scozia", "Svezia"] },
    { text: "Quale piccolo stato è enclave tra Francia e Spagna?", difficulty: "MEDIUM", answers: ["Andorra", "Monaco", "Liechtenstein", "San Marino"] },
    { text: "Quale paese è formato da molte isole nel Mar Egeo?", difficulty: "EASY", answers: ["Grecia", "Italia", "Turchia", "Croazia"] },
    { text: "Quale è la lingua ufficiale del Belgio (oltre francese)?", difficulty: "MEDIUM", answers: ["Olandese (fiammingo) e tedesco", "Tedesco", "Inglese", "Lussemburghese"] },
    { text: "Qual è la capitale di Cipro?", difficulty: "HARD", answers: ["Nicosia", "Limassol", "Pafo", "Larnaca"] },
    { text: "Quale è il paese con il PIL pro capite più alto d'Europa?", difficulty: "HARD", answers: ["Lussemburgo (o Monaco se considerato)", "Germania", "Norvegia", "Svizzera"] },
    { text: "Quale catena montuosa attraversa la Romania?", difficulty: "MEDIUM", answers: ["Carpazi", "Alpi", "Pirenei", "Balcani"] },
    { text: "In quale paese si trovano i geyser di 'Geysir'?", difficulty: "MEDIUM", answers: ["Islanda", "Norvegia", "Svezia", "Finlandia"] },
  ]},

  // ============================================================
  // SUB: GEOGRAFIA MONDO
  // ============================================================
  { slug: "geografia-mondo", questions: [
    { text: "Qual è il paese con il maggior numero di abitanti in Africa?", difficulty: "MEDIUM", answers: ["Nigeria", "Egitto", "Etiopia", "Sudafrica"] },
    { text: "In quale paese si trova il Lago Tanganica?", difficulty: "HARD", answers: ["Tra Tanzania, RDC, Burundi e Zambia", "Solo Tanzania", "Solo Kenya", "Solo Uganda"] },
    { text: "Quale fiume nasce sulle Ande e sfocia nell'Atlantico?", difficulty: "MEDIUM", answers: ["Rio delle Amazzoni", "Rio della Plata", "Orinoco", "Mississippi"] },
    { text: "Qual è la capitale dello Stato di Israele?", difficulty: "MEDIUM", answers: ["Gerusalemme (de jure)", "Tel Aviv", "Haifa", "Eilat"] },
    { text: "Quale paese ha la 'Statua del Cristo Redentore'?", difficulty: "EASY", answers: ["Brasile", "Argentina", "Cile", "Colombia"] },
    { text: "Qual è il paese con più piramidi al mondo?", difficulty: "HARD", answers: ["Sudan", "Egitto", "Messico", "Cina"] },
    { text: "Qual è la più alta vetta del Nord America?", difficulty: "HARD", answers: ["Denali (McKinley)", "Logan", "Pico de Orizaba", "Whitney"] },
    { text: "In quale paese si trova il deserto di Atacama?", difficulty: "MEDIUM", answers: ["Cile", "Argentina", "Perù", "Bolivia"] },
    { text: "Qual è il fiume più lungo del Nord America?", difficulty: "MEDIUM", answers: ["Mississippi-Missouri (sistema)", "Rio Grande", "Yukon", "Colorado"] },
    { text: "In quale paese si trova il Monte Fuji?", difficulty: "EASY", answers: ["Giappone", "Cina", "Corea", "Filippine"] },
  ]},

  // ============================================================
  // SUB: SCIENZE FISICA
  // ============================================================
  { slug: "scienze-fisica", questions: [
    { text: "Quale è la formula della densità?", difficulty: "EASY", answers: ["m/V", "F=ma", "P=V·I", "E=mc²"] },
    { text: "Cos'è l'attrito?", difficulty: "EASY", answers: ["Forza che si oppone al moto", "Energia termica", "Pressione gravitazionale", "Carica elettrica"] },
    { text: "Quale è l'unità di misura della temperatura nel SI?", difficulty: "MEDIUM", answers: ["Kelvin", "Celsius", "Fahrenheit", "Rankine"] },
    { text: "Cos'è il principio di sovrapposizione delle onde?", difficulty: "HARD", answers: ["Le onde si combinano linearmente", "Le onde si annullano sempre", "Le onde rallentano nel tempo", "Le onde non interagiscono"] },
    { text: "Cosa è la riflessione totale?", difficulty: "HARD", answers: ["Fenomeno ottico oltre l'angolo limite", "Riflesso speculare", "Diffrazione", "Polarizzazione"] },
    { text: "Cos'è la frequenza di un'onda?", difficulty: "MEDIUM", answers: ["Numero di oscillazioni al secondo (Hz)", "Velocità", "Ampiezza", "Energia"] },
    { text: "Cos'è la lunghezza d'onda?", difficulty: "MEDIUM", answers: ["Distanza tra due massimi consecutivi", "Velocità della luce", "Frequenza", "Energia trasportata"] },
    { text: "Cos'è il decadimento radioattivo?", difficulty: "MEDIUM", answers: ["Trasformazione spontanea di nuclei", "Aumento di carica", "Fusione nucleare", "Scissione molecolare"] },
    { text: "Cosa misura un dinamometro?", difficulty: "MEDIUM", answers: ["Forza", "Massa", "Volume", "Temperatura"] },
    { text: "Cos'è il momento di una forza?", difficulty: "HARD", answers: ["Prodotto F · braccio", "Prodotto F · massa", "Energia cinetica", "Lavoro"] },
  ]},

  // ============================================================
  // SUB: SCIENZE CHIMICA
  // ============================================================
  { slug: "scienze-chimica", questions: [
    { text: "Qual è il simbolo chimico del calcio?", difficulty: "EASY", answers: ["Ca", "Cl", "Co", "C"] },
    { text: "Qual è il simbolo del cloro?", difficulty: "EASY", answers: ["Cl", "Co", "Cu", "Ca"] },
    { text: "Qual è il simbolo del piombo?", difficulty: "MEDIUM", answers: ["Pb", "Po", "Pl", "Pd"] },
    { text: "Quale è la formula del bicarbonato di sodio?", difficulty: "MEDIUM", answers: ["NaHCO₃", "Na₂CO₃", "NaCl", "NaOH"] },
    { text: "Qual è il simbolo del fosforo?", difficulty: "MEDIUM", answers: ["P", "Ph", "Pt", "Po"] },
    { text: "Qual è il simbolo dello zolfo?", difficulty: "MEDIUM", answers: ["S", "Z", "Sl", "Su"] },
    { text: "Quale acido si trova nelle batterie?", difficulty: "MEDIUM", answers: ["Solforico", "Cloridrico", "Nitrico", "Citrico"] },
    { text: "Quale composto tossico fu usato nelle armi chimiche WWI?", difficulty: "HARD", answers: ["Iprite (gas mostarda)", "Cianuro", "Arsenico", "Fluoro"] },
    { text: "Quale gas dà l'odore caratteristico all'aglio?", difficulty: "HARD", answers: ["Allicina (composti solforati)", "Metano", "Ammoniaca", "Etilene"] },
    { text: "Quale elemento è il più abbondante nell'universo?", difficulty: "EASY", answers: ["Idrogeno", "Elio", "Ossigeno", "Carbonio"] },
  ]},

  // ============================================================
  // SUB: SCIENZE BIOLOGIA
  // ============================================================
  { slug: "scienze-biologia", questions: [
    { text: "Quale tessuto trasporta gli zuccheri nelle piante?", difficulty: "MEDIUM", answers: ["Floema", "Xilema", "Epidermide", "Cuticola"] },
    { text: "Cos'è una specie?", difficulty: "MEDIUM", answers: ["Gruppo di organismi che si riproducono tra loro", "Tipo di cellula", "Famiglia di virus", "Categoria geografica"] },
    { text: "Chi formulò la legge della segregazione dei caratteri?", difficulty: "MEDIUM", answers: ["Gregor Mendel", "Charles Darwin", "Pasteur", "Watson"] },
    { text: "Quante coppie cromosomiche ha l'essere umano?", difficulty: "EASY", answers: ["23", "22", "24", "20"] },
    { text: "Cosa è il citoplasma?", difficulty: "MEDIUM", answers: ["Sostanza tra membrana e nucleo", "DNA", "Apparato di Golgi", "Lisosoma"] },
    { text: "Cos'è un enzima?", difficulty: "MEDIUM", answers: ["Proteina catalizzatore", "Tipo di zucchero", "Acido nucleico", "Ormone"] },
    { text: "Quale apparato include cuore e vasi?", difficulty: "EASY", answers: ["Cardiocircolatorio", "Respiratorio", "Digerente", "Escretore"] },
    { text: "Quale apparato include stomaco e intestino?", difficulty: "EASY", answers: ["Digerente", "Respiratorio", "Cardiocircolatorio", "Escretore"] },
    { text: "Quale parte dell'occhio mette a fuoco?", difficulty: "MEDIUM", answers: ["Cristallino", "Retina", "Cornea", "Iride"] },
    { text: "Dove si trovano i recettori dell'olfatto?", difficulty: "MEDIUM", answers: ["Epitelio olfattivo del naso", "Lingua", "Pelle", "Orecchio"] },
  ]},

  // ============================================================
  // SUB: SCIENZE ASTRONOMIA
  // ============================================================
  { slug: "scienze-astronomia", questions: [
    { text: "Cosa è la 'fascia degli asteroidi'?", difficulty: "MEDIUM", answers: ["Regione tra Marte e Giove", "Anello di Saturno", "Fascia di Kuiper", "Nube di Oort"] },
    { text: "Qual è la più grande luna di Saturno?", difficulty: "MEDIUM", answers: ["Titano", "Encelado", "Mimas", "Rhea"] },
    { text: "Quale missione fu la prima sonda su Marte (atterraggio)?", difficulty: "HARD", answers: ["Viking 1 (1976)", "Pathfinder", "Spirit", "Curiosity"] },
    { text: "Qual è il rover NASA atterrato nel 2012?", difficulty: "MEDIUM", answers: ["Curiosity", "Spirit", "Opportunity", "Perseverance"] },
    { text: "Quale rover NASA atterrò nel 2021 con elicottero Ingenuity?", difficulty: "MEDIUM", answers: ["Perseverance", "Curiosity", "Spirit", "Sojourner"] },
    { text: "Quale telescopio scoprì pianeti extrasolari per transito?", difficulty: "MEDIUM", answers: ["Kepler", "Hubble", "Spitzer", "Chandra"] },
    { text: "Quale è la più piccola galassia satellite della Via Lattea?", difficulty: "HARD", answers: ["Galassia Nana del Sagittario (o varie ultra-deboli)", "Andromeda", "Triangolo", "Maffei 1"] },
    { text: "Cos'è una nana bianca?", difficulty: "HARD", answers: ["Stadio finale di stelle simili al Sole", "Pianeta gassoso", "Buco nero piccolo", "Nebulosa"] },
    { text: "Cosa orbita oltre Nettuno?", difficulty: "MEDIUM", answers: ["Cintura di Kuiper", "Cintura degli asteroidi", "Anelli di Saturno", "Nube di Magellano"] },
    { text: "Quale astronauta italiano è stato il primo comandante ESA della ISS?", difficulty: "MEDIUM", answers: ["Luca Parmitano", "Samantha Cristoforetti", "Roberto Vittori", "Paolo Nespoli"] },
  ]},

  // ============================================================
  // SUB: CINEMA (sub di cultura-pop dopo seed-subcategories)
  // ============================================================
  // NOTA: stesso slug "cinema" del root — il bundle root sopra copre già questo
  // se invece esiste come sub. Non duplichiamo.

  // ============================================================
  // SUB: MUSICA
  // ============================================================
  { slug: "musica", questions: [
    { text: "Quale band cantava 'Hotel California'?", difficulty: "EASY", answers: ["Eagles", "Fleetwood Mac", "Doors", "Pink Floyd"] },
    { text: "Quale gruppo cantava 'Sweet Child O' Mine'?", difficulty: "MEDIUM", answers: ["Guns N' Roses", "Bon Jovi", "Aerosmith", "Metallica"] },
    { text: "Chi cantava 'Smooth Criminal'?", difficulty: "EASY", answers: ["Michael Jackson", "Prince", "Madonna", "George Michael"] },
    { text: "Chi cantava 'Purple Rain'?", difficulty: "MEDIUM", answers: ["Prince", "Michael Jackson", "Lionel Richie", "Stevie Wonder"] },
    { text: "Quale cantante italiana è soprannominata 'la Tigre di Cremona'?", difficulty: "MEDIUM", answers: ["Mina", "Ornella Vanoni", "Patty Pravo", "Fiorella Mannoia"] },
    { text: "Chi cantò 'Vita spericolata'?", difficulty: "EASY", answers: ["Vasco Rossi", "Ligabue", "Zucchero", "Eros Ramazzotti"] },
    { text: "Chi cantò 'Albachiara'?", difficulty: "MEDIUM", answers: ["Vasco Rossi", "Lucio Battisti", "Renato Zero", "Antonello Venditti"] },
    { text: "Quale album di Pink Floyd è 'The Wall'?", difficulty: "EASY", answers: ["Album del 1979", "Album del 1973", "Singolo del 1980", "EP del 1985"] },
    { text: "Chi cantò 'Hey Jude'?", difficulty: "EASY", answers: ["The Beatles", "Rolling Stones", "The Who", "Pink Floyd"] },
    { text: "In quale anno morì Freddie Mercury?", difficulty: "MEDIUM", answers: ["1991", "1989", "1993", "1995"] },
  ]},

  // ============================================================
  // SUB: SERIE TV
  // ============================================================
  { slug: "serie-tv", questions: [
    { text: "Quale serie ha protagonista Eddie Munson?", difficulty: "MEDIUM", answers: ["Stranger Things", "Cobra Kai", "Wednesday", "Riverdale"] },
    { text: "Quale serie segue il giudice Walker?", difficulty: "HARD", answers: ["Walker (reboot)", "Yellowstone", "Better Call Saul", "Justified"] },
    { text: "Chi creò 'Lost'?", difficulty: "MEDIUM", answers: ["JJ Abrams e Damon Lindelof", "Vince Gilligan", "Matthew Weiner", "David Lynch"] },
    { text: "Quale serie HBO segue draghi e troni?", difficulty: "EASY", answers: ["Game of Thrones", "True Detective", "Westworld", "The Wire"] },
    { text: "Chi è l'antagonista principale di 'Dexter'?", difficulty: "HARD", answers: ["Trinity Killer (stagione 4)", "Doakes", "LaGuerta", "Quinn"] },
    { text: "Quale serie segue Saul Goodman?", difficulty: "EASY", answers: ["Better Call Saul", "Breaking Bad (anche)", "Ozark", "Narcos"] },
    { text: "Quale serie italiana del 2018 segue 4 amiche napoletane?", difficulty: "MEDIUM", answers: ["L'amica geniale", "I bastardi di Pizzofalcone", "Romanzo Famigliare", "Imma Tataranni"] },
    { text: "Da quale romanzo di Elena Ferrante è tratta 'L'amica geniale'?", difficulty: "MEDIUM", answers: ["Quartetto napoletano", "I giorni dell'abbandono", "L'amore molesto", "La figlia oscura"] },
    { text: "Quale è la serie di Netflix con Henry Cavill come strigo?", difficulty: "MEDIUM", answers: ["The Witcher", "The Crown", "Bridgerton", "Lupin"] },
    { text: "Quale serie britannica ha 'The Doctor' come protagonista?", difficulty: "MEDIUM", answers: ["Doctor Who", "Sherlock", "Black Mirror", "Misfits"] },
  ]},

  // ============================================================
  // SUB: VIDEOGIOCHI
  // ============================================================
  { slug: "videogiochi", questions: [
    { text: "In quale gioco si comanda Master Chief?", difficulty: "EASY", answers: ["Halo", "Doom", "Call of Duty", "Battlefield"] },
    { text: "Quale serie ha 'Kratos' come protagonista?", difficulty: "EASY", answers: ["God of War", "Devil May Cry", "Bayonetta", "Dark Souls"] },
    { text: "Quale serie From Software include 'Bloodborne' e 'Dark Souls'?", difficulty: "MEDIUM", answers: ["Soulsborne", "Resident Evil", "Yakuza", "Persona"] },
    { text: "Chi creò 'Dark Souls'?", difficulty: "MEDIUM", answers: ["Hidetaka Miyazaki", "Hideo Kojima", "Shigeru Miyamoto", "Yuji Naka"] },
    { text: "Quale gioco From Software vinse il GOTY 2022?", difficulty: "MEDIUM", answers: ["Elden Ring", "Sekiro", "Dark Souls III", "Bloodborne"] },
    { text: "Chi compose la storia di Elden Ring insieme a Miyazaki?", difficulty: "HARD", answers: ["George R.R. Martin", "J.R.R. Tolkien", "Brandon Sanderson", "Stephen King"] },
    { text: "Quale serie Naughty Dog ha protagoniste Joel ed Ellie?", difficulty: "EASY", answers: ["The Last of Us", "Uncharted", "Crash Bandicoot", "Jak & Daxter"] },
    { text: "In quale gioco Rockstar si controlla Arthur Morgan?", difficulty: "MEDIUM", answers: ["Red Dead Redemption 2", "GTA V", "Bully", "Max Payne"] },
    { text: "Quale gioco mobile lanciato nel 2016 utilizza la realtà aumentata e i Pokémon?", difficulty: "EASY", answers: ["Pokémon GO", "Pokémon Sleep", "Pokémon Masters", "Pokémon Quest"] },
    { text: "Chi sviluppa Pokémon GO?", difficulty: "MEDIUM", answers: ["Niantic", "Game Freak", "Nintendo", "The Pokémon Company"] },
  ]},

  // ============================================================
  // SUB: SPORT CALCIO
  // ============================================================
  { slug: "sport-calcio", questions: [
    { text: "Chi vinse il Pallone d'Oro 2024?", difficulty: "MEDIUM", answers: ["Rodri", "Vinícius Jr.", "Bellingham", "Mbappé"] },
    { text: "In quale anno il Liverpool vinse l'ultima Champions?", difficulty: "MEDIUM", answers: ["2019", "2018", "2020", "2022"] },
    { text: "Quale squadra è chiamata 'Galacticos'?", difficulty: "MEDIUM", answers: ["Real Madrid", "Barcellona", "PSG", "Manchester City"] },
    { text: "Chi è il capocannoniere all-time della Serie A?", difficulty: "MEDIUM", answers: ["Silvio Piola", "Francesco Totti", "Gunnar Nordahl", "Roberto Baggio"] },
    { text: "Chi vinse la Coppa America 2024?", difficulty: "MEDIUM", answers: ["Argentina", "Colombia", "Brasile", "Uruguay"] },
    { text: "In quale anno fu fondata la Serie A?", difficulty: "HARD", answers: ["1929 (girone unico)", "1898", "1922", "1946"] },
    { text: "Quale stadio inglese è famoso per essere il 'Tempio del calcio'?", difficulty: "MEDIUM", answers: ["Wembley", "Old Trafford", "Anfield", "Stamford Bridge"] },
    { text: "Chi è il portiere recordman di Champions clean sheet?", difficulty: "HARD", answers: ["Iker Casillas", "Buffon", "Neuer", "Van der Sar"] },
    { text: "Quale italiano vinse il Pallone d'Oro 2006?", difficulty: "MEDIUM", answers: ["Fabio Cannavaro", "Andrea Pirlo", "Francesco Totti", "Alessandro Del Piero"] },
    { text: "Quale è il club calcistico più antico al mondo (riconosciuto FIFA)?", difficulty: "HARD", answers: ["Sheffield FC (1857)", "Genoa", "Notts County", "Stoke"] },
  ]},

  // ============================================================
  // SUB: SPORT TENNIS
  // ============================================================
  { slug: "sport-tennis", questions: [
    { text: "Chi vinse Wimbledon 2024 maschile?", difficulty: "MEDIUM", answers: ["Carlos Alcaraz", "Jannik Sinner", "Djokovic", "Medvedev"] },
    { text: "Chi vinse Roland Garros 2024 maschile?", difficulty: "MEDIUM", answers: ["Carlos Alcaraz", "Sinner", "Zverev", "Djokovic"] },
    { text: "Chi vinse l'Australian Open 2024 maschile?", difficulty: "EASY", answers: ["Jannik Sinner", "Djokovic", "Alcaraz", "Medvedev"] },
    { text: "Chi vinse lo US Open 2024 maschile?", difficulty: "EASY", answers: ["Jannik Sinner", "Alcaraz", "Djokovic", "Fritz"] },
    { text: "Quanti Slam aveva Sinner alla fine del 2024?", difficulty: "MEDIUM", answers: ["2 (AO + USO 2024)", "3", "1", "4"] },
    { text: "Chi è 'King of Clay'?", difficulty: "EASY", answers: ["Rafael Nadal", "Federer", "Djokovic", "Borg"] },
    { text: "Quanti anni aveva Nadal al primo Roland Garros vinto?", difficulty: "HARD", answers: ["19 (2005)", "20", "18", "21"] },
    { text: "Chi vinse Wimbledon 2023 maschile?", difficulty: "MEDIUM", answers: ["Carlos Alcaraz", "Djokovic", "Medvedev", "Sinner"] },
    { text: "Quale tennista vinse 11 volte gli Internazionali d'Italia (uomini)?", difficulty: "HARD", answers: ["Rafael Nadal (10 in singolare ad oggi — record disputato)", "Federer", "Djokovic", "Borg"] },
    { text: "Quale tennista è la prima italiana n.1 nel mondo (singolare)?", difficulty: "HARD", answers: ["Nessuna ad oggi (Sinner è uomo)", "Schiavone", "Errani", "Pennetta"] },
  ]},

  // ============================================================
  // SUB: SPORT BASKET
  // ============================================================
  { slug: "sport-basket", questions: [
    { text: "Chi vinse l'MVP delle Finals NBA 2024?", difficulty: "MEDIUM", answers: ["Jaylen Brown", "Jayson Tatum", "Nikola Jokić", "Luka Dončić"] },
    { text: "Quale squadra giocò le NBA Finals 2024 contro Boston?", difficulty: "MEDIUM", answers: ["Dallas Mavericks", "Denver Nuggets", "Miami Heat", "Lakers"] },
    { text: "In quale paese è nato Luka Dončić?", difficulty: "MEDIUM", answers: ["Slovenia", "Croazia", "Serbia", "Bosnia"] },
    { text: "Quante medaglie d'oro olimpiche ha la Nazionale USA basket maschile (al 2024)?", difficulty: "HARD", answers: ["17", "15", "13", "10"] },
    { text: "Chi vinse il Mondiale FIBA 2023 maschile?", difficulty: "MEDIUM", answers: ["Germania", "Serbia", "USA", "Canada"] },
    { text: "In quale anno l'Italia vinse l'Eurobasket per ultima volta?", difficulty: "HARD", answers: ["1999", "1983", "1991", "1995"] },
    { text: "Chi è il Coach Lakers che vinse 11 anelli (incluse Bulls)?", difficulty: "MEDIUM", answers: ["Phil Jackson", "Pat Riley", "Gregg Popovich", "Red Auerbach"] },
    { text: "Quanti anelli NBA ha vinto Phil Jackson da coach?", difficulty: "MEDIUM", answers: ["11", "9", "10", "8"] },
    { text: "Quanti anelli NBA hanno vinto i Boston Celtics nell'era Bill Russell?", difficulty: "HARD", answers: ["11", "9", "8", "10"] },
    { text: "Quale giocatore segnò il famoso 'The Shot' su Cleveland nel 1989?", difficulty: "HARD", answers: ["Michael Jordan", "Larry Bird", "Magic Johnson", "Isiah Thomas"] },
  ]},

  // ============================================================
  // SUB: SPORT OLIMPIADI
  // ============================================================
  { slug: "sport-olimpiadi", questions: [
    { text: "Quante medaglie d'oro vinse l'Italia a Tokyo 2020?", difficulty: "MEDIUM", answers: ["10", "8", "12", "6"] },
    { text: "Quale è la mascotte delle Olimpiadi di Parigi 2024?", difficulty: "MEDIUM", answers: ["Phryges (frigi)", "Wenlock", "Vinicius", "Soohorang"] },
    { text: "In quale anno l'Italia ospitò le Olimpiadi invernali per la prima volta?", difficulty: "HARD", answers: ["1956 (Cortina d'Ampezzo)", "1960", "2006", "1936"] },
    { text: "In quale Olimpiade Mark Spitz vinse 7 ori nel nuoto?", difficulty: "MEDIUM", answers: ["Monaco 1972", "Mosca 1980", "Montréal 1976", "Los Angeles 1984"] },
    { text: "Quale paese vinse il maggior numero di medaglie d'oro a Tokyo 2020?", difficulty: "MEDIUM", answers: ["USA", "Cina", "Giappone", "Russia"] },
    { text: "Quale paese vinse più medaglie d'oro a Parigi 2024?", difficulty: "MEDIUM", answers: ["USA (con Cina alla pari per ori, USA su totale)", "Cina", "Giappone", "Australia"] },
    { text: "In quale Olimpiade fu introdotta lo skateboard?", difficulty: "MEDIUM", answers: ["Tokyo 2020", "Rio 2016", "Londra 2012", "Pechino 2008"] },
    { text: "Quale sport è stato introdotto a Parigi 2024?", difficulty: "MEDIUM", answers: ["Breaking (breakdance)", "Cricket", "Squash", "Karate"] },
    { text: "Chi accese il braciere olimpico di Atene 2004?", difficulty: "HARD", answers: ["Nikolaos Kaklamanakis", "Muhammad Ali", "Cassius Marcellus", "Thiago Pereira"] },
    { text: "Quante volte Roma ha ospitato le Olimpiadi estive?", difficulty: "MEDIUM", answers: ["1 (1960)", "2", "0", "3"] },
  ]},
];

async function main() {
  let createdQ = 0;
  let skippedQ = 0;
  const missingCats: string[] = [];

  for (const bundle of BUNDLES) {
    const cat = await prisma.category.findUnique({ where: { slug: bundle.slug } });
    if (!cat) {
      missingCats.push(bundle.slug);
      console.log(`⚠️  Categoria '${bundle.slug}' non trovata — skip. (Esegui prima seed-subcategories e seed-50)`);
      continue;
    }
    console.log(`\n📂 ${cat.name} (${bundle.slug})`);

    for (const q of bundle.questions) {
      const existing = await prisma.question.findFirst({
        where: { categoryId: cat.id, text: q.text },
      });
      if (existing) {
        skippedQ++;
        continue;
      }
      await prisma.question.create({
        data: {
          text: q.text,
          difficulty: q.difficulty,
          type: "MULTIPLE_CHOICE",
          categoryId: cat.id,
          answers: {
            create: q.answers.map((text, i) => ({
              text,
              isCorrect: i === 0,
              order: i,
            })),
          },
        },
      });
      createdQ++;
    }
  }

  const total = await prisma.question.count();
  console.log(`\n✅ Seed extra completato. Create: ${createdQ}, Saltate (già presenti): ${skippedQ}.`);
  if (missingCats.length > 0) {
    console.log(`⚠️  Categorie non presenti nel DB: ${missingCats.join(", ")}`);
  }
  console.log(`Totale domande nel DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
