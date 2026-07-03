import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

// Auth admin del rebuild game-show: nessun account utente, un'unica password
// condivisa (ADMIN_PASSWORD). Il cookie NON contiene la password in chiaro ma
// un HMAC-SHA256 di una stringa fissa con la password come chiave: così anche
// leggendo il cookie non si ricava la password. Nessun fallback "admin": se
// ADMIN_PASSWORD non è configurata, l'area admin è chiusa.

const SESSION_PAYLOAD = "admin-session";

/** Valore atteso del cookie admin-token per la password corrente, o null se non configurata. */
export function adminSessionToken(): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return createHmac("sha256", secret).update(SESSION_PAYLOAD).digest("hex");
}

/** true se la password fornita è quella configurata (confronto timing-safe). */
export function checkAdminPassword(password: unknown): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || typeof password !== "string" || password.length === 0) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** true se la richiesta corrente ha un cookie admin valido. */
export function isAdmin(): boolean {
  const expected = adminSessionToken();
  if (!expected) return false;
  const token = cookies().get("admin-token")?.value;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
