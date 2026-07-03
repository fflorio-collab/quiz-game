"use client";

// Ingresso spettatore ANONIMO: solo il codice partita. Nessuna POST, nessun
// record su DB — GET /api/game/lookup?code= e redirect alla vista TV.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Logo } from "@/components/ui";

function SpectatorEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = (searchParams.get("code") ?? "").toUpperCase();

  const [code, setCode] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);

  const lookup = useCallback(
    async (raw: string) => {
      const clean = raw.toUpperCase().trim();
      if (!clean) {
        setError("Inserisci il codice della partita.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/game/lookup?code=${encodeURIComponent(clean)}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          setError("Nessuna partita con questo codice.");
          return;
        }
        if (!res.ok) {
          setError("Qualcosa è andato storto. Riprova.");
          return;
        }
        const json = (await res.json()) as { gameId: string };
        router.push(`/spectator/${json.gameId}`);
      } catch {
        setError("Rete non raggiungibile. Riprova.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // Se arriva già ?code= valido, prova la risoluzione una sola volta.
  useEffect(() => {
    if (prefill && !autoTried.current) {
      autoTried.current = true;
      void lookup(prefill);
    }
  }, [prefill, lookup]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <Logo size="lg" />

      <div className="w-full">
        <h1 className="tv-title mb-2 text-4xl">Guarda</h1>
        <p className="mb-6 text-muted">Inserisci il codice per seguire la partita sullo schermo.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(code);
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODICE"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={12}
            className="text-center font-display text-2xl uppercase tracking-[0.3em]"
            error={error}
            aria-label="Codice partita"
          />
          <Button type="submit" size="lg" loading={loading}>
            Guarda la partita
          </Button>
        </form>
      </div>

      <a href="/" className="apple-link">
        ← Torna alla home
      </a>
    </main>
  );
}

export default function SpectatorEntryPage() {
  return (
    <Suspense fallback={null}>
      <SpectatorEntry />
    </Suspense>
  );
}
