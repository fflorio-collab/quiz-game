"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo, Spinner } from "@/components/ui";
import { EmojiPicker, useLocalIdentity, AVATAR_EMOJIS } from "@/components/player";

// JOIN giocatore. Codice prefillato da ?code= (QR host). Nickname + emoji avatar.
// POST /api/player → salva identità (useLocalIdentity) → /play/[gameId].

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { save } = useLocalIdentity();

  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill codice dalla querystring (una sola volta al mount).
  useEffect(() => {
    const q = params.get("code");
    if (q) setCode(q.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
  }, [params]);

  const canSubmit = code.length === 6 && nickname.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nickname: nickname.trim(), emoji }),
      });
      const json = (await res.json().catch(() => null)) as
        | { playerId?: string; gameId?: string; error?: string }
        | null;

      if (!res.ok || !json?.playerId || !json?.gameId) {
        const fallback =
          res.status === 404
            ? "Codice partita non valido"
            : res.status === 409
              ? "Nickname già in uso in questa partita"
              : "Impossibile entrare in partita";
        setError(json?.error ?? fallback);
        setSubmitting(false);
        return;
      }

      save({
        playerId: json.playerId,
        playerGameId: json.gameId,
        playerGameCode: code,
        playerNickname: nickname.trim(),
        playerEmoji: emoji,
      });
      router.push(`/play/${json.gameId}`);
    } catch {
      setError("Rete non raggiungibile. Riprova.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-8 pt-8">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>

      <h1 className="mb-1 text-center font-display text-2xl uppercase tracking-wide text-white">
        Entra in partita
      </h1>
      <p className="mb-6 text-center text-sm text-muted">
        Inserisci il codice mostrato sullo schermo
      </p>

      {/* Codice */}
      <label className="mb-1.5 block text-sm font-medium text-muted">Codice partita</label>
      <input
        value={code}
        onChange={(e) =>
          setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
        }
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="ABC123"
        maxLength={6}
        className="input mb-4 text-center font-display text-3xl uppercase tracking-[0.4em]"
      />

      {/* Nickname */}
      <label className="mb-1.5 block text-sm font-medium text-muted">Il tuo nome</label>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value.slice(0, 20))}
        placeholder="Come ti chiami?"
        maxLength={20}
        enterKeyHint="done"
        className="input mb-5 text-center text-xl"
      />

      {/* Avatar emoji */}
      <label className="mb-2 block text-sm font-medium text-muted">Scegli un avatar</label>
      <EmojiPicker value={emoji} onChange={setEmoji} />

      {error && (
        <p className="mt-5 rounded-xl border border-lose/40 bg-lose/10 px-4 py-3 text-center text-sm font-medium text-lose">
          {error}
        </p>
      )}

      {/* Azione in thumb-zone */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="btn-primary mt-6 min-h-[64px] w-full text-xl"
      >
        {submitting ? "Entro…" : "Gioca 🎮"}
      </button>
    </div>
  );
}

export default function PlayJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[100dvh] place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <JoinInner />
    </Suspense>
  );
}
