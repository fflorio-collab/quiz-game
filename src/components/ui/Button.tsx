"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "danger";
// "xl" = taglia da TV/proiettore, leggibile da lontano
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra uno spinner e disabilita il bottone */
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[13px]",
  md: "", // default della classe .btn
  lg: "px-8 py-4 text-lg",
  xl: "px-10 py-5 text-2xl rounded-[2rem]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading = false, className, children, disabled, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variantClass[variant], sizeClass[size], className)}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden
            className="h-[1em] w-[1em] animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);

export default Button;
