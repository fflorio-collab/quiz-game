# QuizGame — Quiz multiplayer online

Web app full-stack per giocare a quiz a squadre in tempo reale.
Un host crea la partita e riceve un codice. I giocatori entrano dal loro
smartphone inserendo il codice e rispondono in parallelo. Il punteggio
premia risposte corrette e veloci.

Built with **Next.js 14 · TypeScript · Tailwind · Socket.io · Prisma · SQLite/PostgreSQL**.

## Funzionalità

- 🎮 **Partite multiplayer online** via codice a 6 caratteri (tipo Kahoot)
- 📱 **Responsive**: host su schermo grande, player dal telefono
- ⏱️ **Timer real-time** e punteggi in base a velocità di risposta
- 📊 **Classifica globale** persistente per ogni difficoltà
- 🎚️ **3 livelli di difficoltà** (Facile / Medio / Difficile)
- 🗂️ **Categorie miste**: Storia, Geografia, Scienza, Arte, Sport, Cinema
- ⚙️ **Pannello admin** protetto da password per gestire le domande
- 🔊 **Effetti sonori** (opzionali, vedi sezione Audio)

## Struttura del progetto

```
quiz-game/
├── prisma/
│   ├── schema.prisma      # Modello dati (Category, Question, Game, Player, ...)
│   └── seed.ts            # ~25 domande iniziali
├── server/
│   └── socket-server.ts   # Server Socket.io (logica real-time)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Home
│   │   ├── host/                  # Host (crea partita, lobby, gioco)
│   │   ├── join/                  # Player inserisce codice
│   │   ├── play/[gameId]/         # Player risponde
│   │   ├── admin/                 # Gestione domande
│   │   ├── leaderboard/           # Classifica globale
│   │   └── api/                   # API REST (admin, leaderboard)
│   ├── components/                # Componenti condivisi (se servono)
│   ├── lib/                       # Utility, Prisma client, hook Socket.io, audio
│   └── types/                     # Tipi Socket.io condivisi
└── public/sounds/                 # File audio (vedi sezione Audio)
```

## Setup in locale

### 1. Prerequisiti

- **Node.js** ≥ 20
- npm (o pnpm/yarn)

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura le variabili d'ambiente

```bash
cp .env.example .env
```

Apri `.env` e modifica almeno:

```env
DATABASE_URL="file:./dev.db"
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
ADMIN_PASSWORD="la-tua-password-sicura"
```

> Per sviluppo locale **SQLite basta e avanza**. Per la produzione vedi sezione Deploy.

### 4. Inizializza il database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

Questo crea il file SQLite (`prisma/dev.db`) e lo popola con domande di esempio.

### 5. Avvia in modalità sviluppo

```bash
npm run dev
```

Il comando avvia **in parallelo**:
- Next.js su http://localhost:3000
- Socket.io server su http://localhost:3001

### 6. Prova il gioco

1. Apri http://localhost:3000 in un browser (questo sarà l'host)
2. Crea una partita → ottieni il codice
3. Apri un'altra finestra (o usa lo smartphone sulla stessa rete) su
   http://localhost:3000/join e inserisci il codice
4. Dall'host clicca "Avvia partita" quando i giocatori sono entrati

### 7. Accedi all'admin

Vai su http://localhost:3000/admin e usa la password impostata in `.env`
(`ADMIN_PASSWORD`). Da lì puoi aggiungere nuove domande e categorie.

## Testare da più dispositivi in rete locale

Se vuoi che amici sulla tua stessa Wi-Fi possano collegarsi al tuo PC:

1. Scopri l'IP del tuo PC (es. `192.168.1.20`):
   - macOS/Linux: `ifconfig` o `ip addr`
   - Windows: `ipconfig`
2. Nel file `.env` cambia:
   ```env
   NEXT_PUBLIC_SOCKET_URL="http://192.168.1.20:3001"
   ```
3. Avvia Next.js bindando a tutte le interfacce:
   ```bash
   npm run dev:next -- -H 0.0.0.0
   npm run dev:socket
   ```
   (oppure modifica lo script `dev:next` in `package.json`)
4. I tuoi amici si connettono a `http://192.168.1.20:3000/join`

## Audio (opzionale)

Il sistema audio usa **Howler.js** e cerca questi file in `public/sounds/`:

- `tick.mp3` — tick del timer negli ultimi 5 secondi
- `correct.mp3` — risposta corretta
- `wrong.mp3` — risposta sbagliata
- `join.mp3` — nuovo giocatore entrato
- `start.mp3` — partita iniziata
- `finish.mp3` — partita finita

Se i file non sono presenti, l'app continua a funzionare senza audio (fail silent).

### Dove trovare suoni gratuiti

- [freesound.org](https://freesound.org) (CC0)
- [mixkit.co/free-sound-effects/game](https://mixkit.co/free-sound-effects/game)
- [zapsplat.com](https://zapsplat.com)

Basta scaricare 6 file brevi (< 1 sec ciascuno) e metterli nella cartella con i nomi sopra.

## Deploy in produzione

### Opzione A — Railway (tutto in uno, più semplice)

Railway può ospitare sia Next.js che Socket.io e fornisce un database PostgreSQL.

1. Crea un account su [railway.app](https://railway.app)
2. "New project" → "Deploy from GitHub repo" → seleziona il tuo repo
3. Aggiungi un **PostgreSQL** cliccando "+ New" → "Database" → "PostgreSQL"
4. Nel service Next.js, aggiungi le environment variables:
   ```
   DATABASE_URL=<copia da Railway PostgreSQL>
   SOCKET_PORT=3001
   NEXT_PUBLIC_SOCKET_URL=<tuo-dominio-railway>
   ADMIN_PASSWORD=<la-tua-password>
   ```
5. Cambia il `provider` in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
6. Nei comandi di build di Railway:
   - Build: `npm install && npx prisma generate && npx prisma db push && npm run db:seed && npm run build`
   - Start: `npm start`

### Opzione B — Vercel (Next.js) + Railway/Render (Socket.io)

Vercel non supporta WebSocket persistenti, quindi il server Socket.io va su
un altro provider (Railway, Render, Fly.io):

1. **Vercel**: deploya solo la parte Next.js normalmente. Imposta
   `NEXT_PUBLIC_SOCKET_URL` al dominio del server Socket.io.
2. **Railway/Render**: deploya `server/socket-server.ts` come servizio Node
   (usa `tsx server/socket-server.ts` come start). Esponi la porta 3001.
3. Assicurati che entrambi i servizi puntino allo **stesso database**
   PostgreSQL (stessa `DATABASE_URL`).

## Script npm disponibili

| Script | Descrizione |
|--------|-------------|
| `npm run dev` | Avvia Next.js + Socket.io in parallelo |
| `npm run dev:next` | Solo Next.js |
| `npm run dev:socket` | Solo Socket.io server |
| `npm run build` | Genera Prisma client + build Next.js |
| `npm start` | Avvia in produzione |
| `npm run db:push` | Sincronizza schema con il DB |
| `npm run db:seed` | Popola il DB con domande di esempio |
| `npm run db:studio` | Apre Prisma Studio (GUI per il DB) |

## Come funziona il real-time

```
┌─────────┐         ┌──────────────────┐         ┌─────────┐
│  HOST   │◀───────▶│   Socket.io      │◀───────▶│ PLAYER  │
│ (PC)    │   WS    │   + Prisma       │   WS    │ (phone) │
└─────────┘         │   + PostgreSQL   │         └─────────┘
                    └──────────────────┘
```

1. Host chiama `host:create` → viene creata una `Game` con status LOBBY e un codice
2. Player chiama `player:join` con il codice → viene creato in `Player`
3. Host chiama `host:start` → il server estrae domande casuali, le invia tutte
   insieme (solo testo e risposte, niente correct flag) via `game:question`
4. I player rispondono con `player:answer` e il server calcola i punti
   (base + bonus velocità)
5. Quando tutti hanno risposto (o scade il timer), il server rivela con
   `game:reveal` e aggiorna la classifica
6. Alla fine, i top score vengono salvati in `Leaderboard`

## Estensioni suggerite

- 🌐 **Domande multilingua**: aggiungere campo `locale` a `Question`
- 🖼️ **Immagini nelle domande**: aggiungere campo `imageUrl`
- ⏸️ **Power-up**: es. "elimina 2 risposte" (50/50)
- 👥 **Squadre**: raggruppare i player
- 📈 **Statistiche player**: profilo con storico partite
- 📤 **Import/export domande**: da CSV/JSON nel pannello admin

## Troubleshooting

**"Non ci sono abbastanza domande"** quando creo una partita
→ Hai scelto più domande di quelle presenti per quella difficoltà.
Aggiungine dal pannello admin o riduci `totalQuestions`.

**Il player non si connette**
→ Verifica che `NEXT_PUBLIC_SOCKET_URL` sia raggiungibile dal dispositivo
del player (stesso dominio/IP del PC host se sei in LAN).

**Errore Prisma "table does not exist"**
→ Hai saltato `npx prisma db push`. Esegui quello e poi `npm run db:seed`.

## Licenza

MIT — fai quello che vuoi, ma sarebbe carino un credit se lo pubblichi!
