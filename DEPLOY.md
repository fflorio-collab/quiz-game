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
- **Dev locale**: il dev usa SQLite (`.env` con `DATABASE_URL=file:./dev.db`), Railway usa PostgreSQL (env var iniettata da Railway). I due schemi sono [prisma/schema.prisma](./prisma/schema.prisma) (sqlite) e [prisma/schema.production.prisma](./prisma/schema.production.prisma) (postgresql).

---

## Sync schemi & git hooks

I due schemi devono restare allineati (solo il `provider` cambia). Sono presenti automatismi:

### Hook git (attivi via `core.hooksPath = .githooks`)
- `.githooks/pre-push` — blocca push se `schema.production.prisma` non è in sync con `schema.prisma`. Esegue il sync automatico e ti dice di committare.
- `.githooks/post-merge` e `.githooks/post-checkout` — dopo `git pull` o `git checkout`, se `schema.prisma` è cambiato, rigenera il client Prisma e fa `prisma db push` sul DB locale. Ti ricorda di riavviare `npm run dev`.

### Comandi npm
- `npm run prisma:sync-prod` — sincronizza `schema.production.prisma` da `schema.prisma`.
- `npm run db:refresh` — sync prod schema + `prisma generate` + `prisma db push` (fix manuale completo se i hook non bastano).
- `npm run hooks:install` — riattiva i git hook (utile dopo un clone fresco).

### Dopo un fresh clone
```bash
npm install
npm run hooks:install   # attiva i git hook
npm run db:refresh      # sync schema + genera client + crea dev.db
npm run db:seed         # popola con domande
```
