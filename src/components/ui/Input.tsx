"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Etichetta sopra il campo (opzionale) */
  label?: string;
  /** Messaggio di errore: bordo rosso + testo sotto il campo */
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-muted"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "input",
          error && "border-lose focus:border-lose",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && <p className="mt-1.5 text-sm text-lose">{error}</p>}
    </div>
  );
});

export default Input;
