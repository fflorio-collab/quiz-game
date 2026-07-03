import type { Config } from "tailwindcss";

// Design system "Game show TV scuro" (rebuild/gameshow).
// Token nuovi (ink/stage/panel/gold/ember/spark/win/lose + answerA-D) e
// alias legacy (background/surface/border/accent/gold/success/danger/warning/muted)
// mappati sui nuovi valori: le classi tailwind esistenti in src/app/admin
// e nei componenti sopravvissuti restano valide senza toccarle.

const palette = {
  // ── Sfondi / superfici ──────────────────────────────────────────────────
  ink: "#08080D",   // body
  stage: "#101018", // superficie
  panel: "#181826", // card
  line: "rgba(255, 255, 255, 0.08)",

  // ── Oro e accenti ───────────────────────────────────────────────────────
  gold: "#F6C64B",
  goldBright: "#FFDD75",
  goldDeep: "#8A6A1F",
  ember: "#FF8A3C", // accento caldo
  spark: "#4DA3FF", // blu elettrico

  // ── Esiti ───────────────────────────────────────────────────────────────
  win: "#3DDC97",
  lose: "#FF5C5C",
  warning: "#FF9F0A",
  muted: "#9AA0B5",

  // ── Colori risposte quiz (A/B/C/D) ──────────────────────────────────────
  answerA: "#E63946",
  answerB: "#2A9DF4",
  answerC: "#F4A61D",
  answerD: "#3DDC97",
} as const;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...palette,

        // ── Alias legacy usati dall'admin (NON rimuovere) ─────────────────
        background: palette.ink,
        surface: palette.panel,
        border: palette.line,
        accent: palette.spark,
        "accent-hover": "#6BB4FF",
        "gold-hover": palette.goldBright,
        neon: palette.spark,
        success: palette.win,
        danger: palette.lose,
      },
      boxShadow: {
        glow: "0 0 40px rgba(246, 198, 75, 0.25)",
        "glow-strong": "0 0 60px rgba(246, 198, 75, 0.4)",
        "glow-spark": "0 0 40px rgba(77, 163, 255, 0.25)",
        neu: "0 4px 20px rgba(0,0,0,0.4)",
        "neu-sm": "0 2px 10px rgba(0,0,0,0.3)",
        "neu-inset": "inset 0 0 0 1px rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Archivo Black",
          "Impact",
          "Arial Black",
          "sans-serif",
        ],
        sans: [
          "var(--font-sans)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out both",
        "slide-up": "slideUp 0.4s ease-out both",
        "reveal-flip": "revealFlip 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "podium-rise": "podiumRise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "score-pop": "scorePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "timer-panic": "timerPanic 1s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Reveal della risposta corretta: flip verticale stile cartellone TV
        revealFlip: {
          "0%": { opacity: "0", transform: "perspective(900px) rotateX(-88deg)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "perspective(900px) rotateX(0deg)" },
        },
        // Podio finale: la colonna sale dal basso
        podiumRise: {
          "0%": { opacity: "0", transform: "translateY(60%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Punteggio che si aggiorna: pop elastico
        scorePop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
        // Timer sotto i 5 secondi: pulsazione rossa
        timerPanic: {
          "0%, 100%": {
            color: "#FF5C5C",
            transform: "scale(1)",
            textShadow: "0 0 12px rgba(255, 92, 92, 0.5)",
          },
          "50%": {
            color: "#FF8A8A",
            transform: "scale(1.06)",
            textShadow: "0 0 30px rgba(255, 92, 92, 0.9)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
