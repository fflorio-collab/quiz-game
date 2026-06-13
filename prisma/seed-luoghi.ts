/**
 * Seed "Indovina il luogo" — 50 domande IMAGE_GUESS con foto reali da Wikimedia.
 * NON cancella nulla. Upsert categoria + skip domande già presenti (per imageUrl).
 * Lancialo con: `npm run db:seed-luoghi`
 *
 * Ogni imageUrl usa l'URL stabile Wikimedia Commons Special:FilePath che redirige
 * sempre al file corrente. I nomi dei file sono stati risolti dall'immagine
 * principale (lead image) dell'articolo Wikipedia di ciascun luogo e verificati
 * uno per uno (HTTP 200 + content-type image; i casi dubbi controllati a vista).
 * Se qualche immagine smettesse di caricare, è correggibile dal pannello admin.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Diff = "EASY" | "MEDIUM" | "HARD";

// Categoria Geografia (coerente con prisma/seed-types.ts)
const GEO = { name: "Geografia", slug: "geografia", icon: "🌍", color: "#10b981" };

const wiki = (filename: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;

const LUOGHI: { text: string; openAnswer: string; imageUrl: string; difficulty: Diff }[] = [
  // ---- Facili: icone mondiali (12) ----
  { text: "Quale celebre porta monumentale di Berlino è questa?", openAnswer: "Porta di Brandeburgo, Berlino", imageUrl: wiki("Brandenburger_Tor_abends.jpg"), difficulty: "EASY" },
  { text: "Quale grattacielo, il più alto del mondo, è questo?", openAnswer: "Burj Khalifa, Dubai", imageUrl: wiki("Burj_Khalifa_(worlds_tallest_building)_and_the_Dubai_skyline_(25781049892).jpg"), difficulty: "EASY" },
  { text: "Quale vulcano simbolo del Giappone è raffigurato?", openAnswer: "Monte Fuji, Giappone", imageUrl: wiki("View_of_Mount_Fuji_from_Ōwakudani_20211202.jpg"), difficulty: "EASY" },
  { text: "Quali celebri cascate al confine USA-Canada sono queste?", openAnswer: "Cascate del Niagara", imageUrl: wiki("3Falls_Niagara.jpg"), difficulty: "EASY" },
  { text: "Quale immenso canyon degli Stati Uniti è questo?", openAnswer: "Grand Canyon, Arizona", imageUrl: wiki("0070 Grand Canyon Mather Point Landmark Dedication 10 25 2010 (5122569236).jpg"), difficulty: "EASY" },
  { text: "Quale ponte levatoio di Londra è questo?", openAnswer: "Tower Bridge, Londra", imageUrl: wiki("Tower_Bridge_at_Dawn.jpg"), difficulty: "EASY" },
  { text: "Quale arco monumentale di Parigi è raffigurato?", openAnswer: "Arco di Trionfo, Parigi", imageUrl: wiki("Arc_de_Triomphe,_Paris_21_October_2010.jpg"), difficulty: "EASY" },
  { text: "Quale storico grattacielo di New York è questo?", openAnswer: "Empire State Building, New York", imageUrl: wiki("Empire_State_Building_(aerial_view).jpg"), difficulty: "EASY" },
  { text: "Qual è questa vetta, la montagna più alta del mondo?", openAnswer: "Everest", imageUrl: wiki("Mt._Everest_from_Gokyo_Ri_November_5,_2012.jpg"), difficulty: "EASY" },
  { text: "Quale celebre fontana barocca di Roma è questa?", openAnswer: "Fontana di Trevi, Roma", imageUrl: wiki("Trevi_Fountain_-_Roma.jpg"), difficulty: "EASY" },
  { text: "Quale residenza presidenziale statunitense è questa?", openAnswer: "Casa Bianca, Washington", imageUrl: wiki("White_House_north_and_south_sides.jpg"), difficulty: "EASY" },
  { text: "Quale celebre scritta su una collina della California è questa?", openAnswer: "Hollywood, Los Angeles", imageUrl: wiki("Hollywood_sign_(8485145044).jpg"), difficulty: "EASY" },

  // ---- Medie: monumenti e luoghi noti (20) ----
  { text: "Quale fiabesco castello bavarese è questo?", openAnswer: "Castello di Neuschwanstein, Germania", imageUrl: wiki("Schloss_Neuschwanstein_2013.jpg"), difficulty: "MEDIUM" },
  { text: "Quale celebre montagna piramidale delle Alpi è questa?", openAnswer: "Cervino (Matterhorn)", imageUrl: wiki("Matterhorn_from_Domhütte_-_2.jpg"), difficulty: "MEDIUM" },
  { text: "Quale grande tempio cambogiano è raffigurato?", openAnswer: "Angkor Wat, Cambogia", imageUrl: wiki("Angkor_Wat.jpg"), difficulty: "MEDIUM" },
  { text: "Quale piramide a gradoni della civiltà maya è questa?", openAnswer: "Chichén Itzá, Messico", imageUrl: wiki("Chichen_Itza_3.jpg"), difficulty: "MEDIUM" },
  { text: "Quale grande edificio a cupola di Istanbul è questo?", openAnswer: "Santa Sofia, Istanbul", imageUrl: wiki("Hagia_Sophia_(228968325).jpeg"), difficulty: "MEDIUM" },
  { text: "Quale isola-abbazia sulla costa francese è questa?", openAnswer: "Mont-Saint-Michel, Francia", imageUrl: wiki("Mont-Saint-Michel_vu_du_ciel.jpg"), difficulty: "MEDIUM" },
  { text: "Quale palazzo reale di Londra è questo?", openAnswer: "Buckingham Palace, Londra", imageUrl: wiki("Buckingham_Palace_London_Morning_2020_01_(cropped).jpg"), difficulty: "MEDIUM" },
  { text: "Quale grande monolite roccioso australiano è questo?", openAnswer: "Uluru (Ayers Rock), Australia", imageUrl: wiki("ULURU.jpg"), difficulty: "MEDIUM" },
  { text: "Quale montagna innevata, la più alta d'Africa, è questa?", openAnswer: "Kilimangiaro, Tanzania", imageUrl: wiki("Kilimanjaro_from_Amboseli.jpg"), difficulty: "MEDIUM" },
  { text: "Quali torri gemelle di Kuala Lumpur sono queste?", openAnswer: "Petronas Towers, Malesia", imageUrl: wiki("2016 Kuala Lumpur, Petronas Towers (18).jpg"), difficulty: "MEDIUM" },
  { text: "Quale hotel di Singapore con piscina sul tetto è questo?", openAnswer: "Marina Bay Sands, Singapore", imageUrl: wiki("Marina_Bay_Sands_(I).jpg"), difficulty: "MEDIUM" },
  { text: "Quale immenso palazzo imperiale di Pechino è questo?", openAnswer: "Città Proibita, Pechino", imageUrl: wiki("The_Forbidden_City_-_View_from_Coal_Hill.jpg"), difficulty: "MEDIUM" },
  { text: "Quale esercito di statue di argilla cinese è questo?", openAnswer: "Esercito di terracotta, Xi'an", imageUrl: wiki("51714-Terracota-Army.jpg"), difficulty: "MEDIUM" },
  { text: "Quale grande basilica del Vaticano è questa?", openAnswer: "Basilica di San Pietro, Vaticano", imageUrl: wiki("Basilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg"), difficulty: "MEDIUM" },
  { text: "Quale cattedrale gotica italiana di marmo bianco è questa?", openAnswer: "Duomo di Milano", imageUrl: wiki("Milan_Cathedral_from_Piazza_del_Duomo.jpg"), difficulty: "MEDIUM" },
  { text: "Di quale città è questa cattedrale con la cupola del Brunelleschi?", openAnswer: "Duomo di Firenze", imageUrl: wiki("Cattedrale_di_Santa_Maria_del_Fiore_–_Il_Duomo_di_Firenze.jpg"), difficulty: "MEDIUM" },
  { text: "Quale antico tempio romano con grande cupola e oculo è questo?", openAnswer: "Pantheon, Roma", imageUrl: wiki("Pantheon_(Rome)_-_Right_side_and_front.jpg"), difficulty: "MEDIUM" },
  { text: "Quale grande ponte ad arco di Sydney è questo?", openAnswer: "Sydney Harbour Bridge", imageUrl: wiki("Sydney_Harbour_Bridge-16_October_2025.jpg"), difficulty: "MEDIUM" },
  { text: "Quale memoriale neoclassico di Washington è questo?", openAnswer: "Lincoln Memorial, Washington", imageUrl: wiki("Aerial_view_of_Lincoln_Memorial_-_east_side_EDIT.jpeg"), difficulty: "MEDIUM" },
  { text: "Quale grande arco d'acciaio di St. Louis è questo?", openAnswer: "Gateway Arch, St. Louis", imageUrl: wiki("Gateway Arch, St. Louis.jpg"), difficulty: "MEDIUM" },

  // ---- Difficili: luoghi meno scontati (18) ----
  { text: "Quale montagna dalla cima piatta sopra Città del Capo è questa?", openAnswer: "Table Mountain, Sudafrica", imageUrl: wiki("Table_Mountain_DanieVDM.jpg"), difficulty: "HARD" },
  { text: "Quali enormi cascate al confine Zambia-Zimbabwe sono queste?", openAnswer: "Cascate Vittoria", imageUrl: wiki("Cataratas_Victoria,_Zambia-Zimbabue,_2018-07-27,_DD_04.jpg"), difficulty: "HARD" },
  { text: "Quali cascate al confine Brasile-Argentina sono queste?", openAnswer: "Cascate dell'Iguazú", imageUrl: wiki("Iguazu_Cataratas2.jpg"), difficulty: "HARD" },
  { text: "Quale immensa distesa di sale della Bolivia è questa?", openAnswer: "Salar de Uyuni, Bolivia", imageUrl: wiki("Salar_Uyuni_au01.jpg"), difficulty: "HARD" },
  { text: "Quale parco croato di laghi e cascate a terrazze è questo?", openAnswer: "Laghi di Plitvice, Croazia", imageUrl: wiki("View_in_Plitvice_Lakes_National_Park.jpg"), difficulty: "HARD" },
  { text: "Quale palazzo-fortezza moresco di Granada è questo?", openAnswer: "Alhambra, Granada", imageUrl: wiki("Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg"), difficulty: "HARD" },
  { text: "Quale coloratissimo parco progettato da Gaudí a Barcellona è questo?", openAnswer: "Park Güell, Barcellona", imageUrl: wiki("Parc_guell_-_panoramio.jpg"), difficulty: "HARD" },
  { text: "Quale struttura a forma di atomo gigante a Bruxelles è questa?", openAnswer: "Atomium, Bruxelles", imageUrl: wiki("Brussels_-_Atomium_2022.jpg"), difficulty: "HARD" },
  { text: "Quale storico ponte pedonale di Praga è questo?", openAnswer: "Ponte Carlo, Praga", imageUrl: wiki("Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg"), difficulty: "HARD" },
  { text: "Quale coloratissimo canale-porto di Copenaghen è questo?", openAnswer: "Nyhavn, Copenaghen", imageUrl: wiki("The_Nyhavn_Canal_3.jpg"), difficulty: "HARD" },
  { text: "Quale grande tempio buddista a terrazze dell'Indonesia è questo?", openAnswer: "Borobudur, Indonesia", imageUrl: wiki("Pradaksina.jpg"), difficulty: "HARD" },
  { text: "Quale tempio dorato sikh di Amritsar è questo?", openAnswer: "Tempio d'Oro, Amritsar", imageUrl: wiki("The_Golden_Temple_of_Amrithsar_7.jpg"), difficulty: "HARD" },
  { text: "Quale arco monumentale sul porto di Mumbai è questo?", openAnswer: "Gateway of India, Mumbai", imageUrl: wiki("Mumbai_03-2016_30_Gateway_of_India.jpg"), difficulty: "HARD" },
  { text: "Quale lussuoso hotel a forma di vela a Dubai è questo?", openAnswer: "Burj Al Arab, Dubai", imageUrl: wiki("Burj Al-Arab (13996844503).jpg"), difficulty: "HARD" },
  { text: "Quale statua-fontana simbolo di Singapore è questa?", openAnswer: "Merlion, Singapore", imageUrl: wiki("Merlión, Marina Bay, Singapur, 2023-08-18, DD 45-47 HDR.jpg"), difficulty: "HARD" },
  { text: "Quale tempio sulle rive del fiume a Bangkok è questo?", openAnswer: "Wat Arun, Bangkok", imageUrl: wiki("เจดีย์ประธานทรงปรางค์วัดอรุณ2.jpg"), difficulty: "HARD" },
  { text: "Quale antica fortezza su un'enorme roccia dello Sri Lanka è questa?", openAnswer: "Sigiriya, Sri Lanka", imageUrl: wiki("Sigiriya_(141688197).jpeg"), difficulty: "HARD" },
  { text: "Quali monasteri costruiti su pinnacoli di roccia in Grecia sono questi?", openAnswer: "Meteore, Grecia", imageUrl: wiki("Meteora's_monastery_2.jpg"), difficulty: "HARD" },
];

async function main() {
  console.log(`🗺️  Seed "Indovina il luogo" — ${LUOGHI.length} domande IMAGE_GUESS\n`);

  const cat = await prisma.category.upsert({
    where: { slug: GEO.slug },
    update: { name: GEO.name, icon: GEO.icon, color: GEO.color },
    create: GEO,
  });

  let created = 0, skipped = 0;
  for (const q of LUOGHI) {
    const exists = await prisma.question.findFirst({
      where: { categoryId: cat.id, type: "IMAGE_GUESS", imageUrl: q.imageUrl },
    });
    if (exists) { skipped++; continue; }
    await prisma.question.create({
      data: {
        text: q.text,
        type: "IMAGE_GUESS",
        difficulty: q.difficulty,
        timeLimit: 30,
        categoryId: cat.id,
        imageUrl: q.imageUrl,
        mediaType: "image",
        openAnswer: q.openAnswer,
      },
    });
    created++;
  }

  console.log(`✅ Indovina il luogo — create ${created}, saltate ${skipped} (${LUOGHI.length} totali)`);

  const totImg = await prisma.question.count({ where: { type: "IMAGE_GUESS" } });
  console.log(`📊 Totale IMAGE_GUESS nel DB: ${totImg}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
