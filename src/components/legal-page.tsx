import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MarketingNav } from "@/components/layout/app-shell";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <MarketingNav />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs uppercase tracking-wider text-subtle">SMS2</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{title}</h1>
        <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
        <p className="mt-10 text-sm">
          <Link to="/" className="text-accent hover:underline">
            Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
