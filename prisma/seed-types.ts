/**
 * Seed tipi aggiuntivi: 50 OPEN_ANSWER + 50 WORD_COMPLETION + 50 IMAGE_GUESS
 * NON cancella nulla. Upsert delle categorie + skip domande con testo duplicato.
 * Lancialo con: `npm run db:seed-types`
 *
 * IMAGE_GUESS usa URL stabili di Wikimedia Commons (Special:FilePath) che
 * redirigono al file corrente. Se qualche immagine non carica, puoi correggerla
 * dal pannello admin.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Cat = { name: string; slug: string; icon: string; color: string };
const CATS: Record<string, Cat> = {
  storia:   { name: "Storia",         slug: "storia",        icon: "📜", color: "#f59e0b" },
  geo:      { name: "Geografia",      slug: "geografia",     icon: "🌍", color: "#10b981" },
  scienza:  { name: "Scienza",        slug: "scienza",       icon: "🔬", color: "#6366f1" },
  arte:     { name: "Arte e Cultura", slug: "arte-cultura",  icon: "🎨", color: "#ec4899" },
  sport:    { name: "Sport",          slug: "sport",         icon: "⚽", color: "#ef4444" },
  cinema:   { name: "Cinema",         slug: "cinema",        icon: "🎬", color: "#8b5cf6" },
};

type Diff = "EASY" | "MEDIUM" | "HARD";

// ---------- OPEN_ANSWER (50) ----------
// openAnswer è la risposta attesa di riferimento. L'host giudica manualmente.
const OPEN: { cat: keyof typeof CATS; text: string; openAnswer: string; difficulty: Diff }[] = [
  // Storia (9)
  { cat: "storia", text: "Chi comandò la spedizione dei Mille?", openAnswer: "Giuseppe Garibaldi", difficulty: "EASY" },
  { cat: "storia", text: "Qual era il nome del cavallo di Napoleone?", openAnswer: "Marengo", difficulty: "HARD" },
  { cat: "storia", text: "Chi fu il primo Papa della storia cattolica?", openAnswer: "San Pietro", difficulty: "EASY" },
  { cat: "storia", text: "Come si chiamava la moglie di Napoleone Bonaparte?", openAnswer: "Giuseppina", difficulty: "MEDIUM" },
  { cat: "storia", text: "In quale isola fu esiliato Napoleone la prima volta?", openAnswer: "Elba", difficulty: "MEDIUM" },
  { cat: "storia", text: "Chi fu l'ultimo imperatore romano d'Occidente?", openAnswer: "Romolo Augustolo", difficulty: "HARD" },
  { cat: "storia", text: "Come si chiamava la regina d'Egitto amata da Cesare e Antonio?", openAnswer: "Cleopatra", difficulty: "EASY" },
  { cat: "storia", text: "Quale generale cartaginese attraversò le Alpi con gli elefanti?", openAnswer: "Annibale", difficulty: "MEDIUM" },
  { cat: "storia", text: "Come si chiamava il cane di Ulisse nell'Odissea?", openAnswer: "Argo", difficulty: "HARD" },

  // Geografia (9)
  { cat: "geo", text: "Come si chiama il fiume che attraversa Londra?", openAnswer: "Tamigi", difficulty: "EASY" },
  { cat: "geo", text: "Qual è la capitale del Marocco?", openAnswer: "Rabat", difficulty: "MEDIUM" },
  { cat: "geo", text: "In che paese si trova la regione della Patagonia?", openAnswer: "Argentina e Cile", difficulty: "MEDIUM" },
  { cat: "geo", text: "Qual è il vulcano attivo più alto d'Europa?", openAnswer: "Etna", difficulty: "MEDIUM" },
  { cat: "geo", text: "Come si chiama il deserto più grande dell'Asia?", openAnswer: "Gobi", difficulty: "MEDIUM" },
  { cat: "geo", text: "Qual è l'unico continente su cui non vivono api?", openAnswer: "Antartide", difficulty: "HARD" },
  { cat: "geo", text: "Qual è la capitale della Thailandia?", openAnswer: "Bangkok", difficulty: "EASY" },
  { cat: "geo", text: "Quale isola italiana è la più grande?", openAnswer: "Sicilia", difficulty: "EASY" },
  { cat: "geo", text: "In quale paese si trova il Monte Kilimangiaro?", openAnswer: "Tanzania", difficulty: "MEDIUM" },

  // Scienza (9)
  { cat: "scienza", text: "Come si chiama il processo con cui l'acqua diventa ghiaccio?", openAnswer: "Solidificazione", difficulty: "EASY" },
  { cat: "scienza", text: "Qual è il nome dell'osso della mandibola?", openAnswer: "Mandibola", difficulty: "EASY" },
  { cat: "scienza", text: "Come si chiama il più grande organo del corpo umano?", openAnswer: "Pelle", difficulty: "EASY" },
  { cat: "scienza", text: "Chi è considerato il padre della genetica?", openAnswer: "Gregor Mendel", difficulty: "MEDIUM" },
  { cat: "scienza", text: "Qual è il nome scientifico del leone?", openAnswer: "Panthera leo", difficulty: "HARD" },
  { cat: "scienza", text: "Come si chiama la galassia più vicina alla Via Lattea?", openAnswer: "Andromeda", difficulty: "MEDIUM" },
  { cat: "scienza", text: "Qual è l'elemento con numero atomico 1?", openAnswer: "Idrogeno", difficulty: "EASY" },
  { cat: "scienza", text: "Come si chiama l'unità di misura della temperatura nel SI?", openAnswer: "Kelvin", difficulty: "MEDIUM" },
  { cat: "scienza", text: "Chi scoprì la gravità secondo la celebre leggenda della mela?", openAnswer: "Isaac Newton", difficulty: "EASY" },

  // Arte e Cultura (8)
  { cat: "arte", text: "Chi scrisse 'Il Nome della Rosa'?", openAnswer: "Umberto Eco", difficulty: "MEDIUM" },
  { cat: "arte", text: "Chi compose 'Le Quattro Stagioni'?", openAnswer: "Antonio Vivaldi", difficulty: "EASY" },
  { cat: "arte", text: "Chi dipinse 'L'Ultima Cena' a Milano?", openAnswer: "Leonardo da Vinci", difficulty: "EASY" },
  { cat: "arte", text: "Chi scrisse 'La Metamorfosi'?", openAnswer: "Franz Kafka", difficulty: "MEDIUM" },
  { cat: "arte", text: "Chi dipinse 'Impressione, levar del sole'?", openAnswer: "Claude Monet", difficulty: "MEDIUM" },
  { cat: "arte", text: "Qual è il cognome di Dante, autore della Divina Commedia?", openAnswer: "Alighieri", difficulty: "EASY" },
  { cat: "arte", text: "Chi scrisse 'Il Barone Rampante'?", openAnswer: "Italo Calvino", difficulty: "MEDIUM" },
  { cat: "arte", text: "Chi compose l'opera 'Rigoletto'?", openAnswer: "Giuseppe Verdi", difficulty: "MEDIUM" },

  // Sport (8)
  { cat: "sport", text: "Chi ha vinto il Tour de France del 2024?", openAnswer: "Tadej Pogačar", difficulty: "HARD" },
  { cat: "sport", text: "Qual è il nome dello stadio dei New York Yankees?", openAnswer: "Yankee Stadium", difficulty: "MEDIUM" },
  { cat: "sport", text: "Chi è stato soprannominato 'Black Mamba'?", openAnswer: "Kobe Bryant", difficulty: "EASY" },
  { cat: "sport", text: "Qual è il soprannome di Francesco Totti?", openAnswer: "Il Pupone", difficulty: "MEDIUM" },
  { cat: "sport", text: "In quale città ha sede la UEFA?", openAnswer: "Nyon (Svizzera)", difficulty: "HARD" },
  { cat: "sport", text: "Qual è il soprannome di Usain Bolt?", openAnswer: "Lightning Bolt", difficulty: "MEDIUM" },
  { cat: "sport", text: "Chi ha allenato la Nazionale italiana di calcio campione del mondo 2006?", openAnswer: "Marcello Lippi", difficulty: "MEDIUM" },
  { cat: "sport", text: "Qual è il nome della coppa della Champions League?", openAnswer: "Coppa dei Campioni (Coupe des clubs champions)", difficulty: "HARD" },

  // Cinema (7)
  { cat: "cinema", text: "Come si chiama il maggiordomo di Batman?", openAnswer: "Alfred", difficulty: "EASY" },
  { cat: "cinema", text: "Qual è il nome dell'astronave di Star Trek?", openAnswer: "Enterprise", difficulty: "EASY" },
  { cat: "cinema", text: "Come si chiama il cane di Indiana Jones?", openAnswer: "Indiana", difficulty: "HARD" },
  { cat: "cinema", text: "Chi dirige il film 'Gladiator'?", openAnswer: "Ridley Scott", difficulty: "MEDIUM" },
  { cat: "cinema", text: "Qual è il titolo originale del film 'Il Padrino'?", openAnswer: "The Godfather", difficulty: "EASY" },
  { cat: "cinema", text: "Come si chiama la sorellina di Elsa in Frozen?", openAnswer: "Anna", difficulty: "EASY" },
  { cat: "cinema", text: "Qual è il nome dello scuolabus magico de 'The Magic School Bus'? (Ms...)", openAnswer: "Ms. Frizzle", difficulty: "HARD" },
];

// ---------- WORD_COMPLETION (50) ----------
// La parola (openAnswer) è la risposta corretta, wordTemplate ha _ per le lettere nascoste.
const WORD: { cat: keyof typeof CATS; text: string; word: string; template: string; difficulty: Diff }[] = [
  // Storia (9)
  { cat: "storia", text: "Imperatore romano che fece costruire il Colosseo",                 word: "VESPASIANO", template: "V_SP_SI_NO",    difficulty: "HARD" },
  { cat: "storia", text: "Battaglia del 1815 in cui Napoleone fu sconfitto",                 word: "WATERLOO",   template: "W_T_RL_O",      difficulty: "MEDIUM" },
  { cat: "storia", text: "Regina d'Egitto amata da Cesare e Antonio",                        word: "CLEOPATRA",  template: "C_E_P_TRA",     difficulty: "EASY" },
  { cat: "storia", text: "Città sepolta dall'eruzione del Vesuvio nel 79 d.C.",              word: "POMPEI",     template: "P_MP_I",        difficulty: "EASY" },
  { cat: "storia", text: "Capo dei rivoluzionari russi del 1917",                            word: "LENIN",      template: "L_N_N",         difficulty: "MEDIUM" },
  { cat: "storia", text: "Guerra tra Nord e Sud degli Stati Uniti",                          word: "SECESSIONE", template: "S_C_SS_ONE",    difficulty: "HARD" },
  { cat: "storia", text: "Generale cartaginese che attraversò le Alpi",                      word: "ANNIBALE",   template: "A_N_B_LE",      difficulty: "MEDIUM" },
  { cat: "storia", text: "Rivoluzione iniziata nel 1789",                                    word: "FRANCESE",   template: "F_A_C_SE",      difficulty: "EASY" },
  { cat: "storia", text: "Grande civiltà precolombiana del Sud America",                     word: "INCA",       template: "_NC_",          difficulty: "EASY" },

  // Geografia (9)
  { cat: "geo", text: "Capitale della Francia",                                              word: "PARIGI",     template: "P_R_GI",        difficulty: "EASY" },
  { cat: "geo", text: "Capitale della Germania",                                             word: "BERLINO",    template: "B_RL_NO",       difficulty: "EASY" },
  { cat: "geo", text: "Capitale della Spagna",                                               word: "MADRID",     template: "M_DR_D",        difficulty: "EASY" },
  { cat: "geo", text: "Capitale dell'Argentina",                                             word: "BUENOSAIRES",template: "B_EN_S_IR_S",   difficulty: "HARD" },
  { cat: "geo", text: "Fiume più lungo del mondo",                                           word: "AMAZZONI",   template: "_M_Z_O_I",      difficulty: "MEDIUM" },
  { cat: "geo", text: "Catena montuosa in Nepal",                                            word: "HIMALAYA",   template: "H_M_L_YA",      difficulty: "MEDIUM" },
  { cat: "geo", text: "Capitale della Russia",                                               word: "MOSCA",      template: "M_SC_",         difficulty: "EASY" },
  { cat: "geo", text: "Capitale della Grecia",                                               word: "ATENE",      template: "_T_NE",         difficulty: "EASY" },
  { cat: "geo", text: "Isola italiana sede di Cagliari",                                     word: "SARDEGNA",   template: "S_RD_GN_",      difficulty: "MEDIUM" },

  // Scienza (9)
  { cat: "scienza", text: "Pianeta rosso del sistema solare",                                word: "MARTE",      template: "M_RT_",         difficulty: "EASY" },
  { cat: "scienza", text: "Gas più abbondante nell'atmosfera terrestre",                     word: "AZOTO",      template: "_Z_TO",         difficulty: "MEDIUM" },
  { cat: "scienza", text: "Metallo giallo e prezioso, simbolo Au",                           word: "ORO",        template: "_R_",           difficulty: "EASY" },
  { cat: "scienza", text: "Pianeta con gli anelli più visibili",                             word: "SATURNO",    template: "S_T_RN_",       difficulty: "EASY" },
  { cat: "scienza", text: "Scienziato della teoria della relatività",                        word: "EINSTEIN",   template: "_INST_IN",      difficulty: "MEDIUM" },
  { cat: "scienza", text: "Cellula sessuale femminile",                                      word: "OVULO",      template: "_V_L_",         difficulty: "MEDIUM" },
  { cat: "scienza", text: "Liquido rosso che scorre nelle vene",                             word: "SANGUE",     template: "S_NG_E",        difficulty: "EASY" },
  { cat: "scienza", text: "Organo che filtra il sangue e produce urina",                     word: "RENE",       template: "R_N_",          difficulty: "EASY" },
  { cat: "scienza", text: "Elemento chimico necessario alla combustione",                    word: "OSSIGENO",   template: "O_S_G_NO",      difficulty: "MEDIUM" },

  // Arte e Cultura (8)
  { cat: "arte", text: "Autore della Divina Commedia",                                       word: "DANTE",      template: "D_NT_",         difficulty: "EASY" },
  { cat: "arte", text: "Autore della Gioconda",                                              word: "LEONARDO",   template: "L_ON_RD_",      difficulty: "MEDIUM" },
  { cat: "arte", text: "Pittore olandese autore de 'La Notte Stellata'",                     word: "VANGOGH",    template: "V_NG_GH",       difficulty: "MEDIUM" },
  { cat: "arte", text: "Autore de 'I Promessi Sposi'",                                       word: "MANZONI",    template: "M_NZ_NI",       difficulty: "MEDIUM" },
  { cat: "arte", text: "Pittore spagnolo famoso per 'Guernica'",                             word: "PICASSO",    template: "P_C_SS_",       difficulty: "MEDIUM" },
  { cat: "arte", text: "Compositore tedesco della Nona Sinfonia",                            word: "BEETHOVEN",  template: "B_ET_OV_N",     difficulty: "HARD" },
  { cat: "arte", text: "Compositore austriaco del Requiem",                                  word: "MOZART",     template: "M_Z_RT",        difficulty: "MEDIUM" },
  { cat: "arte", text: "Autore di 'Romeo e Giulietta'",                                      word: "SHAKESPEARE",template: "SH_K_SP_AR_",   difficulty: "HARD" },

  // Sport (8)
  { cat: "sport", text: "Stella argentina del calcio, campione del mondo 2022",              word: "MESSI",      template: "M_SS_",         difficulty: "EASY" },
  { cat: "sport", text: "Fenomeno portoghese del calcio, CR7",                               word: "RONALDO",    template: "R_N_LD_",       difficulty: "EASY" },
  { cat: "sport", text: "Campione giamaicano dei 100 metri",                                 word: "BOLT",       template: "B_L_",          difficulty: "EASY" },
  { cat: "sport", text: "Sport con canestro",                                                word: "BASKET",     template: "B_SK_T",        difficulty: "EASY" },
  { cat: "sport", text: "Torneo di tennis a Parigi",                                         word: "ROLANDGARROS",template: "R_L_ND_G_RR_S", difficulty: "HARD" },
  { cat: "sport", text: "Sport olimpico praticato in piscina",                               word: "NUOTO",      template: "_U_T_",         difficulty: "EASY" },
  { cat: "sport", text: "Sport della Ferrari",                                               word: "FORMULA1",   template: "F_RM_L_1",      difficulty: "MEDIUM" },
  { cat: "sport", text: "Campione brasiliano considerato il 'Re del calcio'",                word: "PELE",       template: "P_L_",          difficulty: "EASY" },

  // Cinema (7)
  { cat: "cinema", text: "Iconico regista di 'Jurassic Park' e 'E.T.'",                     word: "SPIELBERG",  template: "SP_ELB_RG",     difficulty: "MEDIUM" },
  { cat: "cinema", text: "Attore di Forrest Gump e Cast Away",                               word: "HANKS",      template: "H_NK_",         difficulty: "MEDIUM" },
  { cat: "cinema", text: "Attore del Titanic, premio Oscar per Revenant",                    word: "DICAPRIO",   template: "D_C_PR_O",      difficulty: "MEDIUM" },
  { cat: "cinema", text: "Mago protagonista della saga di J.K. Rowling",                     word: "HARRYPOTTER",template: "H_RR_P_TT_R",   difficulty: "EASY" },
  { cat: "cinema", text: "Cavaliere oscuro di Gotham City",                                  word: "BATMAN",     template: "B_TM_N",        difficulty: "EASY" },
  { cat: "cinema", text: "Supereroe con scudo a stelle e strisce",                           word: "CAPITANAMERICA", template: "C_P_T_NAM_R_C_", difficulty: "HARD" },
  { cat: "cinema", text: "Regista di Pulp Fiction e Kill Bill",                              word: "TARANTINO",  template: "T_R_NT_NO",     difficulty: "MEDIUM" },
];

// ---------- IMAGE_GUESS (50) ----------
// imageUrl usa URL Wikimedia Commons Special:FilePath che redirige all'immagine corrente.
// openAnswer è il nome del luogo/opera (riferimento per l'admin).
const wiki = (filename: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;

const IMAGE: { cat: keyof typeof CATS; text: string; openAnswer: string; imageUrl: string; difficulty: Diff }[] = [
  // Geografia - monumenti nel mondo (20)
  { cat: "geo", text: "Quale monumento è nell'immagine?", openAnswer: "Torre Eiffel, Parigi",   imageUrl: wiki("Tour_Eiffel_Wikimedia_Commons_(cropped).jpg"), difficulty: "EASY" },
  { cat: "geo", text: "Di che monumento si tratta?",      openAnswer: "Colosseo, Roma",          imageUrl: wiki("Colosseo_2020.jpg"),                           difficulty: "EASY" },
  { cat: "geo", text: "Quale statua è raffigurata?",      openAnswer: "Statua della Libertà, New York", imageUrl: wiki("Statue_of_Liberty_7.jpg"),              difficulty: "EASY" },
  { cat: "geo", text: "Che famoso orologio inglese è questo?", openAnswer: "Big Ben, Londra",    imageUrl: wiki("Clock_Tower_-_Palace_of_Westminster,_London_-_September_2006.jpg"), difficulty: "EASY" },
  { cat: "geo", text: "Quale mausoleo è mostrato?",       openAnswer: "Taj Mahal, India",        imageUrl: wiki("Taj_Mahal_(Edited).jpeg"),                      difficulty: "EASY" },
  { cat: "geo", text: "Quale antica città inca si vede?", openAnswer: "Machu Picchu, Perù",      imageUrl: wiki("80_-_Machu_Picchu_-_Juin_2009_-_edit.2.jpg"),  difficulty: "MEDIUM" },
  { cat: "geo", text: "Che sito archeologico è questo?",  openAnswer: "Piramidi di Giza, Egitto", imageUrl: wiki("All_Gizah_Pyramids.jpg"),                     difficulty: "EASY" },
  { cat: "geo", text: "Che città rocciosa giordana è?",   openAnswer: "Petra, Giordania",         imageUrl: wiki("Al_Khazneh_Petra_edit_2.jpg"),                difficulty: "MEDIUM" },
  { cat: "geo", text: "Che statua sorge su Rio de Janeiro?", openAnswer: "Cristo Redentore, Rio", imageUrl: wiki("Christ_on_Corcovado_mountain.JPG"),            difficulty: "EASY" },
  { cat: "geo", text: "Quale torre pende in Italia?",     openAnswer: "Torre di Pisa",            imageUrl: wiki("Leaning_Tower_of_Pisa_(April_2012).jpg"),     difficulty: "EASY" },
  { cat: "geo", text: "Che chiesa di Barcellona è in foto?", openAnswer: "Sagrada Família",       imageUrl: wiki("Sagrada_Familia_01.jpg"),                      difficulty: "MEDIUM" },
  { cat: "geo", text: "Quale antico tempio greco è mostrato?", openAnswer: "Partenone, Atene",    imageUrl: wiki("The_Parthenon_in_Athens.jpg"),                difficulty: "MEDIUM" },
  { cat: "geo", text: "Cosa raffigura questo cerchio di pietre?", openAnswer: "Stonehenge",       imageUrl: wiki("Stonehenge2007_07_30.jpg"),                    difficulty: "MEDIUM" },
  { cat: "geo", text: "Quale teatro sull'acqua è questo?", openAnswer: "Sydney Opera House",      imageUrl: wiki("Sydney_Opera_House_Sails.jpg"),                difficulty: "MEDIUM" },
  { cat: "geo", text: "Quale famoso ponte rosso è questo?", openAnswer: "Golden Gate Bridge",    imageUrl: wiki("GoldenGateBridge-001.jpg"),                    difficulty: "EASY" },
  { cat: "geo", text: "Quale monumento presidenziale è?",  openAnswer: "Monte Rushmore",          imageUrl: wiki("Mount_Rushmore_National_Memorial.jpg"),        difficulty: "MEDIUM" },
  { cat: "geo", text: "Quale muraglia è questa?",          openAnswer: "Grande Muraglia Cinese", imageUrl: wiki("The_Great_Wall_of_China_at_Jinshanling-edit.jpg"), difficulty: "EASY" },
  { cat: "geo", text: "Quale piazza veneziana è in foto?", openAnswer: "Piazza San Marco, Venezia", imageUrl: wiki("Saint_Mark's_Square_from_the_Doge's_Palace.JPG"), difficulty: "MEDIUM" },
  { cat: "geo", text: "Di quale palazzo di Mosca parliamo?", openAnswer: "Cattedrale di San Basilio / Cremlino", imageUrl: wiki("Moscow_July_2011-7a.jpg"), difficulty: "HARD" },
  { cat: "geo", text: "Quali statue sull'isola di Pasqua?", openAnswer: "Moai",                    imageUrl: wiki("Moai_Rano_raraku.jpg"),                        difficulty: "MEDIUM" },

  // Arte & Cultura - opere d'arte (10)
  { cat: "arte", text: "Quale celebre dipinto è questo?",  openAnswer: "La Gioconda (Monna Lisa)", imageUrl: wiki("Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg"), difficulty: "EASY" },
  { cat: "arte", text: "Di chi è 'La Notte Stellata' in foto?", openAnswer: "Vincent van Gogh",   imageUrl: wiki("Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"), difficulty: "MEDIUM" },
  { cat: "arte", text: "Quale dipinto di Munch è questo?", openAnswer: "L'Urlo",                   imageUrl: wiki("The_Scream.jpg"),                              difficulty: "EASY" },
  { cat: "arte", text: "Quale scultura di Michelangelo?",  openAnswer: "David",                    imageUrl: wiki("'David'_by_Michelangelo_JBU0001.JPG"),         difficulty: "EASY" },
  { cat: "arte", text: "Quale celebre affresco è mostrato?", openAnswer: "Creazione di Adamo",    imageUrl: wiki("Michelangelo_-_Creation_of_Adam_(cropped).jpg"), difficulty: "MEDIUM" },
  { cat: "arte", text: "Quale dipinto di Botticelli è?",   openAnswer: "La nascita di Venere",     imageUrl: wiki("Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg"), difficulty: "MEDIUM" },
  { cat: "arte", text: "Di chi è 'Il Bacio' (1908)?",      openAnswer: "Gustav Klimt",             imageUrl: wiki("Gustav_Klimt_016.jpg"),                         difficulty: "MEDIUM" },
  { cat: "arte", text: "Quale dipinto di Vermeer è?",      openAnswer: "Ragazza con l'orecchino di perla", imageUrl: wiki("1665_Girl_with_a_Pearl_Earring.jpg"),   difficulty: "MEDIUM" },
  { cat: "arte", text: "Quale quadro spagnolo è?",         openAnswer: "Guernica di Picasso",      imageUrl: wiki("Mural_del_Gernika.jpg"),                        difficulty: "HARD" },
  { cat: "arte", text: "Quale scultura di Rodin è?",       openAnswer: "Il Pensatore",             imageUrl: wiki("The_Thinker,_Rodin.jpg"),                       difficulty: "MEDIUM" },

  // Cinema - locandine e scene (8)
  { cat: "cinema", text: "Locandina di quale film?",       openAnswer: "Star Wars",                imageUrl: wiki("Star_Wars_Logo.svg"),                           difficulty: "EASY" },
  { cat: "cinema", text: "Logo di quale saga?",            openAnswer: "Harry Potter",             imageUrl: wiki("Harry_Potter_wordmark.svg"),                    difficulty: "EASY" },
  { cat: "cinema", text: "Logo di quale film Pixar?",      openAnswer: "Toy Story",                imageUrl: wiki("Toy_Story_logo.svg"),                           difficulty: "EASY" },
  { cat: "cinema", text: "Logo di quale casa cinematografica?", openAnswer: "Walt Disney",         imageUrl: wiki("Disney_wordmark.svg"),                          difficulty: "EASY" },
  { cat: "cinema", text: "Di quale franchise è questo logo?", openAnswer: "Marvel",                imageUrl: wiki("Marvel_Logo.svg"),                              difficulty: "EASY" },
  { cat: "cinema", text: "Emblema di quale universo?",     openAnswer: "DC Comics",                imageUrl: wiki("DC_Comics_logo.svg"),                           difficulty: "EASY" },
  { cat: "cinema", text: "Logo di quale servizio di streaming?", openAnswer: "Netflix",            imageUrl: wiki("Netflix_2015_logo.svg"),                        difficulty: "EASY" },
  { cat: "cinema", text: "Riconosci lo studio di animazione?", openAnswer: "Pixar",                imageUrl: wiki("Pixar_logo.svg"),                               difficulty: "EASY" },

  // Sport - bandiere e loghi (6)
  { cat: "sport", text: "Simbolo di quale evento mondiale?", openAnswer: "Giochi Olimpici",        imageUrl: wiki("Olympic_rings_without_rims.svg"),               difficulty: "EASY" },
  { cat: "sport", text: "Logo di quale federazione calcistica?", openAnswer: "FIFA",               imageUrl: wiki("FIFA_logo_without_slogan.svg"),                 difficulty: "MEDIUM" },
  { cat: "sport", text: "Logo di quale torneo di tennis?",    openAnswer: "Wimbledon",             imageUrl: wiki("Wimbledon_Championships_Logo.svg"),             difficulty: "MEDIUM" },
  { cat: "sport", text: "Logo di quale lega NBA/basket?",     openAnswer: "NBA",                   imageUrl: wiki("National_Basketball_Association_logo.svg"),     difficulty: "EASY" },
  { cat: "sport", text: "Logo di quale lega americana di football?", openAnswer: "NFL",            imageUrl: wiki("National_Football_League_logo.svg"),            difficulty: "MEDIUM" },
  { cat: "sport", text: "Logo di quale categoria automobilistica?", openAnswer: "Formula 1",       imageUrl: wiki("F1.svg"),                                       difficulty: "MEDIUM" },

  // Scienza - bandiere e loghi scientifici (3)
  { cat: "scienza", text: "Logo di quale agenzia spaziale?",  openAnswer: "NASA",                  imageUrl: wiki("NASA_logo.svg"),                                difficulty: "EASY" },
  { cat: "scienza", text: "Logo di quale agenzia spaziale?",  openAnswer: "ESA",                   imageUrl: wiki("ESA_logo.svg"),                                 difficulty: "MEDIUM" },
  { cat: "scienza", text: "Simbolo di quale radiazione?",     openAnswer: "Radiazioni (radioattività)", imageUrl: wiki("Radiation_warning_symbol.svg"),            difficulty: "EASY" },

  // Storia - bandiere storiche (3)
  { cat: "storia", text: "Bandiera di quale paese?",          openAnswer: "Italia",                 imageUrl: wiki("Flag_of_Italy.svg"),                            difficulty: "EASY" },
  { cat: "storia", text: "Bandiera di quale paese?",          openAnswer: "Francia",                imageUrl: wiki("Flag_of_France.svg"),                           difficulty: "EASY" },
  { cat: "storia", text: "Bandiera di quale paese?",          openAnswer: "Giappone",               imageUrl: wiki("Flag_of_Japan.svg"),                            difficulty: "EASY" },
];

// ============================================================
async function main() {
  console.log("🌱 Seed tipi: OPEN_ANSWER, WORD_COMPLETION, IMAGE_GUESS\n");

  // Upsert tutte le categorie
  const catMap = new Map<string, string>();
  for (const key of Object.keys(CATS)) {
    const c = CATS[key];
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, color: c.color },
      create: c,
    });
    catMap.set(key, row.id);
  }

  let createdOpen = 0, skipOpen = 0;
  let createdWord = 0, skipWord = 0;
  let createdImg  = 0, skipImg  = 0;

  // --- OPEN_ANSWER ---
  for (const q of OPEN) {
    const categoryId = catMap.get(q.cat)!;
    const exists = await prisma.question.findFirst({
      where: { categoryId, text: q.text, type: "OPEN_ANSWER" },
    });
    if (exists) { skipOpen++; continue; }
    await prisma.question.create({
      data: {
        text: q.text,
        type: "OPEN_ANSWER",
        difficulty: q.difficulty,
        timeLimit: 30,
        categoryId,
        openAnswer: q.openAnswer,
      },
    });
    createdOpen++;
  }
  console.log(`✏️  OPEN_ANSWER     — create ${createdOpen}, saltate ${skipOpen} (${OPEN.length} totali)`);

  // --- WORD_COMPLETION ---
  for (const q of WORD) {
    const categoryId = catMap.get(q.cat)!;
    const exists = await prisma.question.findFirst({
      where: { categoryId, text: q.text, type: "WORD_COMPLETION" },
    });
    if (exists) { skipWord++; continue; }
    await prisma.question.create({
      data: {
        text: q.text,
        type: "WORD_COMPLETION",
        difficulty: q.difficulty,
        timeLimit: 25,
        categoryId,
        wordTemplate: q.template,
        answers: { create: [{ text: q.word, isCorrect: true, order: 0 }] },
      },
    });
    createdWord++;
  }
  console.log(`🔡 WORD_COMPLETION — create ${createdWord}, saltate ${skipWord} (${WORD.length} totali)`);

  // --- IMAGE_GUESS ---
  for (const q of IMAGE) {
    const categoryId = catMap.get(q.cat)!;
    const exists = await prisma.question.findFirst({
      where: { categoryId, text: q.text, type: "IMAGE_GUESS", imageUrl: q.imageUrl },
    });
    if (exists) { skipImg++; continue; }
    await prisma.question.create({
      data: {
        text: q.text,
        type: "IMAGE_GUESS",
        difficulty: q.difficulty,
        timeLimit: 30,
        categoryId,
        imageUrl: q.imageUrl,
        mediaType: "image",
        openAnswer: q.openAnswer,
      },
    });
    createdImg++;
  }
  console.log(`🗺️  IMAGE_GUESS     — create ${createdImg}, saltate ${skipImg} (${IMAGE.length} totali)`);

  const total = await prisma.question.count();
  const byType = await prisma.question.groupBy({
    by: ["type"],
    _count: { _all: true },
  });

  console.log("\n📊 Conteggio domande per tipo nel DB:");
  byType.forEach((b) => console.log(`   ${b.type}: ${b._count._all}`));
  console.log(`\n✅ Totale nel DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
