"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type Provider = "google" | "twitch" | "facebook" | "apple";

const PROVIDER_META: Record<Provider, { label: string; icon: string; bg: string }> = {
  google: { label: "Continua con Google", icon: "G", bg: "bg-white text-black hover:bg-gray-100" },
  twitch: { label: "Continua con Twitch", icon: "🎮", bg: "bg-[#9146FF] text-white hover:bg-[#7c3aed]" },
  facebook: { label: "Continua con Facebook", icon: "f", bg: "bg-[#1877F2] text-white hover:bg-[#166ddb]" },
  apple: { label: "Continua con Apple", icon: "", bg: "bg-black text-white border border-white/20 hover:bg-white/10" },
};

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>(urlError ? "Credenziali non valide o sessione scaduta." : "");
  const [providersAvailable, setProvidersAvailable] = useState<Provider[]>([]);

  useEffect(() => {
    // NextAuth espone /api/auth/providers con la lista dei provider attivi
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data: Record<string, { id: string }>) => {
        const ids = Object.values(data || {}).map((p) => p.id);
        setProvidersAvailable(ids.filter((id): id is Provider =>
          id === "google" || id === "twitch" || id === "facebook" || id === "apple"
        ));
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Inserisci email e password."); return; }
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError("Credenziali non valide."); return; }
    router.push(callbackUrl);
  };

  const oauth = async (provider: Provider) => {
    await signIn(provider, { callbackUrl });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="apple-link text-sm mb-6 inline-flex">‹ Home</Link>
        <div className="card">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Entra.</h1>
          <p className="text-muted mb-6">Accedi al tuo profilo, classifiche, badge.</p>

          {providersAvailable.length > 0 && (
            <div className="space-y-2 mb-5">
              {providersAvailable.map((p) => {
                const meta = PROVIDER_META[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => oauth(p)}
                    className={`w-full py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 ${meta.bg}`}
                  >
                    {meta.icon && <span className="font-bold">{meta.icon}</span>}
                    {meta.label}
                  </button>
                );
              })}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-background text-muted">oppure con email</span></div>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.it" className="input" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="input" autoComplete="current-password" />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Accesso..." : "Entra"}
            </button>
          </form>

          <p className="text-sm text-muted mt-5 text-center">
            Non hai un account? <Link href="/signup" className="apple-link">Registrati</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
