import { prisma } from "@/lib/prisma";
import type { DuelState } from "@/types/socket";

const REVEAL_INTERVAL_MS = 3000;
const VOWELS = /[AEIOUÀÈÉÌÒÙ]/;

export type DuelMask = {
  chars: string[];
  revealed: number[];
  blockedIdx: number;
  lastRevealAt: number;
};

export function buildMask(word: string): DuelMask {
  const chars = word.toUpperCase().split("");
  let blockedIdx = -1;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (VOWELS.test(chars[i])) { blockedIdx = i; break; }
  }
  if (blockedIdx === -1) blockedIdx = chars.length - 1;
  const revealed: number[] = [];
  if (chars.length > 0 && blockedIdx !== 0) revealed.push(0);
  else if (chars.length > 1) revealed.push(chars.length - 1);
  return { chars, revealed, blockedIdx, lastRevealAt: Date.now() };
}

export function renderMask(mask: DuelMask): string {
  return mask.chars
    .map((c, i) =>
      /[A-ZÀÈÉÌÒÙ]/.test(c) ? (mask.revealed.includes(i) ? c : "_") : c,
    )
    .join(" ");
}

export { REVEAL_INTERVAL_MS };

// Helpers per ricostruire DuelState dal DB (migration vercel-pusher fase 7).
// Duplicano la logica di loadDuelStateFromDB / applyElapsed di server/socket-server.ts
// così le API routes Next.js possono operare senza Map in-memory.

function maskFromJson(json: string): { chars: string[]; revealed: number[]; blockedIdx: number } | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.chars)) return parsed;
  } catch {}
  return null;
}

function renderMasked(mask: { chars: string[]; revealed: number[] } | null): string {
  if (!mask) return "";
  return mask.chars
    .map((c, i) =>
      /[A-ZÀÈÉÌÒÙ]/.test(c) ? (mask.revealed.includes(i) ? c : "_") : c,
    )
    .join(" ");
}

export async function loadDuelStateFromDB(gameId: string): Promise<DuelState | null> {
  const row = await prisma.duel.findUnique({ where: { gameId } });
  if (!row || row.endedAt) return null;

  const players = await prisma.player.findMany({
    where: { id: { in: [row.playerAId, row.playerBId] } },
  });
  const pA = players.find((p) => p.id === row.playerAId);
  const pB = players.find((p) => p.id === row.playerBId);
  if (!pA || !pB) return null;

  let timeLeftA = row.playerATimeMs;
  let timeLeftB = row.playerBTimeMs;
  if (!row.paused && row.lastTickAt) {
    const elapsed = Date.now() - row.lastTickAt.getTime();
    if (row.currentTurnPlayerId === row.playerAId) {
      timeLeftA = Math.max(0, timeLeftA - elapsed);
    } else {
      timeLeftB = Math.max(0, timeLeftB - elapsed);
    }
  }

  const mask = maskFromJson(row.maskJson);
  return {
    playerA: {
      id: pA.id,
      nickname: pA.nickname,
      emoji: pA.emoji,
      avatarUrl: pA.avatarUrl,
      timeLeftMs: timeLeftA,
    },
    playerB: {
      id: pB.id,
      nickname: pB.nickname,
      emoji: pB.emoji,
      avatarUrl: pB.avatarUrl,
      timeLeftMs: timeLeftB,
    },
    activePlayerId: row.currentTurnPlayerId,
    question: row.currentQuestionText
      ? { text: row.currentQuestionText, masked: renderMasked(mask), length: mask?.chars.length ?? 0 }
      : null,
    turnSeq: 0,
    durationSec: row.durationSec,
    finished: false,
    paused: row.paused,
  };
}

// Applica il tempo trascorso dall'ultimo tick al player attivo (rilevante solo se non in pausa).
// Ritorna il delta in ms così il caller può decidere se il player è finito (timeLeftMs <= 0).
// NON aggiorna il DB: il caller decide cosa scrivere.
export async function applyElapsedAndCompute(gameId: string): Promise<{
  newPlayerATimeMs: number;
  newPlayerBTimeMs: number;
  activeRanOutOfTime: boolean;
  activePlayerId: string;
  loserId: string | null;
} | null> {
  const row = await prisma.duel.findUnique({ where: { gameId } });
  if (!row || row.endedAt) return null;

  let newA = row.playerATimeMs;
  let newB = row.playerBTimeMs;
  let ranOut = false;
  let loserId: string | null = null;

  if (!row.paused && row.lastTickAt) {
    const elapsed = Date.now() - row.lastTickAt.getTime();
    if (row.currentTurnPlayerId === row.playerAId) {
      newA = Math.max(0, newA - elapsed);
      if (newA <= 0) { ranOut = true; loserId = row.playerAId; }
    } else {
      newB = Math.max(0, newB - elapsed);
      if (newB <= 0) { ranOut = true; loserId = row.playerBId; }
    }
  }
  return {
    newPlayerATimeMs: newA,
    newPlayerBTimeMs: newB,
    activeRanOutOfTime: ranOut,
    activePlayerId: row.currentTurnPlayerId,
    loserId,
  };
}
