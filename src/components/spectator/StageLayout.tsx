"use client";

// Cornice del palco TV: header con logo + codice + "In diretta", poi layout a
// due colonne (contenuto principale + classifica laterale). Se `aside` è assente
// il contenuto occupa tutta la larghezza (lobby/podio).

import type { ReactNode } from "react";
import { CodeBadge, Logo } from "@/components/ui";
import { cn } from "@/lib/utils";
import { LivePill } from "./shared";

export interface StageLayoutProps {
  code: string;
  aside?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}

export function StageLayout({ code, aside, banner, children }: StageLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4 md:px-10">
        <Logo size="sm" />
        <div className="flex items-center gap-5">
          <LivePill className="hidden sm:inline-flex" />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted">Codice</div>
            <CodeBadge code={code} size="inline" />
          </div>
        </div>
      </header>

      {banner}

      <main
        className={cn(
          "grid flex-1 gap-6 p-5 md:p-8 xl:p-10",
          aside
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(300px,26vw,400px)]"
            : "grid-cols-1",
        )}
      >
        <section className="flex min-w-0 flex-col">{children}</section>
        {aside && (
          <aside className="card lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]">{aside}</aside>
        )}
      </main>
    </div>
  );
}

export default StageLayout;
