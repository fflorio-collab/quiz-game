#!/usr/bin/env node
/**
 * Mantiene prisma/schema.production.prisma allineato a prisma/schema.prisma.
 * L'unica differenza tra i due è il provider (sqlite per dev, postgresql per prod).
 *
 * Modi:
 *   node scripts/sync-prod-schema.mjs           # scrive schema.production.prisma
 *   node scripts/sync-prod-schema.mjs --check   # exit 1 se serve un sync (per CI / hook)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEV_SCHEMA = resolve(ROOT, "prisma/schema.prisma");
const PROD_SCHEMA = resolve(ROOT, "prisma/schema.production.prisma");

const checkOnly = process.argv.includes("--check");

if (!existsSync(DEV_SCHEMA)) {
  console.error(`✗ ${DEV_SCHEMA} non trovato`);
  process.exit(1);
}

const dev = readFileSync(DEV_SCHEMA, "utf8");
const expected = dev.replace(
  /(datasource db \{[^}]*provider\s*=\s*)"sqlite"/,
  '$1"postgresql"',
);

if (expected === dev) {
  console.error(`✗ schema.prisma non contiene 'provider = "sqlite"' nel blocco datasource`);
  process.exit(1);
}

const current = existsSync(PROD_SCHEMA) ? readFileSync(PROD_SCHEMA, "utf8") : "";

if (current === expected) {
  console.log("✓ schema.production.prisma è già in sync");
  process.exit(0);
}

if (checkOnly) {
  console.error("✗ schema.production.prisma fuori sync con schema.prisma");
  console.error("  Esegui: npm run prisma:sync-prod (o committa il cambio)");
  process.exit(1);
}

writeFileSync(PROD_SCHEMA, expected);
console.log(`✓ schema.production.prisma aggiornato (${expected.split("\n").length} righe)`);
