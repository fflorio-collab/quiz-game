"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Plan = {
  id: "FREE" | "PRO" | "EDU";
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  description: string;
  features: string[];
  cta: string;
  priceEnv?: "STRIPE_PRICE_ID_PRO_MONTH" | "STRIPE_PRICE_ID_EDU_MONTH";
};

const PLANS: Plan[] = [
  {
    id: "FREE",
    name: "Free",
    price: "0€",
    period: "sempre",
    description: "Per provare, serate in famiglia, gruppi piccoli.",
    features: [
      "Max 10 giocatori per partita",
      "3 partite / mese (come host)",
      "Tutte le 8 modalità base",
      "Hall of Fame pubblica",
      "Modalità presentatore + spettatore",
    ],
    cta: "Gratis per sempre",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "9,90€",
    period: "al mese",
    highlight: true,
    description: "Per host seriali, serate al pub, team building, creator.",
    features: [
      "Fino a 50 giocatori",
      "Partite illimitate",
      "Branding personalizzato (logo, colori)",
      "Party pack tematici (80s, Sanremo, Serie TV)",
      "Export PDF/CSV dei risultati",
      "Overlay OBS per streaming",
      "50 AI-question generator al mese",
    ],
    cta: "Passa a Pro",
    priceEnv: "STRIPE_PRICE_ID_PRO_MONTH",
  },
  {
    id: "EDU",
    name: "Edu",
    price: "6,90€",
    period: "per docente / mese",
    description: "Per scuole, corsi aziendali, formazione.",
    features: [
      "Fino a 200 studenti",
      "Classi persistenti + roster studenti",
      "Quiz asincroni (compiti a casa)",
      "Report dettagliati per studente e classe",
      "SSO Google Classroom / MS Teams",
      "200 AI-question generator al mese",
      "Fatturazione elettronica (MePA)",
    ],
    cta: "Passa a Edu",
    priceEnv: "STRIPE_PRICE_ID_EDU_MONTH",
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { if (d.user?.plan) setUserPlan(d.user.plan); });
  }, [session]);

  const upgrade = async (planId: "PRO" | "EDU") => {
    setError("");
    if (!session?.user) { window.location.href = `/signin?callbackUrl=/pricing`; return; }
    setLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Errore. Riprova.");
    } catch {
      setError("Errore di rete.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="apple-link text-sm">‹ Home</Link>
          {userPlan && (
            <span className="text-sm">
              Piano attuale: <span className="font-bold text-accent">{userPlan}</span>
            </span>
          )}
        </div>

        <div className="text-center mb-10 md:mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">Prezzi</p>
          <h1 className="font-semibold tracking-tight text-4xl md:text-6xl mb-4">Scegli il tuo piano.</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-muted">
            Gratis per provare. Pro per chi fa sul serio. Edu per scuole e formazione.
            Cancella quando vuoi.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const isCurrent = userPlan === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-3xl p-7 flex flex-col ${
                  p.highlight
                    ? "bg-accent/10 ring-2 ring-accent shadow-xl"
                    : "bg-surface border border-border"
                }`}
              >
                {p.highlight && (
                  <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Più scelto</div>
                )}
                <h3 className="text-2xl font-bold">{p.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted text-sm"> {p.period}</span>
                </div>
                <p className="text-sm text-muted mb-5">{p.description}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-success mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {p.id === "FREE" ? (
                  <Link href="/host" className="w-full btn-secondary text-center">
                    {isCurrent ? "Piano attuale" : "Gioca gratis"}
                  </Link>
                ) : isCurrent ? (
                  <button disabled className="w-full btn-secondary">Piano attuale</button>
                ) : (
                  <button
                    onClick={() => upgrade(p.id as "PRO" | "EDU")}
                    disabled={loading === p.id}
                    className={`w-full ${p.highlight ? "btn-primary" : "btn-secondary"}`}
                  >
                    {loading === p.id ? "..." : p.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 max-w-2xl mx-auto bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 text-sm text-center">
            {error}
          </div>
        )}

        <p className="text-xs text-muted text-center mt-10 max-w-xl mx-auto">
          I pagamenti sono gestiti da Stripe. Cancella in qualsiasi momento dal portale utente.
          Per fatturazione scuola (MePA, PagoPA) contattaci.
        </p>
      </div>
    </main>
  );
}
