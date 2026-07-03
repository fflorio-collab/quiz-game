import { timingSafeEqual } from "crypto";

// Autenticazione delle azioni di regia (host). La partita ha un `hostToken`
// segreto generato alla creazione; il client host lo invia nell'header
// `x-host-token`. Le route host verificano il token prima di mutare lo stato.
//
// Retrocompatibilità: se la partita non ha hostToken (partite create prima del
// rebuild), l'accesso è consentito — non spezziamo eventuali partite legacy.

const HEADER = "x-host-token";

/** true se la richiesta è autorizzata a pilotare la partita. */
export function assertHost(req: Request, game: { hostToken: string | null }): boolean {
  if (!game.hostToken) return true; // partita legacy senza token
  const provided = req.headers.get(HEADER);
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(game.hostToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Legge il token host dalla richiesta (per capire se un chiamante è l'host). */
export function readHostToken(req: Request): string | null {
  return req.headers.get(HEADER);
}

/** true se il token nell'header combacia con quello della partita (host valido). */
export function isHostRequest(req: Request, game: { hostToken: string | null }): boolean {
  if (!game.hostToken) return false;
  const provided = req.headers.get(HEADER);
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(game.hostToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
