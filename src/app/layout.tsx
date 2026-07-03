import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import "./globals.css";

// Font del design system "Game show TV scuro":
// - Archivo Black (display): titoli, punteggi, timer — leggibile da 10 metri
// - Inter (sans): testo corrente
// Esposti come CSS variables e censiti in tailwind.config.ts
// (fontFamily.display / fontFamily.sans).
const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SUPER FABRI GAMES NIGHT",
  description:
    "La quiz-night definitiva di Fabri. Crea una partita, condividi il codice, sfida tutti dal tuo telefono.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
