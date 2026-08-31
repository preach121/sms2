import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Globe2, Heart, ShieldCheck, Wallet } from "lucide-react";
import { MarketingNav } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCatalogue } from "@/lib/fns/catalogue";
import { DATING_SPOTLIGHT_IDS } from "@/lib/n1sms/catalog";
import { formatGhs } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data } = useQuery({ queryKey: ["catalogue"], queryFn: () => getCatalogue() });
  const featured = (data?.offers ?? []).filter((o) => o.available).slice(0, 8);
  const dating =
    data?.datingFeatured ??
    DATING_SPOTLIGHT_IDS.map((id) => data?.services.find((s) => s.id === id)).filter(
      (s): s is NonNullable<typeof s> => Boolean(s),
    );

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <MarketingNav />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:pt-20">
          <Badge tone="accent">Temporary numbers · 100+ countries</Badge>
          <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Fast & Reliable SMS Verification
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            SMS2 is a reseller marketplace for one-time verification numbers.
            Live stock, a 50% transparent markup, and a wallet you control.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/marketplace">
                Buy Number <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/marketplace" search={{ category: "dating", service: "559" }}>
                Dating numbers
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/login">Sign Up / Login</Link>
            </Button>
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Countries", String(data?.stats.countryCount ?? "100+")],
              ["Services", String(data?.stats.serviceCount ?? "90+")],
              ["Dating apps", String(data?.stats.datingCount ?? data?.datingCount ?? "60+")],
              ["Markup", `${Math.round(((data?.markup ?? 1.5) - 1) * 100)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4">
                <dt className="text-xs uppercase tracking-wider text-subtle">{k}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-y border-border bg-bg-elevated">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-accent">
                  <Heart className="size-3.5" /> Dating
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">Match, OurTime, Plenty of Fish, and more</h2>
                <p className="mt-1 max-w-xl text-sm text-muted">
                  Numbers for the major dating apps — Match Group, Bumble, and independent sites included.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link to="/marketplace" search={{ category: "dating", service: "559" }}>
                  Browse dating
                </Link>
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(dating.length ? dating : [{ id: "559", name: "Match" }, { id: "680", name: "OurTime" }, { id: "724", name: "Plenty of Fish" }, { id: "926", name: "Tinder" }]).map(
                (service) => (
                  <Link
                    key={service.id}
                    to="/marketplace"
                    search={{ service: service.id, category: "dating" }}
                    className="rounded-[var(--radius-lg)] border border-border bg-bg p-4 hover:border-border-strong"
                  >
                    <p className="text-xs uppercase tracking-wider text-subtle">Dating</p>
                    <p className="mt-1 font-medium">{service.name}</p>
                    <p className="mt-3 text-sm text-accent">View numbers</p>
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
            {[
              {
                icon: Globe2,
                title: "Live catalogue",
                body: "Countries, services, stock and prices update live — never typed in by hand.",
              },
              {
                icon: Wallet,
                title: "Wallet first",
                body: "Deposit via Telecel Mobile Money 0508158717. Admin verifies payment before any credit lands.",
              },
              {
                icon: ShieldCheck,
                title: "Legitimate use only",
                body: "Built for testing, privacy, and account verification you own. Fraud and impersonation are banned.",
              },
            ].map((item) => (
              <article key={item.title} className="max-w-sm">
                <item.icon className="size-5 text-accent" />
                <h2 className="mt-3 font-display text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["1", "Create an account", "Sign up with email, Google, or X. The first account on a new SMS2 site is an admin."],
              ["2", "Add funds", "Send Telecel Mobile Money to 0508158717, then submit the reference. An admin verifies before credit."],
              ["3", "Buy a number", "Pick a service and country. SMS2 adds 50% to the live wholesale price and charges your wallet."],
              ["4", "Read the SMS", "Open the order page. Refresh or wait — the code appears as soon as it arrives."],
            ].map(([n, title, body]) => (
              <li key={n} className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4">
                <p className="font-mono text-xs text-accent">{n}</p>
                <h3 className="mt-2 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">Available right now</h2>
              <p className="mt-1 text-sm text-muted">Customer prices include the SMS2 markup.</p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/marketplace">Browse all</Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-surface" />
                ))
              : featured.map((offer) => (
                  <Link
                    key={`${offer.serviceId}-${offer.countryId}`}
                    to="/marketplace"
                    search={{ service: offer.serviceId, country: offer.countryId }}
                    className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4 hover:border-border-strong"
                  >
                    <p className="text-xs uppercase tracking-wider text-subtle">{offer.countryName}</p>
                    <p className="mt-1 font-medium">{offer.serviceName}</p>
                    <p className="mt-3 font-mono text-sm tabular-nums text-accent">{formatGhs(offer.customerPrice)}</p>
                  </Link>
                ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted">
          <span>© {new Date().getFullYear()} SMS2</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-fg">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link to="/acceptable-use" className="hover:text-fg">
              Acceptable Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
