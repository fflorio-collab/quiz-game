/**
 * Seed aggiuntivo: 50 domande per categoria (MULTIPLE_CHOICE).
 * NON cancella i dati esistenti — fa upsert delle categorie e
 * salta le domande già presenti (stesso testo nella stessa categoria).
 * Lancialo con: `npx tsx prisma/seed-50.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  text: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  answers: [string, string, string, string]; // la prima è SEMPRE la corretta
};

const CATEGORIES: {
  name: string;
  slug: string;
  icon: string;
  color: string;
  questions: Q[];
}[] = [
  // ============================================================
  // STORIA (50)
  // ============================================================
  {
    name: "Storia", slug: "storia", icon: "📜", color: "#f59e0b",
    questions: [
      { text: "In che anno è caduto il Muro di Berlino?", difficulty: "EASY", answers: ["1989", "1987", "1991", "1985"] },
      { text: "In che anno iniziò la Prima Guerra Mondiale?", difficulty: "EASY", answers: ["1914", "1918", "1905", "1920"] },
      { text: "In che anno iniziò la Seconda Guerra Mondiale?", difficulty: "EASY", answers: ["1939", "1941", "1935", "1945"] },
      { text: "Quale civiltà costruì le piramidi di Giza?", difficulty: "EASY", answers: ["Gli Egizi", "I Romani", "I Greci", "I Mesopotamici"] },
      { text: "In quale anno Cristoforo Colombo arrivò in America?", difficulty: "EASY", answers: ["1492", "1488", "1500", "1510"] },
      { text: "Chi fu il primo uomo a camminare sulla Luna?", difficulty: "EASY", answers: ["Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Michael Collins"] },
      { text: "In quale anno l'Italia divenne una Repubblica?", difficulty: "EASY", answers: ["1946", "1945", "1948", "1950"] },
      { text: "Chi scrisse 'Il Principe'?", difficulty: "EASY", answers: ["Niccolò Machiavelli", "Dante Alighieri", "Francesco Petrarca", "Giovanni Boccaccio"] },
      { text: "Quale regno fu di Luigi XIV, il Re Sole?", difficulty: "EASY", answers: ["Francia", "Inghilterra", "Spagna", "Austria"] },
      { text: "Come si chiamava la nave di Cristoforo Colombo più grande?", difficulty: "MEDIUM", answers: ["Santa María", "Pinta", "Niña", "Victoria"] },
      { text: "Chi era imperatore romano durante la costruzione del Colosseo?", difficulty: "MEDIUM", answers: ["Vespasiano", "Nerone", "Traiano", "Augusto"] },
      { text: "Chi fu il primo imperatore di Roma?", difficulty: "MEDIUM", answers: ["Augusto", "Giulio Cesare", "Nerone", "Traiano"] },
      { text: "In quale anno fu abolita la schiavitù negli Stati Uniti?", difficulty: "MEDIUM", answers: ["1865", "1848", "1861", "1870"] },
      { text: "In quale battaglia Napoleone fu definitivamente sconfitto?", difficulty: "MEDIUM", answers: ["Waterloo", "Austerlitz", "Borodino", "Trafalgar"] },
      { text: "Chi fu il fondatore dell'Impero Mongolo?", difficulty: "MEDIUM", answers: ["Gengis Khan", "Kublai Khan", "Tamerlano", "Attila"] },
      { text: "In quale anno cadde l'Impero Romano d'Occidente?", difficulty: "MEDIUM", answers: ["476 d.C.", "410 d.C.", "395 d.C.", "527 d.C."] },
      { text: "Chi fu l'ultimo zar di Russia?", difficulty: "MEDIUM", answers: ["Nicola II", "Alessandro III", "Pietro il Grande", "Ivan il Terribile"] },
      { text: "Quale presidente USA firmò la Dichiarazione d'Indipendenza?", difficulty: "MEDIUM", answers: ["Thomas Jefferson", "George Washington", "John Adams", "Benjamin Franklin"] },
      { text: "In che anno fu assassinato John F. Kennedy?", difficulty: "MEDIUM", answers: ["1963", "1961", "1965", "1968"] },
      { text: "Chi unificò l'Italia nel 1861?", difficulty: "MEDIUM", answers: ["Vittorio Emanuele II", "Camillo Cavour", "Giuseppe Garibaldi", "Giuseppe Mazzini"] },
      { text: "Come si chiamava il muro che divideva l'impero romano dai barbari in Britannia?", difficulty: "MEDIUM", answers: ["Vallo di Adriano", "Vallo di Antonino", "Limes Germanicus", "Muro di Settimio"] },
      { text: "In quale anno terminò la Guerra Fredda?", difficulty: "MEDIUM", answers: ["1991", "1989", "1985", "1995"] },
      { text: "Quale civiltà costruì Machu Picchu?", difficulty: "MEDIUM", answers: ["Inca", "Maya", "Azteca", "Olmeca"] },
      { text: "Chi fu il primo Presidente degli Stati Uniti?", difficulty: "EASY", answers: ["George Washington", "Thomas Jefferson", "John Adams", "Abraham Lincoln"] },
      { text: "In che secolo visse Leonardo da Vinci?", difficulty: "EASY", answers: ["XV e XVI", "XIV", "XIII", "XVII"] },
      { text: "Chi firmò il trattato di Tordesillas?", difficulty: "HARD", answers: ["Spagna e Portogallo", "Spagna e Francia", "Inghilterra e Francia", "Portogallo e Inghilterra"] },
      { text: "In che anno fu fondata l'ONU?", difficulty: "HARD", answers: ["1945", "1946", "1942", "1950"] },
      { text: "Chi era il faraone quando Mosè liberò gli ebrei secondo la tradizione?", difficulty: "HARD", answers: ["Ramses II", "Tutankhamon", "Cheope", "Akhenaton"] },
      { text: "Quale imperatore bizantino fece costruire Santa Sofia?", difficulty: "HARD", answers: ["Giustiniano I", "Costantino", "Teodosio", "Eraclio"] },
      { text: "In che anno fu firmata la Magna Carta?", difficulty: "HARD", answers: ["1215", "1066", "1300", "1189"] },
      { text: "Chi fu il primo re d'Italia dopo l'unificazione?", difficulty: "MEDIUM", answers: ["Vittorio Emanuele II", "Umberto I", "Carlo Alberto", "Vittorio Emanuele III"] },
      { text: "In quale città fu firmato il trattato che concluse la Prima Guerra Mondiale?", difficulty: "MEDIUM", answers: ["Versailles", "Vienna", "Berlino", "Parigi"] },
      { text: "Chi scoprì la tomba di Tutankhamon?", difficulty: "MEDIUM", answers: ["Howard Carter", "Heinrich Schliemann", "Jean-François Champollion", "Flinders Petrie"] },
      { text: "Chi fu il leader della Rivoluzione Bolscevica del 1917?", difficulty: "MEDIUM", answers: ["Vladimir Lenin", "Josif Stalin", "Lev Trotsky", "Nikolai Bucharin"] },
      { text: "Chi scrisse il 'Manifesto del Partito Comunista'?", difficulty: "MEDIUM", answers: ["Marx ed Engels", "Lenin e Trotsky", "Stalin e Zinoviev", "Mao e Chou"] },
      { text: "Quando iniziò la Rivoluzione Francese?", difficulty: "EASY", answers: ["1789", "1776", "1799", "1804"] },
      { text: "Qual è il nome del progetto Manhattan?", difficulty: "HARD", answers: ["Sviluppo bomba atomica USA", "Piano di invasione Giappone", "Piano Marshall", "Progetto Apollo"] },
      { text: "In quale anno fu firmato il Trattato di Roma che istituì la CEE?", difficulty: "HARD", answers: ["1957", "1945", "1968", "1972"] },
      { text: "Chi era il 'Barbarossa' dell'Impero Sacro?", difficulty: "MEDIUM", answers: ["Federico I", "Federico II", "Carlo Magno", "Ottone I"] },
      { text: "In quale anno Cesare fu assassinato?", difficulty: "MEDIUM", answers: ["44 a.C.", "45 a.C.", "49 a.C.", "31 a.C."] },
      { text: "Chi fu il fondatore di Roma secondo la leggenda?", difficulty: "EASY", answers: ["Romolo", "Enea", "Numa Pompilio", "Servio Tullio"] },
      { text: "Quale guerra fu combattuta tra Nord e Sud negli USA (1861-1865)?", difficulty: "EASY", answers: ["Guerra di Secessione", "Guerra d'Indipendenza", "Guerra Messicana", "Guerra del 1812"] },
      { text: "Chi fu il comandante delle forze alleate nello sbarco in Normandia?", difficulty: "MEDIUM", answers: ["Dwight D. Eisenhower", "George Patton", "Bernard Montgomery", "Douglas MacArthur"] },
      { text: "In quale anno avvenne lo sbarco in Normandia?", difficulty: "MEDIUM", answers: ["1944", "1943", "1945", "1942"] },
      { text: "Chi era il 'Duce' durante il fascismo italiano?", difficulty: "EASY", answers: ["Benito Mussolini", "Galeazzo Ciano", "Italo Balbo", "Dino Grandi"] },
      { text: "Come si chiamava la strada percorsa da ovest dai coloni USA?", difficulty: "HARD", answers: ["Oregon Trail", "Santa Fe Trail", "California Trail", "Chisholm Trail"] },
      { text: "Quale imperatore cinese unificò la Cina per la prima volta?", difficulty: "HARD", answers: ["Qin Shi Huang", "Kublai Khan", "Han Wudi", "Tang Taizong"] },
      { text: "In quale anno fu istituita l'Euro come valuta fisica?", difficulty: "MEDIUM", answers: ["2002", "1999", "2000", "2005"] },
      { text: "Chi scoprì l'America ufficialmente per l'Europa?", difficulty: "EASY", answers: ["Cristoforo Colombo", "Amerigo Vespucci", "Ferdinando Magellano", "Vasco da Gama"] },
      { text: "Chi era il leader della Germania nazista?", difficulty: "EASY", answers: ["Adolf Hitler", "Heinrich Himmler", "Hermann Göring", "Joseph Goebbels"] },
    ],
  },

  // ============================================================
  // GEOGRAFIA (50)
  // ============================================================
  {
    name: "Geografia", slug: "geografia", icon: "🌍", color: "#10b981",
    questions: [
      { text: "Qual è la capitale d'Italia?", difficulty: "EASY", answers: ["Roma", "Milano", "Firenze", "Napoli"] },
      { text: "Qual è la capitale della Francia?", difficulty: "EASY", answers: ["Parigi", "Lione", "Marsiglia", "Nizza"] },
      { text: "Qual è la capitale della Spagna?", difficulty: "EASY", answers: ["Madrid", "Barcellona", "Siviglia", "Valencia"] },
      { text: "Qual è il paese più grande del mondo per superficie?", difficulty: "EASY", answers: ["Russia", "Canada", "Cina", "Stati Uniti"] },
      { text: "Qual è l'oceano più grande del mondo?", difficulty: "EASY", answers: ["Pacifico", "Atlantico", "Indiano", "Artico"] },
      { text: "In quale continente si trova il deserto del Sahara?", difficulty: "EASY", answers: ["Africa", "Asia", "Australia", "Sud America"] },
      { text: "Qual è la capitale del Regno Unito?", difficulty: "EASY", answers: ["Londra", "Manchester", "Edimburgo", "Liverpool"] },
      { text: "In quale paese si trova la Torre Eiffel?", difficulty: "EASY", answers: ["Francia", "Italia", "Germania", "Spagna"] },
      { text: "Qual è il fiume che attraversa Roma?", difficulty: "EASY", answers: ["Tevere", "Po", "Arno", "Adige"] },
      { text: "Qual è il fiume più lungo d'Italia?", difficulty: "EASY", answers: ["Po", "Adige", "Tevere", "Arno"] },
      { text: "Qual è la capitale dell'Australia?", difficulty: "MEDIUM", answers: ["Canberra", "Sydney", "Melbourne", "Perth"] },
      { text: "Qual è il fiume più lungo del mondo?", difficulty: "MEDIUM", answers: ["Rio delle Amazzoni", "Nilo", "Yangtze", "Mississippi"] },
      { text: "Qual è la capitale del Brasile?", difficulty: "MEDIUM", answers: ["Brasilia", "São Paulo", "Rio de Janeiro", "Salvador"] },
      { text: "Qual è la capitale del Canada?", difficulty: "MEDIUM", answers: ["Ottawa", "Toronto", "Vancouver", "Montreal"] },
      { text: "Qual è la capitale dell'Egitto?", difficulty: "EASY", answers: ["Il Cairo", "Alessandria", "Luxor", "Giza"] },
      { text: "Qual è la capitale del Giappone?", difficulty: "EASY", answers: ["Tokyo", "Kyoto", "Osaka", "Hiroshima"] },
      { text: "Qual è la capitale della Cina?", difficulty: "EASY", answers: ["Pechino", "Shanghai", "Hong Kong", "Canton"] },
      { text: "Qual è la capitale dell'India?", difficulty: "MEDIUM", answers: ["Nuova Delhi", "Mumbai", "Calcutta", "Bangalore"] },
      { text: "Qual è la capitale della Germania?", difficulty: "EASY", answers: ["Berlino", "Monaco", "Amburgo", "Francoforte"] },
      { text: "In quale catena montuosa si trova l'Everest?", difficulty: "EASY", answers: ["Himalaya", "Ande", "Alpi", "Montagne Rocciose"] },
      { text: "Qual è il lago più grande d'Italia?", difficulty: "MEDIUM", answers: ["Lago di Garda", "Lago Maggiore", "Lago di Como", "Lago Trasimeno"] },
      { text: "Qual è la montagna più alta d'Italia?", difficulty: "EASY", answers: ["Monte Bianco", "Cervino", "Monte Rosa", "Gran Paradiso"] },
      { text: "Quanti paesi ci sono nel continente africano?", difficulty: "HARD", answers: ["54", "48", "52", "57"] },
      { text: "Qual è il paese più piccolo del mondo?", difficulty: "EASY", answers: ["Città del Vaticano", "Monaco", "San Marino", "Liechtenstein"] },
      { text: "Qual è la montagna più alta d'Europa?", difficulty: "MEDIUM", answers: ["Elbrus", "Monte Bianco", "Cervino", "Monte Rosa"] },
      { text: "Quale paese ha più fusi orari?", difficulty: "HARD", answers: ["Francia", "Russia", "Stati Uniti", "Cina"] },
      { text: "Quale stretto separa l'Europa dall'Africa?", difficulty: "MEDIUM", answers: ["Stretto di Gibilterra", "Stretto di Messina", "Stretto del Bosforo", "Stretto di Dover"] },
      { text: "In quale paese si trova il Grand Canyon?", difficulty: "EASY", answers: ["Stati Uniti", "Messico", "Canada", "Cile"] },
      { text: "Qual è il mare più salato del mondo?", difficulty: "MEDIUM", answers: ["Mar Morto", "Mar Rosso", "Mar Mediterraneo", "Mar Nero"] },
      { text: "Quale vulcano distrusse Pompei?", difficulty: "EASY", answers: ["Vesuvio", "Etna", "Stromboli", "Vulcano"] },
      { text: "In quale paese si trova la città di Timbuctù?", difficulty: "HARD", answers: ["Mali", "Niger", "Ciad", "Burkina Faso"] },
      { text: "Qual è il punto più profondo dell'oceano?", difficulty: "HARD", answers: ["Fossa delle Marianne", "Fossa di Porto Rico", "Fossa delle Curili", "Fossa di Giava"] },
      { text: "Qual è il paese più popolato del mondo?", difficulty: "MEDIUM", answers: ["India", "Cina", "Stati Uniti", "Indonesia"] },
      { text: "Quale città è famosa per il Cristo Redentore?", difficulty: "EASY", answers: ["Rio de Janeiro", "Buenos Aires", "Lima", "Santiago"] },
      { text: "In quale paese si trova Petra?", difficulty: "MEDIUM", answers: ["Giordania", "Egitto", "Israele", "Siria"] },
      { text: "Qual è il principale prodotto esportato dall'Arabia Saudita?", difficulty: "EASY", answers: ["Petrolio", "Oro", "Gas naturale", "Datteri"] },
      { text: "Quale canale collega il Mar Rosso al Mediterraneo?", difficulty: "EASY", answers: ["Canale di Suez", "Canale di Panama", "Canale della Manica", "Bosforo"] },
      { text: "Quale canale collega l'Oceano Atlantico al Pacifico?", difficulty: "EASY", answers: ["Canale di Panama", "Canale di Suez", "Canale Erie", "Canale Reno-Meno-Danubio"] },
      { text: "Quale isola è la più grande del mondo?", difficulty: "MEDIUM", answers: ["Groenlandia", "Nuova Guinea", "Borneo", "Madagascar"] },
      { text: "Quale capitale si trova sulla costa del Mar Morto?", difficulty: "HARD", answers: ["Amman", "Gerusalemme", "Beirut", "Damasco"] },
      { text: "Qual è il deserto più grande del mondo?", difficulty: "HARD", answers: ["Antartide", "Sahara", "Gobi", "Kalahari"] },
      { text: "Qual è la capitale della Russia?", difficulty: "EASY", answers: ["Mosca", "San Pietroburgo", "Kiev", "Minsk"] },
      { text: "Qual è la lingua ufficiale del Brasile?", difficulty: "EASY", answers: ["Portoghese", "Spagnolo", "Inglese", "Francese"] },
      { text: "Qual è il secondo paese più grande del mondo?", difficulty: "MEDIUM", answers: ["Canada", "Cina", "Stati Uniti", "Brasile"] },
      { text: "Qual è la capitale della Norvegia?", difficulty: "MEDIUM", answers: ["Oslo", "Bergen", "Stoccolma", "Copenhagen"] },
      { text: "Qual è la capitale della Svezia?", difficulty: "MEDIUM", answers: ["Stoccolma", "Oslo", "Helsinki", "Copenaghen"] },
      { text: "Qual è il fiume più lungo d'Europa?", difficulty: "MEDIUM", answers: ["Volga", "Danubio", "Reno", "Elba"] },
      { text: "Qual è la capitale della Grecia?", difficulty: "EASY", answers: ["Atene", "Salonicco", "Patrasso", "Sparta"] },
      { text: "In quale paese si trova l'Angkor Wat?", difficulty: "HARD", answers: ["Cambogia", "Thailandia", "Vietnam", "Laos"] },
      { text: "Qual è la capitale del Portogallo?", difficulty: "EASY", answers: ["Lisbona", "Porto", "Coimbra", "Faro"] },
    ],
  },

  // ============================================================
  // SCIENZA (50)
  // ============================================================
  {
    name: "Scienza", slug: "scienza", icon: "🔬", color: "#6366f1",
    questions: [
      { text: "Qual è il simbolo chimico dell'oro?", difficulty: "EASY", answers: ["Au", "Go", "Ag", "Or"] },
      { text: "Quanti pianeti ci sono nel sistema solare?", difficulty: "EASY", answers: ["8", "7", "9", "10"] },
      { text: "Chi ha formulato la teoria della relatività?", difficulty: "EASY", answers: ["Albert Einstein", "Isaac Newton", "Niels Bohr", "Max Planck"] },
      { text: "Qual è la formula chimica dell'acqua?", difficulty: "EASY", answers: ["H2O", "HO", "H2O2", "CO2"] },
      { text: "Qual è il pianeta più vicino al Sole?", difficulty: "EASY", answers: ["Mercurio", "Venere", "Terra", "Marte"] },
      { text: "Qual è il pianeta più grande del sistema solare?", difficulty: "EASY", answers: ["Giove", "Saturno", "Nettuno", "Urano"] },
      { text: "Qual è il simbolo chimico dell'acqua ossigenata?", difficulty: "MEDIUM", answers: ["H2O2", "H2O", "O2", "OH"] },
      { text: "Qual è il metallo più pesante tra questi?", difficulty: "MEDIUM", answers: ["Piombo", "Alluminio", "Rame", "Ferro"] },
      { text: "Qual è la velocità della luce nel vuoto (approssimata)?", difficulty: "MEDIUM", answers: ["300.000 km/s", "150.000 km/s", "1.000.000 km/s", "30.000 km/s"] },
      { text: "Quale gas è il più abbondante nell'atmosfera terrestre?", difficulty: "MEDIUM", answers: ["Azoto", "Ossigeno", "Anidride carbonica", "Argon"] },
      { text: "Da cosa è composto il nucleo di un atomo?", difficulty: "MEDIUM", answers: ["Protoni e neutroni", "Solo protoni", "Protoni ed elettroni", "Solo neutroni"] },
      { text: "Qual è il numero atomico del carbonio?", difficulty: "MEDIUM", answers: ["6", "4", "8", "12"] },
      { text: "Qual è l'unità di misura dell'energia nel Sistema Internazionale?", difficulty: "MEDIUM", answers: ["Joule", "Watt", "Newton", "Pascal"] },
      { text: "Come si chiama il processo con cui le piante producono energia?", difficulty: "EASY", answers: ["Fotosintesi", "Respirazione", "Traspirazione", "Osmosi"] },
      { text: "Quante ossa ha lo scheletro umano adulto?", difficulty: "MEDIUM", answers: ["206", "195", "220", "250"] },
      { text: "Qual è l'organo che pompa il sangue nel corpo umano?", difficulty: "EASY", answers: ["Cuore", "Fegato", "Polmoni", "Reni"] },
      { text: "Qual è la stella più vicina alla Terra?", difficulty: "EASY", answers: ["Il Sole", "Alfa Centauri", "Sirio", "Polaris"] },
      { text: "Chi formulò le tre leggi del moto?", difficulty: "MEDIUM", answers: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Johannes Kepler"] },
      { text: "Quale pianeta è chiamato 'pianeta rosso'?", difficulty: "EASY", answers: ["Marte", "Venere", "Giove", "Saturno"] },
      { text: "Qual è il simbolo chimico del sodio?", difficulty: "MEDIUM", answers: ["Na", "So", "Sd", "S"] },
      { text: "Quante cromosomi ha un essere umano?", difficulty: "MEDIUM", answers: ["46", "23", "48", "44"] },
      { text: "Quale scienziato scoprì la penicillina?", difficulty: "MEDIUM", answers: ["Alexander Fleming", "Louis Pasteur", "Marie Curie", "Charles Darwin"] },
      { text: "Chi ha proposto la teoria dell'evoluzione?", difficulty: "EASY", answers: ["Charles Darwin", "Gregor Mendel", "Louis Pasteur", "Alfred Wegener"] },
      { text: "Qual è l'elemento più abbondante nell'universo?", difficulty: "MEDIUM", answers: ["Idrogeno", "Ossigeno", "Elio", "Carbonio"] },
      { text: "Quale organo del corpo umano produce insulina?", difficulty: "MEDIUM", answers: ["Pancreas", "Fegato", "Stomaco", "Rene"] },
      { text: "Qual è l'osso più lungo del corpo umano?", difficulty: "MEDIUM", answers: ["Femore", "Tibia", "Omero", "Colonna vertebrale"] },
      { text: "Come si chiama la galassia in cui si trova la Terra?", difficulty: "EASY", answers: ["Via Lattea", "Andromeda", "Sombrero", "Girandola"] },
      { text: "Qual è l'unità di misura della frequenza?", difficulty: "MEDIUM", answers: ["Hertz", "Watt", "Joule", "Pascal"] },
      { text: "Chi scoprì il radio e il polonio?", difficulty: "MEDIUM", answers: ["Marie Curie", "Albert Einstein", "Niels Bohr", "Enrico Fermi"] },
      { text: "Qual è il pH di una soluzione neutra?", difficulty: "MEDIUM", answers: ["7", "0", "14", "10"] },
      { text: "Quale parte del cervello controlla l'equilibrio?", difficulty: "HARD", answers: ["Cervelletto", "Cervello", "Bulbo", "Ipotalamo"] },
      { text: "Qual è la particella subatomica con carica positiva?", difficulty: "MEDIUM", answers: ["Protone", "Elettrone", "Neutrone", "Fotone"] },
      { text: "Quale acido si trova nello stomaco?", difficulty: "MEDIUM", answers: ["Cloridrico", "Solforico", "Nitrico", "Acetico"] },
      { text: "Qual è l'animale più veloce sulla terraferma?", difficulty: "EASY", answers: ["Ghepardo", "Leone", "Antilope", "Cavallo"] },
      { text: "Quale scienziato formulò la tavola periodica?", difficulty: "MEDIUM", answers: ["Dmitri Mendeleev", "Antoine Lavoisier", "Niels Bohr", "Marie Curie"] },
      { text: "Qual è la temperatura di ebollizione dell'acqua a livello del mare?", difficulty: "EASY", answers: ["100 °C", "90 °C", "120 °C", "0 °C"] },
      { text: "Qual è l'unità di misura della resistenza elettrica?", difficulty: "MEDIUM", answers: ["Ohm", "Volt", "Ampere", "Watt"] },
      { text: "Quale gas è necessario per la combustione?", difficulty: "EASY", answers: ["Ossigeno", "Azoto", "Idrogeno", "Anidride carbonica"] },
      { text: "Come si chiama la teoria dell'origine dell'universo?", difficulty: "EASY", answers: ["Big Bang", "Inflazione", "Stato Stazionario", "Entropia"] },
      { text: "Quale vitamina produce la pelle con la luce solare?", difficulty: "MEDIUM", answers: ["Vitamina D", "Vitamina A", "Vitamina C", "Vitamina B12"] },
      { text: "Quale pianeta ha il maggior numero di anelli visibili?", difficulty: "EASY", answers: ["Saturno", "Giove", "Urano", "Nettuno"] },
      { text: "Quante zampe ha un ragno?", difficulty: "EASY", answers: ["8", "6", "10", "12"] },
      { text: "Quale tessuto del corpo umano si ripara più velocemente?", difficulty: "HARD", answers: ["Pelle", "Osso", "Muscolo", "Nervo"] },
      { text: "Come si chiama la cellula sessuale maschile?", difficulty: "EASY", answers: ["Spermatozoo", "Ovulo", "Zigote", "Gamete"] },
      { text: "Quale gas viene prodotto dagli esseri umani quando espirano?", difficulty: "EASY", answers: ["Anidride carbonica", "Ossigeno", "Idrogeno", "Metano"] },
      { text: "Qual è il gruppo sanguigno 'donatore universale'?", difficulty: "MEDIUM", answers: ["0 negativo", "AB positivo", "A positivo", "B negativo"] },
      { text: "Quale organo filtra il sangue e produce l'urina?", difficulty: "EASY", answers: ["Rene", "Fegato", "Cuore", "Pancreas"] },
      { text: "Quale strumento misura la pressione atmosferica?", difficulty: "MEDIUM", answers: ["Barometro", "Termometro", "Igrometro", "Anemometro"] },
      { text: "Qual è l'insetto più numeroso per specie?", difficulty: "HARD", answers: ["Coleotteri", "Farfalle", "Formiche", "Zanzare"] },
      { text: "Quale scienziato è noto per il principio di indeterminazione?", difficulty: "HARD", answers: ["Werner Heisenberg", "Niels Bohr", "Erwin Schrödinger", "Max Planck"] },
    ],
  },

  // ============================================================
  // ARTE E CULTURA (50)
  // ============================================================
  {
    name: "Arte e Cultura", slug: "arte-cultura", icon: "🎨", color: "#ec4899",
    questions: [
      { text: "Chi ha dipinto la Gioconda?", difficulty: "EASY", answers: ["Leonardo da Vinci", "Michelangelo", "Raffaello", "Caravaggio"] },
      { text: "In quale città si trova il Colosseo?", difficulty: "EASY", answers: ["Roma", "Atene", "Napoli", "Firenze"] },
      { text: "Chi scrisse 'La Divina Commedia'?", difficulty: "EASY", answers: ["Dante Alighieri", "Petrarca", "Boccaccio", "Manzoni"] },
      { text: "Chi scrisse 'I Promessi Sposi'?", difficulty: "EASY", answers: ["Alessandro Manzoni", "Dante Alighieri", "Francesco Petrarca", "Giovanni Boccaccio"] },
      { text: "Chi scrisse 'Romeo e Giulietta'?", difficulty: "EASY", answers: ["William Shakespeare", "Charles Dickens", "Victor Hugo", "Jane Austen"] },
      { text: "Quale pittore olandese si tagliò un orecchio?", difficulty: "EASY", answers: ["Vincent van Gogh", "Rembrandt", "Vermeer", "Mondrian"] },
      { text: "Quale movimento artistico è associato a Pablo Picasso?", difficulty: "MEDIUM", answers: ["Cubismo", "Impressionismo", "Surrealismo", "Espressionismo"] },
      { text: "Chi compose la Nona Sinfonia?", difficulty: "MEDIUM", answers: ["Beethoven", "Mozart", "Bach", "Vivaldi"] },
      { text: "In quale museo si trova la Gioconda?", difficulty: "MEDIUM", answers: ["Louvre, Parigi", "Uffizi, Firenze", "National Gallery, Londra", "Prado, Madrid"] },
      { text: "Chi dipinse la Cappella Sistina?", difficulty: "EASY", answers: ["Michelangelo", "Leonardo da Vinci", "Raffaello", "Botticelli"] },
      { text: "Chi scrisse 'Don Chisciotte'?", difficulty: "MEDIUM", answers: ["Miguel de Cervantes", "Lope de Vega", "Federico García Lorca", "Garcilaso de la Vega"] },
      { text: "Chi dipinse 'L'Urlo'?", difficulty: "MEDIUM", answers: ["Edvard Munch", "Salvador Dalí", "Pablo Picasso", "Vincent van Gogh"] },
      { text: "Chi compose 'Le Quattro Stagioni'?", difficulty: "EASY", answers: ["Antonio Vivaldi", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Giuseppe Verdi"] },
      { text: "Quale opera lirica è famosa per 'Nessun dorma'?", difficulty: "MEDIUM", answers: ["Turandot", "La Traviata", "Aida", "Tosca"] },
      { text: "Chi dipinse 'La Notte Stellata'?", difficulty: "EASY", answers: ["Vincent van Gogh", "Claude Monet", "Edgar Degas", "Paul Cézanne"] },
      { text: "Chi scrisse 'Guerra e Pace'?", difficulty: "MEDIUM", answers: ["Lev Tolstoj", "Fëdor Dostoevskij", "Anton Čechov", "Aleksandr Puškin"] },
      { text: "Chi scrisse 'Delitto e Castigo'?", difficulty: "MEDIUM", answers: ["Fëdor Dostoevskij", "Lev Tolstoj", "Nikolaj Gogol", "Ivan Turgenev"] },
      { text: "Chi scrisse 'Cent'anni di solitudine'?", difficulty: "HARD", answers: ["Gabriel García Márquez", "Jorge Luis Borges", "Mario Vargas Llosa", "Julio Cortázar"] },
      { text: "Chi scrisse 'Il Piccolo Principe'?", difficulty: "EASY", answers: ["Antoine de Saint-Exupéry", "Jules Verne", "Victor Hugo", "Albert Camus"] },
      { text: "Quale pittore è famoso per 'La Persistenza della Memoria' (gli orologi molli)?", difficulty: "MEDIUM", answers: ["Salvador Dalí", "Pablo Picasso", "René Magritte", "Max Ernst"] },
      { text: "In quale museo di Firenze si trova il David di Michelangelo?", difficulty: "MEDIUM", answers: ["Galleria dell'Accademia", "Uffizi", "Palazzo Pitti", "Bargello"] },
      { text: "Chi compose 'Il Flauto Magico'?", difficulty: "MEDIUM", answers: ["Wolfgang Amadeus Mozart", "Giuseppe Verdi", "Richard Wagner", "Giacomo Puccini"] },
      { text: "Chi ha scritto 'Amleto'?", difficulty: "EASY", answers: ["William Shakespeare", "Charles Dickens", "Oscar Wilde", "Jane Austen"] },
      { text: "Chi scrisse l'Odissea e l'Iliade?", difficulty: "EASY", answers: ["Omero", "Virgilio", "Sofocle", "Euripide"] },
      { text: "Chi scrisse l'Eneide?", difficulty: "MEDIUM", answers: ["Virgilio", "Omero", "Orazio", "Ovidio"] },
      { text: "Chi scrisse 'Il Nome della Rosa'?", difficulty: "MEDIUM", answers: ["Umberto Eco", "Italo Calvino", "Primo Levi", "Andrea Camilleri"] },
      { text: "Chi scrisse 'Le Avventure di Pinocchio'?", difficulty: "EASY", answers: ["Carlo Collodi", "Edmondo De Amicis", "Giovanni Verga", "Giovanni Pascoli"] },
      { text: "Chi dipinse 'Le Ninfee'?", difficulty: "MEDIUM", answers: ["Claude Monet", "Pierre-Auguste Renoir", "Paul Gauguin", "Henri Matisse"] },
      { text: "Quale scultore creò la Pietà del Vaticano?", difficulty: "MEDIUM", answers: ["Michelangelo", "Donatello", "Bernini", "Canova"] },
      { text: "Chi ha scritto 'I Miserabili'?", difficulty: "MEDIUM", answers: ["Victor Hugo", "Honoré de Balzac", "Gustave Flaubert", "Emile Zola"] },
      { text: "Chi compose 'La Tosca'?", difficulty: "MEDIUM", answers: ["Giacomo Puccini", "Giuseppe Verdi", "Gioachino Rossini", "Vincenzo Bellini"] },
      { text: "Chi dipinse 'La Primavera' (Botticelli)?", difficulty: "MEDIUM", answers: ["Sandro Botticelli", "Masaccio", "Piero della Francesca", "Giotto"] },
      { text: "Di chi è il famoso 'Compianto sul Cristo morto' a Mantova?", difficulty: "HARD", answers: ["Andrea Mantegna", "Raffaello", "Tiziano", "Giorgione"] },
      { text: "Chi scrisse '1984'?", difficulty: "EASY", answers: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "Philip K. Dick"] },
      { text: "Chi dipinse 'Il Bacio' (Klimt)?", difficulty: "MEDIUM", answers: ["Gustav Klimt", "Egon Schiele", "Oskar Kokoschka", "Ernst Kirchner"] },
      { text: "Quale movimento artistico è associato a Monet?", difficulty: "MEDIUM", answers: ["Impressionismo", "Cubismo", "Realismo", "Romanticismo"] },
      { text: "Chi dipinse 'Guernica'?", difficulty: "MEDIUM", answers: ["Pablo Picasso", "Salvador Dalí", "Joan Miró", "Francisco Goya"] },
      { text: "Chi scrisse 'Il Ritratto di Dorian Gray'?", difficulty: "MEDIUM", answers: ["Oscar Wilde", "George Bernard Shaw", "Charles Dickens", "Robert Louis Stevenson"] },
      { text: "Quale poeta italiano scrisse 'L'Infinito'?", difficulty: "MEDIUM", answers: ["Giacomo Leopardi", "Giosuè Carducci", "Ugo Foscolo", "Giovanni Pascoli"] },
      { text: "Chi è l'autore di 'Uno, nessuno e centomila'?", difficulty: "MEDIUM", answers: ["Luigi Pirandello", "Italo Svevo", "Cesare Pavese", "Elsa Morante"] },
      { text: "Chi compose 'Il Barbiere di Siviglia'?", difficulty: "HARD", answers: ["Gioachino Rossini", "Giuseppe Verdi", "Vincenzo Bellini", "Gaetano Donizetti"] },
      { text: "Chi scolpì il 'Perseo con la testa di Medusa' a Firenze?", difficulty: "HARD", answers: ["Benvenuto Cellini", "Donatello", "Giambologna", "Verrocchio"] },
      { text: "Chi scrisse 'Madame Bovary'?", difficulty: "MEDIUM", answers: ["Gustave Flaubert", "Honoré de Balzac", "Emile Zola", "Stendhal"] },
      { text: "Chi dipinse il 'Giudizio Universale' nella Cappella Sistina?", difficulty: "MEDIUM", answers: ["Michelangelo", "Raffaello", "Leonardo", "Botticelli"] },
      { text: "Quale compositore italiano scrisse 'Aida'?", difficulty: "EASY", answers: ["Giuseppe Verdi", "Giacomo Puccini", "Gioachino Rossini", "Vincenzo Bellini"] },
      { text: "Chi scrisse 'Il Gattopardo'?", difficulty: "MEDIUM", answers: ["Giuseppe Tomasi di Lampedusa", "Leonardo Sciascia", "Italo Calvino", "Primo Levi"] },
      { text: "Chi è l'autore de 'La Coscienza di Zeno'?", difficulty: "HARD", answers: ["Italo Svevo", "Luigi Pirandello", "Gabriele D'Annunzio", "Cesare Pavese"] },
      { text: "Chi scrisse 'Il Decameron'?", difficulty: "EASY", answers: ["Giovanni Boccaccio", "Francesco Petrarca", "Dante Alighieri", "Ludovico Ariosto"] },
      { text: "Chi dipinse 'La Ragazza con l'Orecchino di Perla'?", difficulty: "MEDIUM", answers: ["Johannes Vermeer", "Rembrandt", "Frans Hals", "Pieter Bruegel"] },
      { text: "Quale scultore francese creò 'Il Pensatore'?", difficulty: "MEDIUM", answers: ["Auguste Rodin", "Camille Claudel", "Aristide Maillol", "Antoine Bourdelle"] },
    ],
  },

  // ============================================================
  // SPORT (50)
  // ============================================================
  {
    name: "Sport", slug: "sport", icon: "⚽", color: "#ef4444",
    questions: [
      { text: "Ogni quanti anni si svolgono le Olimpiadi estive?", difficulty: "EASY", answers: ["4 anni", "2 anni", "3 anni", "5 anni"] },
      { text: "In quale sport si usa la 'racchetta'?", difficulty: "EASY", answers: ["Tennis", "Calcio", "Nuoto", "Pallavolo"] },
      { text: "Quanti giocatori ci sono in campo per squadra nel basket?", difficulty: "EASY", answers: ["5", "4", "6", "7"] },
      { text: "Quanti giocatori ha una squadra di calcio in campo?", difficulty: "EASY", answers: ["11", "10", "12", "9"] },
      { text: "Quale nazione ha vinto più Mondiali di calcio?", difficulty: "MEDIUM", answers: ["Brasile", "Germania", "Italia", "Argentina"] },
      { text: "In quale sport si esegue un 'canestro'?", difficulty: "EASY", answers: ["Pallacanestro", "Pallavolo", "Calcio", "Rugby"] },
      { text: "Quanti set deve vincere un tennista per aggiudicarsi una finale Slam maschile?", difficulty: "MEDIUM", answers: ["3", "2", "4", "5"] },
      { text: "Dove si tennero le Olimpiadi estive del 2016?", difficulty: "MEDIUM", answers: ["Rio de Janeiro", "Londra", "Tokyo", "Pechino"] },
      { text: "Quante buche ha un campo da golf standard?", difficulty: "MEDIUM", answers: ["18", "9", "12", "24"] },
      { text: "Quale paese ha vinto il Mondiale di calcio del 2018?", difficulty: "MEDIUM", answers: ["Francia", "Germania", "Brasile", "Croazia"] },
      { text: "Quale paese ha vinto il Mondiale di calcio del 2022?", difficulty: "MEDIUM", answers: ["Argentina", "Francia", "Brasile", "Croazia"] },
      { text: "Quale paese ha vinto il Mondiale di calcio del 2006?", difficulty: "MEDIUM", answers: ["Italia", "Francia", "Germania", "Brasile"] },
      { text: "In quale città si sono svolte le Olimpiadi estive del 2020?", difficulty: "EASY", answers: ["Tokyo", "Rio de Janeiro", "Londra", "Parigi"] },
      { text: "Chi detiene il record del mondo dei 100 metri piani?", difficulty: "MEDIUM", answers: ["Usain Bolt", "Tyson Gay", "Justin Gatlin", "Yohan Blake"] },
      { text: "Quante ore dura una partita di rugby standard?", difficulty: "MEDIUM", answers: ["80 minuti", "90 minuti", "60 minuti", "70 minuti"] },
      { text: "In quale sport viene usato un disco (puck)?", difficulty: "EASY", answers: ["Hockey su ghiaccio", "Cricket", "Baseball", "Softball"] },
      { text: "Qual è il torneo di tennis su erba più famoso?", difficulty: "EASY", answers: ["Wimbledon", "Roland Garros", "US Open", "Australian Open"] },
      { text: "Qual è il torneo di tennis giocato a Parigi?", difficulty: "MEDIUM", answers: ["Roland Garros", "Wimbledon", "US Open", "Australian Open"] },
      { text: "Quale Paese ha vinto più medaglie olimpiche nella storia?", difficulty: "MEDIUM", answers: ["Stati Uniti", "Russia", "Cina", "Germania"] },
      { text: "Quanti minuti dura una partita di basket NBA?", difficulty: "MEDIUM", answers: ["48", "40", "60", "36"] },
      { text: "Chi è il giocatore con più palloni d'oro?", difficulty: "MEDIUM", answers: ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"] },
      { text: "In quale sport esiste la 'prova a cronometro'?", difficulty: "EASY", answers: ["Ciclismo", "Calcio", "Tennis", "Pallavolo"] },
      { text: "Quale squadra vinse la Champions League 2021/2022?", difficulty: "HARD", answers: ["Real Madrid", "Liverpool", "Manchester City", "PSG"] },
      { text: "Chi è noto come 'Il Re della Formula 1' con 7 titoli mondiali condivisi con Hamilton?", difficulty: "MEDIUM", answers: ["Michael Schumacher", "Niki Lauda", "Sebastian Vettel", "Alain Prost"] },
      { text: "In quale stadio gioca il Barcellona?", difficulty: "MEDIUM", answers: ["Camp Nou", "Santiago Bernabéu", "Wanda Metropolitano", "Mestalla"] },
      { text: "In quale città nacquero i Giochi Olimpici antichi?", difficulty: "MEDIUM", answers: ["Olimpia", "Atene", "Sparta", "Corinto"] },
      { text: "Quale paese ha vinto più medaglie nel nuoto olimpico?", difficulty: "HARD", answers: ["Stati Uniti", "Australia", "Giappone", "Russia"] },
      { text: "Qual è la distanza di una maratona?", difficulty: "MEDIUM", answers: ["42,195 km", "40 km", "45 km", "50 km"] },
      { text: "Quanti giocatori compongono una squadra di pallavolo in campo?", difficulty: "EASY", answers: ["6", "5", "7", "8"] },
      { text: "In quale sport si gioca con la mazza?", difficulty: "EASY", answers: ["Baseball", "Hockey su ghiaccio", "Rugby", "Golf"] },
      { text: "Qual è lo sport nazionale del Canada (estivo)?", difficulty: "HARD", answers: ["Lacrosse", "Hockey", "Baseball", "Basket"] },
      { text: "Chi è l'unico tennista a vincere tutti i Grand Slam e l'oro olimpico nello stesso anno?", difficulty: "HARD", answers: ["Steffi Graf", "Serena Williams", "Martina Navratilova", "Chris Evert"] },
      { text: "In quale sport c'è la 'skip' e lo 'sweep'?", difficulty: "HARD", answers: ["Curling", "Hockey", "Pattinaggio", "Bob"] },
      { text: "Quanto pesa una palla da bowling ten-pin al massimo (in libbre)?", difficulty: "HARD", answers: ["16", "12", "10", "20"] },
      { text: "In quale sport si usa un 'birillo' e una palla lanciata?", difficulty: "EASY", answers: ["Bowling", "Cricket", "Rugby", "Hockey"] },
      { text: "Qual è la durata standard di un round di boxe professionistico?", difficulty: "MEDIUM", answers: ["3 minuti", "2 minuti", "4 minuti", "5 minuti"] },
      { text: "Dove nacque il calcio moderno?", difficulty: "MEDIUM", answers: ["Inghilterra", "Italia", "Germania", "Francia"] },
      { text: "Quale evento di ciclismo è il più prestigioso?", difficulty: "EASY", answers: ["Tour de France", "Giro d'Italia", "Vuelta", "Parigi-Roubaix"] },
      { text: "Chi è il giocatore di basket con più punti NBA in una partita (82 punti)?", difficulty: "HARD", answers: ["Wilt Chamberlain (100)", "Kobe Bryant", "Michael Jordan", "LeBron James"] },
      { text: "Quante Formula 1 Mondiali ha vinto Lewis Hamilton?", difficulty: "MEDIUM", answers: ["7", "6", "8", "5"] },
      { text: "Quale sport praticava Muhammad Ali?", difficulty: "EASY", answers: ["Boxe", "MMA", "Lotta", "Karate"] },
      { text: "Chi era soprannominato 'Il Pibe de Oro'?", difficulty: "MEDIUM", answers: ["Diego Maradona", "Lionel Messi", "Ronaldinho", "Pelé"] },
      { text: "Di che nazionalità è Rafael Nadal?", difficulty: "EASY", answers: ["Spagnolo", "Italiano", "Francese", "Portoghese"] },
      { text: "Quale nazione vinse gli Europei di calcio 2020 (disputati nel 2021)?", difficulty: "MEDIUM", answers: ["Italia", "Inghilterra", "Spagna", "Germania"] },
      { text: "Come si chiama la tecnica di nuoto più veloce?", difficulty: "EASY", answers: ["Stile libero (crawl)", "Rana", "Dorso", "Farfalla"] },
      { text: "Quale squadra di calcio italiana ha vinto più Champions League?", difficulty: "MEDIUM", answers: ["Milan", "Inter", "Juventus", "Roma"] },
      { text: "Chi vinse gli Europei di calcio 2016?", difficulty: "MEDIUM", answers: ["Portogallo", "Francia", "Germania", "Spagna"] },
      { text: "In quale sport si gioca su un 'diamante'?", difficulty: "MEDIUM", answers: ["Baseball", "Softball", "Cricket", "Hockey"] },
      { text: "Quale coppa si vince alla NHL?", difficulty: "HARD", answers: ["Stanley Cup", "Calder Cup", "Ross Trophy", "Hart Trophy"] },
      { text: "Quale atleta detiene il record del mondo dei 200 metri piani?", difficulty: "HARD", answers: ["Usain Bolt", "Yohan Blake", "Michael Johnson", "Tyson Gay"] },
    ],
  },

  // ============================================================
  // CINEMA (50)
  // ============================================================
  {
    name: "Cinema", slug: "cinema", icon: "🎬", color: "#8b5cf6",
    questions: [
      { text: "Chi ha diretto 'Il Padrino'?", difficulty: "MEDIUM", answers: ["Francis Ford Coppola", "Martin Scorsese", "Steven Spielberg", "Quentin Tarantino"] },
      { text: "Chi interpreta Jack Sparrow nei 'Pirati dei Caraibi'?", difficulty: "EASY", answers: ["Johnny Depp", "Orlando Bloom", "Brad Pitt", "Leonardo DiCaprio"] },
      { text: "Chi ha diretto il film 'Titanic' del 1997?", difficulty: "MEDIUM", answers: ["James Cameron", "Steven Spielberg", "Christopher Nolan", "Ridley Scott"] },
      { text: "In quale film Disney c'è la canzone 'Let It Go'?", difficulty: "EASY", answers: ["Frozen", "Cenerentola", "Rapunzel", "Oceania"] },
      { text: "Chi ha doppiato Woody in 'Toy Story' (versione originale inglese)?", difficulty: "MEDIUM", answers: ["Tom Hanks", "Tom Cruise", "Will Smith", "Jim Carrey"] },
      { text: "In quale anno uscì il primo film di 'Star Wars'?", difficulty: "MEDIUM", answers: ["1977", "1975", "1980", "1983"] },
      { text: "Quale attore interpreta Iron Man nel Marvel Cinematic Universe?", difficulty: "EASY", answers: ["Robert Downey Jr.", "Chris Evans", "Chris Hemsworth", "Mark Ruffalo"] },
      { text: "Quale film ha vinto l'Oscar come miglior film nel 2020?", difficulty: "HARD", answers: ["Parasite", "1917", "Joker", "C'era una volta a Hollywood"] },
      { text: "Chi ha diretto 'Pulp Fiction'?", difficulty: "MEDIUM", answers: ["Quentin Tarantino", "Martin Scorsese", "David Fincher", "Coen Brothers"] },
      { text: "Chi interpreta Harry Potter nei film?", difficulty: "EASY", answers: ["Daniel Radcliffe", "Rupert Grint", "Tom Felton", "Matthew Lewis"] },
      { text: "Chi interpreta Forrest Gump?", difficulty: "EASY", answers: ["Tom Hanks", "Tom Cruise", "Kevin Costner", "Brad Pitt"] },
      { text: "Chi interpreta la principessa Leia in Star Wars?", difficulty: "MEDIUM", answers: ["Carrie Fisher", "Natalie Portman", "Daisy Ridley", "Emma Watson"] },
      { text: "Chi ha diretto 'Jurassic Park'?", difficulty: "EASY", answers: ["Steven Spielberg", "George Lucas", "James Cameron", "Ridley Scott"] },
      { text: "Qual è il film d'animazione Disney con Simba?", difficulty: "EASY", answers: ["Il Re Leone", "Tarzan", "Bambi", "Mufasa"] },
      { text: "Chi interpreta Neo in 'Matrix'?", difficulty: "EASY", answers: ["Keanu Reeves", "Hugo Weaving", "Laurence Fishburne", "Joe Pantoliano"] },
      { text: "Quale film è ambientato nell'hotel Overlook?", difficulty: "HARD", answers: ["Shining", "Psycho", "Gli Uccelli", "L'Esorcista"] },
      { text: "Chi ha diretto 'Shining'?", difficulty: "MEDIUM", answers: ["Stanley Kubrick", "Alfred Hitchcock", "David Lynch", "Wes Craven"] },
      { text: "Quale attore interpreta il Joker in 'Joker' (2019)?", difficulty: "MEDIUM", answers: ["Joaquin Phoenix", "Heath Ledger", "Jared Leto", "Jack Nicholson"] },
      { text: "Chi ha diretto 'Inception'?", difficulty: "MEDIUM", answers: ["Christopher Nolan", "Denis Villeneuve", "David Fincher", "Darren Aronofsky"] },
      { text: "Quale film ha vinto la Palma d'Oro a Cannes nel 1994?", difficulty: "HARD", answers: ["Pulp Fiction", "Forrest Gump", "Quiz Show", "Tre Colori: Rosso"] },
      { text: "In che anno uscì 'Avatar' di James Cameron?", difficulty: "MEDIUM", answers: ["2009", "2007", "2011", "2012"] },
      { text: "Chi interpreta il Padrino Vito Corleone nel primo film?", difficulty: "MEDIUM", answers: ["Marlon Brando", "Al Pacino", "Robert De Niro", "James Caan"] },
      { text: "Chi interpreta il giovane Vito Corleone nel secondo film?", difficulty: "HARD", answers: ["Robert De Niro", "Al Pacino", "John Cazale", "Richard Castellano"] },
      { text: "Qual è il film dove Leonardo DiCaprio vinse il suo primo Oscar da protagonista?", difficulty: "MEDIUM", answers: ["Revenant", "Titanic", "Il Lupo di Wall Street", "Inception"] },
      { text: "Quale film con Russell Crowe vinse l'Oscar nel 2001?", difficulty: "MEDIUM", answers: ["Il Gladiatore", "A Beautiful Mind", "L.A. Confidential", "Master & Commander"] },
      { text: "Chi è il regista de 'La lista di Schindler'?", difficulty: "MEDIUM", answers: ["Steven Spielberg", "Martin Scorsese", "Stanley Kubrick", "Roman Polanski"] },
      { text: "In quale film appare Hannibal Lecter?", difficulty: "EASY", answers: ["Il Silenzio degli Innocenti", "Seven", "The Shining", "L'Esorcista"] },
      { text: "Chi interpreta Hannibal Lecter in 'Il Silenzio degli Innocenti'?", difficulty: "MEDIUM", answers: ["Anthony Hopkins", "Robert De Niro", "Al Pacino", "Kevin Spacey"] },
      { text: "Quale film italiano vinse l'Oscar come miglior film straniero nel 1999?", difficulty: "HARD", answers: ["La Vita è Bella", "Il Postino", "Mediterraneo", "Nuovo Cinema Paradiso"] },
      { text: "Chi ha diretto 'La Vita è Bella'?", difficulty: "EASY", answers: ["Roberto Benigni", "Federico Fellini", "Giuseppe Tornatore", "Paolo Sorrentino"] },
      { text: "Chi ha diretto 'Nuovo Cinema Paradiso'?", difficulty: "MEDIUM", answers: ["Giuseppe Tornatore", "Federico Fellini", "Roberto Benigni", "Sergio Leone"] },
      { text: "Chi ha diretto 'C'era una volta in America'?", difficulty: "MEDIUM", answers: ["Sergio Leone", "Bernardo Bertolucci", "Dario Argento", "Federico Fellini"] },
      { text: "In quale saga c'è Frodo Baggins?", difficulty: "EASY", answers: ["Il Signore degli Anelli", "Harry Potter", "Narnia", "Le Cronache di Riddick"] },
      { text: "Chi ha diretto 'Il Signore degli Anelli'?", difficulty: "EASY", answers: ["Peter Jackson", "Guillermo del Toro", "Ridley Scott", "James Cameron"] },
      { text: "Chi interpreta Aragorn ne 'Il Signore degli Anelli'?", difficulty: "MEDIUM", answers: ["Viggo Mortensen", "Orlando Bloom", "Sean Bean", "Karl Urban"] },
      { text: "Qual è il primo film Pixar?", difficulty: "MEDIUM", answers: ["Toy Story", "Cars", "Monsters & Co.", "Alla ricerca di Nemo"] },
      { text: "Chi interpreta il capitano Jack Sparrow?", difficulty: "EASY", answers: ["Johnny Depp", "Orlando Bloom", "Geoffrey Rush", "Bill Nighy"] },
      { text: "Quale film è ambientato durante il Titanic?", difficulty: "EASY", answers: ["Titanic", "Poseidon", "Troy", "Pearl Harbor"] },
      { text: "In quale film c'è la celebre scena della doccia con coltellate?", difficulty: "HARD", answers: ["Psycho", "Halloween", "Shining", "Nightmare"] },
      { text: "Chi ha diretto 'Psycho'?", difficulty: "MEDIUM", answers: ["Alfred Hitchcock", "Stanley Kubrick", "Orson Welles", "John Ford"] },
      { text: "Quale attore interpreta James Bond in 'Casino Royale' (2006)?", difficulty: "EASY", answers: ["Daniel Craig", "Pierce Brosnan", "Sean Connery", "Roger Moore"] },
      { text: "Chi interpreta James Bond negli anni '60 e '70?", difficulty: "MEDIUM", answers: ["Sean Connery", "Roger Moore", "George Lazenby", "Timothy Dalton"] },
      { text: "In quale anno uscì il primo film di Harry Potter?", difficulty: "MEDIUM", answers: ["2001", "2000", "2002", "2003"] },
      { text: "Chi interpreta Severus Piton in Harry Potter?", difficulty: "MEDIUM", answers: ["Alan Rickman", "Gary Oldman", "Ralph Fiennes", "David Thewlis"] },
      { text: "Quale film Pixar è ambientato sott'acqua con un pesce pagliaccio?", difficulty: "EASY", answers: ["Alla ricerca di Nemo", "Oceania", "La Sirenetta", "Ponyo"] },
      { text: "Chi interpreta Rocky Balboa?", difficulty: "EASY", answers: ["Sylvester Stallone", "Arnold Schwarzenegger", "Bruce Willis", "Mel Gibson"] },
      { text: "Chi ha diretto 'Scarface' (1983)?", difficulty: "HARD", answers: ["Brian De Palma", "Martin Scorsese", "Francis Ford Coppola", "Sergio Leone"] },
      { text: "Quale attrice vinse l'Oscar per 'La La Land'?", difficulty: "MEDIUM", answers: ["Emma Stone", "Ryan Gosling", "Meryl Streep", "Natalie Portman"] },
      { text: "Chi ha diretto 'La La Land'?", difficulty: "MEDIUM", answers: ["Damien Chazelle", "Barry Jenkins", "Greta Gerwig", "Jordan Peele"] },
      { text: "Chi ha diretto 'Parasite', premio Oscar 2020?", difficulty: "MEDIUM", answers: ["Bong Joon-ho", "Park Chan-wook", "Hirokazu Kore-eda", "Wong Kar-wai"] },
    ],
  },
];

async function main() {
  console.log("🌱 Seed aggiuntivo: 50 domande per categoria\n");

  let created = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    // Upsert della categoria (crea se non esiste, aggiorna campi opzionali)
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, color: cat.color },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, color: cat.color },
    });
    console.log(`📂 ${category.icon} ${category.name}`);

    for (const q of cat.questions) {
      // Skip se esiste già una domanda con lo stesso testo nella stessa categoria
      const existing = await prisma.question.findFirst({
        where: { categoryId: category.id, text: q.text },
      });
      if (existing) { skipped++; continue; }

      // Shuffle: la prima risposta è sempre la corretta, mescoliamo l'ordine
      const shuffled = [...q.answers]
        .map((text, i) => ({ text, isCorrect: i === 0 }))
        .sort(() => Math.random() - 0.5);

      await prisma.question.create({
        data: {
          text: q.text,
          type: "MULTIPLE_CHOICE",
          difficulty: q.difficulty,
          timeLimit: 20,
          categoryId: category.id,
          answers: {
            create: shuffled.map((a, i) => ({
              text: a.text,
              isCorrect: a.isCorrect,
              order: i,
            })),
          },
        },
      });
      created++;
    }
    console.log(`   → ${cat.questions.length} domande processate`);
  }

  const total = await prisma.question.count();
  console.log(`\n✅ Seed completato`);
  console.log(`   Create: ${created}`);
  console.log(`   Saltate (già presenti): ${skipped}`);
  console.log(`   Totale domande nel DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
