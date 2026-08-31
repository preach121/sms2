import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-sm text-fg placeholder:text-subtle outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-accent/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
