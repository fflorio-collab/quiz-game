#!/usr/bin/env bash
# Popola il DB di produzione (Railway/PostgreSQL) con tutti i seed.
# Uso:
#   DATABASE_URL="postgresql://user:pass@host:port/db" bash scripts/seed-production.sh
#
# Dove trovo DATABASE_URL:
#   Railway → servizio Postgres → tab "Variables" → copia DATABASE_PUBLIC_URL
#   (non DATABASE_URL che è solo interno alla rete privata Railway)

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "✗ Manca DATABASE_URL"
  echo ""
  echo "Uso:"
  echo "  DATABASE_URL='postgresql://...' bash scripts/seed-production.sh"
  echo ""
  echo "Dove trovarla:"
  echo "  Railway → servizio Postgres → tab 'Variables' → copia DATABASE_PUBLIC_URL"
  exit 1
fi

if [[ "$DATABASE_URL" != postgres* ]]; then
  echo "✗ DATABASE_URL non sembra un URL PostgreSQL (deve iniziare con postgres:// o postgresql://)"
  echo "  Hai passato: ${DATABASE_URL:0:30}..."
  exit 1
fi

echo "🔄 Step 1/4: genero il Prisma client per PostgreSQL..."
npx prisma generate --schema=prisma/schema.production.prisma

echo ""
echo "🗄️  Step 2/4: applico lo schema al DB remoto (crea le tabelle)..."
npx prisma db push --schema=prisma/schema.production.prisma --skip-generate --accept-data-loss

echo ""
echo "🌱 Step 3/4: lancio i seed (potrebbe richiedere 1-2 minuti)..."

echo "  • seed-50.ts (6 categorie root × 50 domande)..."
npx tsx prisma/seed-50.ts

echo "  • seed-subcategories.ts (20 sotto-categorie)..."
npx tsx prisma/seed-subcategories.ts

echo "  • seed-subcategories-questions.ts (1000 domande sub)..."
npx tsx prisma/seed-subcategories-questions.ts

echo "  • seed-extra-10.ts (270 domande extra)..."
npx tsx prisma/seed-extra-10.ts

echo "  • seed-badges.ts (10 badge)..."
npx tsx prisma/seed-badges.ts

echo ""
echo "♻️  Step 4/4: ripristino il client SQLite per dev locale..."
npx prisma generate

echo ""
echo "✅ FATTO!"
echo ""
echo "Apri https://quiz-gam.up.railway.app e vai su /admin per verificare."
echo "Password admin: usa quella di ADMIN_PASSWORD su Railway."
