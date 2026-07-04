"use client";

import { useEffect, useMemo, useRef } from "react";
import { playCategoryJingle } from "@/lib/sound";

// Splash a schermo intero mostrato dal presentatore quando si passa a un round
// a categoria SINGOLA: il nome della categoria "esplode" al centro con l'icona,
// anelli pulsanti e coriandoli, mentre parte un jingle a tema (src/lib/sound.ts).
// Auto-avanza dopo `durationMs`; l'host può anche toccare per saltare l'attesa.

interface Props {
  category: { name: string; color?: string | null; icon?: string | null };
  roundNumber: number;
  totalRounds: number;
  modeLabel: string;
  onDone: () => void;
  durationMs?: number;
}

const CONFETTI_COLORS = ["#fbbf24", "#2997ff", "#30d158", "#ff453a", "#ff9f0a", "#a855f7", "#ec4899"];

export default function CategoryRevealSplash({
  category,
  roundNumber,
  totalRounds,
  modeLabel,
  onDone,
  durationMs = 4200,
}: Props) {
  const accent = category.color || "#2997ff";
  const icon = category.icon || "🎯";

  // onDone una sola volta (timer di auto-avanzamento OPPURE tap per saltare).
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    playCategoryJingle(category.name);
    const t = setTimeout(finish, durationMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coriandoli deterministici (niente Math.random → nessun mismatch di hydration).
  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: (i * 79 + 13) % 100,
        delay: (((i * 53) % 100) / 100) * 2.6,
        dur: 2.4 + (((i * 37) % 100) / 100) * 2.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 8 + (i % 4) * 3,
        rounded: i % 2 === 0,
      })),
    [],
  );

  return (
    <div
      onClick={finish}
      className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden animate-fade-in"
      style={{
        background: `radial-gradient(circle at 50% 38%, ${accent}40 0%, rgba(0,0,0,0.92) 58%, #000 100%)`,
      }}
    >
      {/* Coriandoli */}
      {confetti.map((c, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            top: "-12vh",
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: c.rounded ? "9999px" : "2px",
            animation: `confettiFall ${c.dur}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      {/* Etichetta round */}
      <div className="animate-splash-rise" style={{ animationDelay: "0.05s" }}>
        <span
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: accent, background: "rgba(255,255,255,0.04)" }}
        >
          🎬 Round {roundNumber} / {totalRounds}
        </span>
      </div>

      {/* Icona con anelli pulsanti */}
      <div className="relative my-8 flex items-center justify-center" style={{ width: 180, height: 180 }}>
        <span
          className="absolute rounded-full animate-splash-ring"
          style={{ width: 150, height: 150, border: `3px solid ${accent}` }}
        />
        <span
          className="absolute rounded-full animate-splash-ring"
          style={{ width: 150, height: 150, border: `3px solid ${accent}`, animationDelay: "0.9s" }}
        />
        <span
          className="animate-splash-pop"
          style={{ fontSize: "5.5rem", lineHeight: 1, filter: `drop-shadow(0 0 26px ${accent})` }}
        >
          {icon}
        </span>
      </div>

      {/* Nome categoria */}
      <h1
        className="animate-splash-pop px-6 text-center font-extrabold uppercase leading-none"
        style={{
          animationDelay: "0.12s",
          fontSize: "clamp(2.5rem, 9vw, 6rem)",
          letterSpacing: "-0.02em",
          color: "#fff",
          textShadow: `0 0 30px ${accent}, 0 0 64px ${accent}88`,
        }}
      >
        {category.name}
      </h1>

      {/* Modalità del round */}
      <p className="mt-7 animate-splash-rise text-lg text-white/75 md:text-xl" style={{ animationDelay: "0.32s" }}>
        🏆 {modeLabel}
      </p>

      <p className="absolute bottom-8 animate-fade-in text-sm text-white/40" style={{ animationDelay: "1s" }}>
        Tocca per iniziare →
      </p>
    </div>
  );
}
