"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Larghezza massima del pannello (default max-w-lg) */
  maxWidthClassName?: string;
  /** Impedisce la chiusura da overlay/Escape (es. giudizio obbligatorio) */
  dismissable?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-lg",
  dismissable = true,
  className,
}: ModalProps) {
  // Chiudi con Escape + blocca lo scroll del body finché il modal è aperto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Chiudi"
        tabIndex={-1}
        onClick={dismissable ? onClose : undefined}
        className={cn(
          "absolute inset-0 bg-ink/80 backdrop-blur-sm animate-fade-in",
          !dismissable && "cursor-default",
        )}
      />
      {/* Pannello */}
      <div
        className={cn(
          "card relative z-10 w-full animate-slide-up",
          maxWidthClassName,
          className,
        )}
      >
        {title && (
          <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-gold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;
