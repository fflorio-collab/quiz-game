import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizGame — Sfida i tuoi amici in tempo reale",
  description:
    "Quiz multiplayer online. Crea una partita, condividi il codice, risponde ognuno dal proprio telefono.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
