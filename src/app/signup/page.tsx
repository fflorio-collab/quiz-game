"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !username || !password) { setError("Compila tutti i campi obbligatori."); return; }
    if (password.length < 8) { setError("La password deve avere almeno 8 caratteri."); return; }
    if (password !== password2) { setError("Le password non coincidono."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError("Username: solo lettere, numeri e underscore."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username, displayName: displayName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore nella registrazione"); setLoading(false); return; }
      // Dopo signup, login automatico
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (signInRes?.error) { router.push("/signin"); return; }
      router.push("/");
    } catch {
      setLoading(false);
      setError("Errore di rete");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="apple-link text-sm mb-6 inline-flex">‹ Home</Link>
        <div className="card">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Registrati.</h1>
          <p className="text-muted mb-6">Crea il tuo profilo. Le partite future saranno legate a te per sempre.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.it" className="input" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Username <span className="text-muted text-xs">(handle pubblico, @fabri99)</span>
              </label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().slice(0, 20))}
                placeholder="fabri99" className="input" maxLength={20} autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Nome mostrato <span className="text-muted text-xs">(opzionale)</span>
              </label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Fabri" className="input" maxLength={40} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password <span className="text-muted text-xs">(min 8 caratteri)</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="input" autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ripeti password</label>
              <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••" className="input" autoComplete="new-password" />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Registrazione..." : "Crea account"}
            </button>
          </form>

          <p className="text-sm text-muted mt-5 text-center">
            Hai già un account? <Link href="/signin" className="apple-link">Accedi</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
