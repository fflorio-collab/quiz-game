"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Alone dorato attorno alla card (per elementi protagonisti) */
  glow?: boolean;
  /** Rimuove il padding interno di default */
  flush?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { glow = false, flush = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("card", flush && "p-0", glow && "shadow-glow border-gold/30", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Card;
