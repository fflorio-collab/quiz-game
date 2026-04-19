# Deploy su Railway

## Prerequisiti
- Account Railway: https://railway.app
- Repository GitHub con il codice (push del progetto)

---

## Step 1 — Crea il progetto su Railway

1. Vai su railway.app → **New Project**
2. Scegli **Deploy from GitHub repo** e seleziona il tuo repo

---

## Step 2 — Aggiungi PostgreSQL

Nel progetto Railway → **+ Add Service** → **Database** → **PostgreSQL**

Railway creerà automaticamente la variabile `DATABASE_URL`.

---

## Step 3 — Configura il servizio Web (Next.js)

Il primo servizio creato usa già il `railway.toml` presente nel repo:
- **Build**: `npm run build`
- **Start**: `npm run start:web`

Aggiungi queste **variabili d'ambiente** nel servizio Web:
| Variabile | Valore |
|-----------|--------|
| `DATABASE_URL` | *(link dalla variabile PostgreSQL)* |
| `NEXT_PUBLIC_SOCKET_URL` | *(URL del servizio Socket — vedi Step 5)* |
| `ADMIN_PASSWORD` | *(password a scelta)* |
| `JWT_SECRET` | *(stringa random di 32+ caratteri)* |
| `NODE_ENV` | `production` |

---

## Step 4 — Aggiungi il servizio Socket.io

Nel progetto → **+ Add Service** → **GitHub Repo** → stesso repo

Poi nel servizio appena creato:
- **Settings → Build Command**: `npm install`
- **Settings → Start Command**: `npm run start:socket`

Aggiungi queste variabili:
| Variabile | Valore |
|-----------|--------|
| `DATABASE_URL` | *(link dalla variabile PostgreSQL)* |
| `ALLOWED_ORIGIN` | *(URL pubblico del servizio Web)* |
| `NODE_ENV` | `production` |

Genera un **Public Domain** per questo servizio (Settings → Networking → Generate Domain).

---

## Step 5 — Collega i due servizi

1. Copia l'URL pubblico del servizio Socket (es. `https://quiz-socket-xxx.railway.app`)
2. Torna al servizio Web → variabili → imposta:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://quiz-socket-xxx.railway.app
   ```
3. Fai **Redeploy** del servizio Web (necessario perché `NEXT_PUBLIC_*` viene baked nel build)

---

## Step 6 — Inizializza il database

Da Railway, nel servizio Web → **Railway Shell** (o usa Railway CLI):
```bash
npx prisma db push
npx tsx prisma/seed.ts   # opzionale: popola le domande iniziali
```

---

## Note importanti

- **Immagini caricate**: Railway usa filesystem effimero — le immagini in `public/uploads` vengono perse al redeploy. Per produzione usa Cloudinary o S3.
- **Dev locale**: dopo aver cambiato schema a PostgreSQL, imposta un `DATABASE_URL` PostgreSQL locale nel file `.env` oppure usa `railway run npm run db:push` per connetterti direttamente al DB di Railway.
