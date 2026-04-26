"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type HostSession = { gameId: string; code: string; hostName?: string };
type PlayerSession = { gameId: string; playerId: string; code?: string; nickname: string; emoji?: string; avatarUrl?: string };

const APPLE_BG = "#000000";
const APPLE_SURFACE = "#1d1d1f";
const APPLE_SURFACE_2 = "#111113";
const APPLE_INK = "#f5f5f7";
const APPLE_MUTED = "#a1a1a6";
const APPLE_BLUE = "#2997ff";
const APPLE_BLUE_DARK = "#2997ff";

const MODES: { icon: string; title: string; tag: string; desc: string }[] = [
  { icon: "🔤", title: "Risposta multipla.",       tag: "Il classico",    desc: "Quattro opzioni, una sola giusta. Più veloce rispondi, più punti." },
  { icon: "✏️", title: "Risposta aperta.",         tag: "A mano libera",  desc: "I giocatori digitano. Il presentatore giudica ✓ / ✗ dal pannello." },
  { icon: "🔡", title: "Componi la parola.",       tag: "Enigmistica",    desc: "Lettere mancanti da riempire. Case-insensitive, check automatico." },
  { icon: "🗺️", title: "Indovina dall'immagine.",  tag: "Visuale",        desc: "Guarda la foto. Scrivi la risposta. Il presentatore decide." },
  { icon: "🎯", title: "Ghigliottina.",            tag: "Il finale",      desc: "Gli ultimi sfidano la parola che lega cinque indizi. O tutto, o niente." },
  { icon: "⛓️", title: "Reazione a catena.",       tag: "Intuito",        desc: "Tre indizi progressivi. Meno ne leggi, più punti prendi." },
  { icon: "💡", title: "Indizio svelato.",         tag: "Rischio",        desc: "Immagine sfocata che si schiarisce col tempo. Decidi quando giocarti il punto." },
  { icon: "🔗", title: "Only Connect.",            tag: "Pensiero laterale", desc: "Quattro elementi. Un unico filo nascosto. Trova il collegamento." },
];

const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: "🏆", title: "Modalità torneo.",        desc: "Fino a 8 round, modalità diverse (o ripetute). Tempo personalizzato per ogni round." },
  { icon: "🎲", title: "Tre livelli di difficoltà.", desc: "Facile ×0.5 · Medio ×1 · Difficile ×2. O lascia il mix totale." },
  { icon: "🏃", title: "Ultimo in piedi.",        desc: "Chi sbaglia esce. Vince l'unico rimasto." },
  { icon: "🪜", title: "Caduta libera.",          desc: "Da 1 a 5 vite. Sbagli, perdi un cuore." },
  { icon: "⚡", title: "Speedrun.",                desc: "Timer globale, domande lampo da 10s, una dietro l'altra." },
  { icon: "🎯", title: "Jeopardy.",               desc: "Griglia categoria × valore. Il presentatore sceglie dal tabellone." },
  { icon: "🎯", title: "Aiuto 50 / 50.",          desc: "Elimina due risposte sbagliate. Quantità a scelta per giocatore." },
  { icon: "⏭", title: "Salta domanda.",          desc: "Hai un numero limitato di salvagenti. Usali con saggezza." },
  { icon: "🏷️", title: "Filtri categoria.",      desc: "Scegli una o più categorie, o lasciale tutte attive." },
  { icon: "⏱️", title: "Timer flessibile.",       desc: "Da 10 a 60 secondi. O senza limite: chiudi tu la domanda." },
  { icon: "📷", title: "Accesso con QR.",         desc: "Proietta il QR sulla TV. Gli ospiti entrano con uno scan." },
  { icon: "🏆", title: "Hall of Fame.",           desc: "Ogni vittoria resta. Classifica storica dei campioni della serata." },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "Crea la partita.",        desc: "Apri la regia, scegli modalità e regole, ricevi un codice a 4 cifre." },
  { n: "02", title: "Invita al tavolo.",       desc: "Proietta il QR. Ogni ospite si collega dal proprio telefono." },
  { n: "03", title: "Lancia lo show.",         desc: "Domande in diretta, punti live, effetti sonori, classifica in tempo reale." },
  { n: "04", title: "Incorona il campione.",   desc: "Podio, Hall of Fame permanente, revanche con un click." },
];

export default function HomePage() {
  const [host, setHost] = useState<HostSession | null>(null);
  const [player, setPlayer] = useState<PlayerSession | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    const hGid = localStorage.getItem("hostGameId");
    const hCode = localStorage.getItem("hostCode");
    if (hGid && hCode) {
      setHost({ gameId: hGid, code: hCode, hostName: localStorage.getItem("hostName") || undefined });
    }
    const pGid = localStorage.getItem("playerGameId");
    const pPid = localStorage.getItem("playerId");
    const pNick = localStorage.getItem("playerNickname");
    if (pGid && pPid && pNick) {
      setPlayer({
        gameId: pGid,
        playerId: pPid,
        nickname: pNick,
        code: localStorage.getItem("playerGameCode") || undefined,
        emoji: localStorage.getItem("playerEmoji") || undefined,
        avatarUrl: localStorage.getItem("playerAvatarUrl") || undefined,
      });
    }
  }, []);

  const forgetHost = () => {
    localStorage.removeItem("hostGameId");
    localStorage.removeItem("hostCode");
    localStorage.removeItem("hostName");
    setHost(null);
  };

  const forgetPlayer = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerGameId");
    localStorage.removeItem("playerGameCode");
    localStorage.removeItem("playerNickname");
    localStorage.removeItem("playerEmoji");
    localStorage.removeItem("playerAvatarUrl");
    setPlayer(null);
  };

  return (
    <main
      style={{ background: APPLE_BG, color: APPLE_INK }}
      className="min-h-screen font-sans"
    >
      {/* ================= NAV ================= */}
      <nav
        style={{
          background: "rgba(10, 10, 11, 0.72)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-6 h-11 flex items-center justify-between text-sm">
          <span className="font-semibold tracking-tight">Super Fabri</span>
          <div className="flex gap-6 text-[13px] items-center" style={{ color: APPLE_INK }}>
            <a href="#modes" className="opacity-80 hover:opacity-100 hidden md:inline">Modalità</a>
            <a href="#features" className="opacity-80 hover:opacity-100 hidden md:inline">Funzionalità</a>
            <a href="#how" className="opacity-80 hover:opacity-100 hidden md:inline">Come funziona</a>
            <Link href="/leaderboard" className="opacity-80 hover:opacity-100">Classifica</Link>
            <Link href="/pricing" className="opacity-80 hover:opacity-100 hidden md:inline">Pricing</Link>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <Link href="/profile" className="opacity-80 hover:opacity-100 truncate max-w-[120px]">
                  {session.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="inline-block w-6 h-6 rounded-full mr-2 align-middle" />
                  )}
                  {session.user.name || session.user.email}
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="opacity-60 hover:opacity-100 text-[12px]">
                  Esci
                </button>
              </div>
            ) : (
              <>
                <Link href="/signin" className="opacity-80 hover:opacity-100">Accedi</Link>
                <Link href="/signup" className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: APPLE_BLUE, color: "#fff" }}>
                  Registrati
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ================= HERO (dark) ================= */}
      <section
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(41,151,255,0.18) 0%, rgba(0,0,0,0) 55%), #000",
        }}
        className="text-white text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20"
      >
        <p className="text-sm md:text-base font-semibold mb-4" style={{ color: APPLE_BLUE_DARK }}>
          Nuovo · Quiz Night Multiplayer
        </p>
        <h1 className="font-semibold tracking-tight leading-[0.95] text-5xl md:text-7xl lg:text-8xl">
          Super Fabri.
        </h1>
        <h2 className="mt-2 font-semibold tracking-tight leading-[1.05] text-3xl md:text-5xl lg:text-6xl text-white/80">
          Games Night.
        </h2>
        <p className="mt-6 text-lg md:text-2xl max-w-2xl mx-auto font-normal text-white/70">
          Il quiz-show da salotto. Otto modalità. Tornei. Classifica live.
          Tutti collegati dal telefono.
        </p>
        <div className="mt-8 flex flex-wrap gap-8 justify-center text-lg md:text-xl">
          <Link href="/host" className="inline-flex items-center gap-1 hover:underline" style={{ color: APPLE_BLUE_DARK }}>
            Crea partita <span aria-hidden>›</span>
          </Link>
          <Link href="/player" className="inline-flex items-center gap-1 hover:underline" style={{ color: APPLE_BLUE_DARK }}>
            Entra con codice <span aria-hidden>›</span>
          </Link>
          <Link href="/spectator" className="inline-flex items-center gap-1 hover:underline" style={{ color: APPLE_BLUE_DARK }}>
            Spettatore <span aria-hidden>›</span>
          </Link>
        </div>
      </section>

      {/* ================= REJOIN BANNER ================= */}
      {(host || player) && (
        <section className="px-4 pt-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {host && (
              <div
                className="rounded-2xl p-5 flex items-center justify-between gap-4"
                style={{
                  background: APPLE_SURFACE,
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: APPLE_MUTED }}>Partita in corso come host</p>
                  <p className="font-semibold truncate">
                    Codice <span className="font-mono tracking-widest" style={{ color: APPLE_BLUE }}>{host.code}</span>
                    {host.hostName && <span style={{ color: APPLE_MUTED }}> · {host.hostName}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link
                    href={`/host/${host.gameId}`}
                    className="rounded-full px-5 py-2 text-sm font-medium text-white"
                    style={{ background: APPLE_BLUE }}
                  >
                    Rientra
                  </Link>
                  <button onClick={forgetHost} className="text-sm hover:underline" style={{ color: APPLE_MUTED }}>
                    Esci
                  </button>
                </div>
              </div>
            )}
            {player && (
              <div
                className="rounded-2xl p-5 flex items-center justify-between gap-4"
                style={{
                  background: APPLE_SURFACE,
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-3xl">{player.emoji || "🎮"}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: APPLE_MUTED }}>Partita in corso come giocatore</p>
                    <p className="font-semibold truncate">
                      {player.nickname}
                      {player.code && <span style={{ color: APPLE_MUTED }}> · <span className="font-mono tracking-widest">{player.code}</span></span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link
                    href={`/play/${player.gameId}`}
                    className="rounded-full px-5 py-2 text-sm font-medium text-white"
                    style={{ background: APPLE_BLUE }}
                  >
                    Rientra
                  </Link>
                  <button onClick={forgetPlayer} className="text-sm hover:underline" style={{ color: APPLE_MUTED }}>
                    Esci
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= TILE HOST / PLAYER / SPECTATOR ================= */}
      <section className="px-3 pt-6 pb-3">
        <div className="grid md:grid-cols-3 gap-3 max-w-7xl mx-auto">
          <Link
            href="/host"
            className="group rounded-[28px] px-6 py-14 md:py-20 text-center transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              background: APPLE_SURFACE,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: APPLE_MUTED }}>
              Presentatore
            </p>
            <h3 className="font-semibold tracking-tight text-4xl md:text-5xl leading-none mb-3">
              Conduci.
            </h3>
            <p className="text-[15px] md:text-base max-w-md mx-auto mb-6" style={{ color: APPLE_MUTED }}>
              Accendi la regia, configura le regole, lancia il codice da gridare al tavolo.
            </p>
            <span className="inline-flex items-center gap-1 text-base font-medium" style={{ color: APPLE_BLUE }}>
              Apri il sipario <span aria-hidden>›</span>
            </span>
          </Link>

          <Link
            href="/player"
            className="group rounded-[28px] px-6 py-14 md:py-20 text-center text-white transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #0a84ff 0%, #0040b3 100%)",
              boxShadow: "0 10px 40px rgba(10, 132, 255, 0.25)",
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-white/60">
              Giocatore
            </p>
            <h3 className="font-semibold tracking-tight text-4xl md:text-5xl leading-none mb-3">
              Gioca.
            </h3>
            <p className="text-[15px] md:text-base max-w-md mx-auto mb-6 text-white/70">
              Codice, avatar, nickname leggendario. In partita in cinque secondi.
            </p>
            <span className="inline-flex items-center gap-1 text-base font-medium" style={{ color: APPLE_BLUE_DARK }}>
              Entra in scena <span aria-hidden>›</span>
            </span>
          </Link>

          <Link
            href="/spectator"
            className="group rounded-[28px] px-6 py-14 md:py-20 text-center transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              background: APPLE_SURFACE,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: APPLE_MUTED }}>
              Spettatore
            </p>
            <h3 className="font-semibold tracking-tight text-4xl md:text-5xl leading-none mb-3">
              Segui.
            </h3>
            <p className="text-[15px] md:text-base max-w-md mx-auto mb-6" style={{ color: APPLE_MUTED }}>
              Schermo grande, divano, popcorn. Segui la sfida in diretta senza spoiler.
            </p>
            <span className="inline-flex items-center gap-1 text-base font-medium" style={{ color: APPLE_BLUE }}>
              Entra da spettatore <span aria-hidden>›</span>
            </span>
          </Link>
        </div>
      </section>

      {/* ================= MODI DI GIOCO ================= */}
      <section id="modes" className="px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: APPLE_BLUE }}>
              Modalità
            </p>
            <h2 className="font-semibold tracking-tight text-4xl md:text-6xl leading-[1.05]">
              Otto modi di giocare.
            </h2>
            <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto" style={{ color: APPLE_MUTED }}>
              Una per ogni tipo di tavolata. Una alla volta, o tutte mescolate in un torneo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODES.map((m) => (
              <div
                key={m.title}
                className="rounded-[22px] p-8 flex flex-col transition-transform duration-300 hover:-translate-y-0.5"
                style={{
                  background: APPLE_SURFACE,
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                <div className="text-5xl mb-5">{m.icon}</div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: APPLE_BLUE }}>
                  {m.tag}
                </p>
                <h3 className="font-semibold tracking-tight text-2xl mb-2 leading-tight">{m.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: APPLE_MUTED }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURE SPOTLIGHT ================= */}
      <section
        style={{
          background: APPLE_SURFACE_2,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        className="text-white px-6 py-24 md:py-32"
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: APPLE_BLUE_DARK }}>
            Tempo reale
          </p>
          <h2 className="font-semibold tracking-tight text-4xl md:text-6xl leading-[1.05]">
            Una sola partita.
            <br />
            <span className="text-white/60">Tanti telefoni.</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-white/70">
            Socket live: risposte, punti e classifica si aggiornano su tutti i dispositivi
            nello stesso istante. Nessuna ricarica. Nessun ritardo.
          </p>
        </div>
      </section>

      {/* ================= FUNZIONALITÀ ================= */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: APPLE_BLUE }}>
              Funzionalità
            </p>
            <h2 className="font-semibold tracking-tight text-4xl md:text-6xl leading-[1.05]">
              Ogni regola. Ogni twist.
            </h2>
            <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto" style={{ color: APPLE_MUTED }}>
              Mescola regole, aiuti e limiti di tempo per la serata esatta che vuoi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-[22px] p-7 flex items-start gap-4"
                style={{
                  background: APPLE_SURFACE,
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.25)",
                }}
              >
                <div className="text-3xl flex-shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-semibold tracking-tight text-lg mb-1">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: APPLE_MUTED }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COME FUNZIONA ================= */}
      <section id="how" style={{ background: APPLE_SURFACE_2 }} className="px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: APPLE_BLUE }}>
              In 4 passi
            </p>
            <h2 className="font-semibold tracking-tight text-4xl md:text-6xl leading-[1.05]">
              Dal divano al podio.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-[22px] p-8"
                style={{
                  background: APPLE_SURFACE,
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.25)",
                }}
              >
                <div className="font-semibold text-4xl mb-4 tracking-tight" style={{ color: APPLE_BLUE }}>
                  {s.n}
                </div>
                <h3 className="font-semibold tracking-tight text-xl mb-2">{s.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: APPLE_MUTED }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA FINALE (dark full-bleed) ================= */}
      <section
        style={{
          background:
            "radial-gradient(ellipse at bottom, rgba(41,151,255,0.16) 0%, rgba(0,0,0,0) 60%), #000",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
        className="text-white text-center px-6 py-24 md:py-32"
      >
        <h2 className="font-semibold tracking-tight text-4xl md:text-7xl leading-[1.05]">
          Si alza il sipario.
        </h2>
        <p className="mt-6 text-lg md:text-2xl max-w-xl mx-auto text-white/70">
          Il codice è nelle tue mani. Il resto vien da sé.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/host"
            className="inline-flex items-center justify-center rounded-full px-8 py-3 text-[17px] font-medium text-white transition-colors"
            style={{ background: APPLE_BLUE }}
          >
            Crea partita
          </Link>
          <Link
            href="/player"
            className="inline-flex items-center justify-center rounded-full px-8 py-3 text-[17px] font-medium text-white transition-colors border border-white/25 hover:bg-white/10"
          >
            Entra con codice
          </Link>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer style={{ background: APPLE_BG }} className="px-6 pt-10 pb-12 text-[13px]">
        <div className="max-w-6xl mx-auto">
          <div className="pb-6 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: APPLE_MUTED }}>
              Altro da Super Fabri
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6" style={{ color: APPLE_INK }}>
            <Link href="/leaderboard" className="hover:underline">Hall of Fame</Link>
            <Link href="/admin" className="hover:underline">Regia / Admin</Link>
            <Link href="/qr" className="hover:underline">QR Code</Link>
            <Link href="/host" className="hover:underline">Crea partita</Link>
            <Link href="/player" className="hover:underline">Entra con codice</Link>
            <Link href="/spectator" className="hover:underline">Spettatore</Link>
            <Link href="/signin" className="hover:underline">Accedi</Link>
            <Link href="/signup" className="hover:underline">Registrati</Link>
            <Link href="/pricing" className="hover:underline">Pricing</Link>
            <Link href="/profile" className="hover:underline">Profilo</Link>
          </div>
          <p style={{ color: APPLE_MUTED }}>
            A Fabri Production · Ogni sera è una serata speciale.
          </p>
        </div>
      </footer>
    </main>
  );
}
