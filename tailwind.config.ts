import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#1d1d1f",
        border: "rgba(255, 255, 255, 0.1)",
        accent: "#2997ff",
        "accent-hover": "#3aa0ff",
        gold: "#fbbf24",
        "gold-hover": "#fcd34d",
        neon: "#2997ff",
        success: "#30d158",
        danger: "#ff453a",
        warning: "#ff9f0a",
        muted: "#a1a1a6",
      },
      boxShadow: {
        neu: "0 4px 20px rgba(0,0,0,0.4)",
        "neu-sm": "0 2px 10px rgba(0,0,0,0.3)",
        "neu-inset": "inset 0 0 0 1px rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "sans-serif"],
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "neon-flicker": "neonFlicker 2.5s infinite",
        "glow-pulse": "glowPulse 2.4s ease-in-out infinite",
        "float-slow": "floatSlow 6s ease-in-out infinite",
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
        neonFlicker: {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": {
            textShadow:
              "0 0 6px #ec4899, 0 0 18px #ec4899, 0 0 36px #a855f7, 0 0 72px #a855f7",
            opacity: "1",
          },
          "20%, 24%, 55%": { textShadow: "none", opacity: "0.85" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(236,72,153,0.35), 0 0 40px rgba(168,85,247,0.25)" },
          "50%": { boxShadow: "0 0 36px rgba(236,72,153,0.6), 0 0 72px rgba(168,85,247,0.45)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
