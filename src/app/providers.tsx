"use client";

// Nessun login nell'app: il provider è un semplice passthrough.
// (Mantenuto per non modificare src/app/layout.tsx.)
export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
