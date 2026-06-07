import Pusher from "pusher";

let cached: Pusher | null = null;

function client(): Pusher {
  if (cached) return cached;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || "eu";
  if (!appId || !key || !secret) {
    throw new Error(
      "Pusher non configurato: mancano PUSHER_APP_ID/PUSHER_KEY/PUSHER_SECRET nelle env",
    );
  }
  cached = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return cached;
}

export function isPusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_KEY &&
      process.env.PUSHER_SECRET,
  );
}

// I nomi dei canali Pusher non possono contenere ":" → uso "-".
// Le room originali "game:${id}" / "host:${id}" / "spectator:${id}" diventano
// canali "game-${id}" / "host-${id}" / "spectator-${id}".
export function gameChannel(gameId: string): string {
  return `game-${gameId}`;
}
export function hostChannel(gameId: string): string {
  return `host-${gameId}`;
}
export function spectatorChannel(gameId: string): string {
  return `spectator-${gameId}`;
}

export async function broadcastToGame<T>(gameId: string, event: string, data: T): Promise<void> {
  await client().trigger(gameChannel(gameId), event, data);
}
export async function broadcastToHost<T>(gameId: string, event: string, data: T): Promise<void> {
  await client().trigger(hostChannel(gameId), event, data);
}
export async function broadcastToSpectators<T>(gameId: string, event: string, data: T): Promise<void> {
  await client().trigger(spectatorChannel(gameId), event, data);
}
