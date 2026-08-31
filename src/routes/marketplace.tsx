import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, MarketingNav } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCatalogue, getOffers } from "@/lib/fns/catalogue";
import { purchaseNumber } from "@/lib/fns/orders";
import { getWallet } from "@/lib/fns/wallet";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  DATING_SPOTLIGHT_IDS,
  SERVICE_CATEGORIES,
  groupServices,
  serviceMatchesQuery,
} from "@/lib/n1sms/catalog";
import { formatGhs, cn } from "@/lib/utils";
import type { CatalogueOffer, ServiceCategory } from "@/lib/n1sms/types";

type MarketSearch = {
  service?: string;
  country?: string;
  q?: string;
  category?: string;
};

export const Route = createFileRoute("/marketplace")({
  validateSearch: (search: Record<string, unknown>): MarketSearch => ({
    service: typeof search.service === "string" ? search.service : undefined,
    country: typeof search.country === "string" ? search.country : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const { user, isPending } = useCurrentUserState();
  const inner = <Marketplace />;
  if (isPending) return inner;
  return user ? (
    <AppShell>{inner}</AppShell>
  ) : (
    <div className="min-h-dvh bg-bg">
      <MarketingNav />
      <div className="mx-auto max-w-6xl px-4 py-8">{inner}</div>
    </div>
  );
}

function Marketplace() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/marketplace" });
  const { user } = useCurrentUserState();
  const [q, setQ] = useState(search.q ?? "");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [pendingOffer, setPendingOffer] = useState<CatalogueOffer | null>(null);
  const catalogue = useQuery({ queryKey: ["catalogue"], queryFn: () => getCatalogue() });
  const category = (search.category as ServiceCategory | "all" | undefined) ?? "all";
  const allServices = catalogue.data?.services ?? [];
  const grouped = useMemo(() => groupServices(allServices), [allServices]);
  const categoryServices = useMemo(() => {
    if (category === "all") return allServices;
    return allServices.filter((s) => s.category === category);
  }, [allServices, category]);
  const queryMatches = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    return allServices.filter((s) => serviceMatchesQuery(s, query));
  }, [allServices, q]);

  const featuredDating = useMemo(
    () =>
      DATING_SPOTLIGHT_IDS.map((id) => allServices.find((s) => s.id === id)).filter(
        (s): s is NonNullable<typeof s> => Boolean(s),
      ),
    [allServices],
  );

  const datingList = useMemo(() => {
    const rows = allServices.filter((s) => s.category === "dating");
    const query = q.trim();
    if (category === "dating" && query) return rows.filter((s) => serviceMatchesQuery(s, query));
    return rows;
  }, [allServices, category, q]);

  const preferredService =
    (search.service && categoryServices.some((s) => s.id === search.service) ? search.service : undefined) ??
    (category === "dating" ? (featuredDating[0]?.id ?? categoryServices[0]?.id) : undefined) ??
    search.service ??
    catalogue.data?.featuredServiceId ??
    undefined;

  const serviceId = preferredService;
  const offersQuery = useQuery({
    queryKey: ["offers", serviceId],
    queryFn: () => getOffers({ data: { serviceId } }),
    enabled: Boolean(serviceId),
  });
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => getWallet(),
    enabled: Boolean(user),
  });
  const buy = useMutation({
    mutationFn: purchaseNumber,
    onSuccess: (order) => {
      setPendingOffer(null);
      toast.success("Number reserved. Waiting for SMS.");
      void navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Purchase failed"),
  });

  const data = offersQuery.data ?? catalogue.data;
  const offers = useMemo(() => {
    let rows = data?.offers ?? [];
    if (search.country) rows = rows.filter((o) => o.countryId === search.country);
    const query = q.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (o) =>
          o.serviceName.toLowerCase().includes(query) ||
          o.countryName.toLowerCase().includes(query) ||
          o.countryIso2.toLowerCase().includes(query),
      );
    }
    if (inStockOnly) rows = rows.filter((o) => o.available);
    return [...rows].sort((a, b) => Number(b.available) - Number(a.available) || a.countryName.localeCompare(b.countryName));
  }, [data, search.country, q, inStockOnly]);

  function setSearch(next: MarketSearch) {
    void navigate({ search: next });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Number marketplace</h1>
          <p className="mt-1 text-sm text-muted">
            Prices already include the {Math.round(((data?.markup ?? 1.5) - 1) * 100)}% SMS2 markup.
            {data?.status.connected
              ? " Live inventory."
              : " Showing last-known catalogue while inventory updates."}{" "}
            {catalogue.data?.datingCount ?? datingList.length} dating apps in stock, including Match, OurTime, and Plenty of Fish.
          </p>
        </div>
        <Badge tone={data?.status.connected ? "ok" : "warn"}>
          {data?.status.connected ? "Live inventory" : "Updating catalogue"}
        </Badge>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {SERVICE_CATEGORIES.map((item) => {
          const active = (item.id === "all" && category === "all") || item.id === category;
          const count =
            item.id === "all"
              ? allServices.length
              : allServices.filter((s) => s.category === item.id).length;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setSearch({
                  ...search,
                  category: item.id === "all" ? undefined : item.id,
                  service:
                    item.id === "dating"
                      ? (featuredDating[0]?.id ?? search.service)
                      : item.id === "all"
                        ? search.service
                        : allServices.find((s) => s.category === item.id)?.id,
                })
              }
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors",
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-bg-elevated text-muted hover:text-fg",
              )}
            >
              {item.id === "dating" ? <Heart className="size-3.5" /> : null}
              {item.label}
              {count > 0 ? <span className="tabular-nums text-xs text-subtle">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {category !== "dating" && featuredDating.length > 0 && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Dating apps</p>
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => setSearch({ ...search, category: "dating", service: featuredDating[0]?.id })}
            >
              View all {datingList.length}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {featuredDating.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSearch({ ...search, category: "dating", service: s.id })}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  serviceId === s.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-bg text-fg hover:border-border-strong",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {category === "dating" && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">
            Match, OurTime, Plenty of Fish, Tinder, Bumble, Hinge, and {Math.max(datingList.length - 6, 0)} more.
          </p>
          <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3">
            {datingList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSearch({ ...search, category: "dating", service: s.id })}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  serviceId === s.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-bg text-fg hover:border-border-strong",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {queryMatches.length > 0 && queryMatches.every((s) => s.id !== serviceId) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Matching services:</span>
          {queryMatches.slice(0, 8).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setQ("");
                setSearch({ ...search, service: s.id, category: s.category, q: undefined });
              }}
              className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-border-strong"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
        <label className="text-sm">
          <span className="mb-1.5 block text-muted">Service</span>
          <select
            className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-sm text-fg"
            value={serviceId ?? ""}
            onChange={(e) => setSearch({ ...search, service: e.target.value || undefined })}
          >
            {category === "all"
              ? grouped.map((group) => (
                  <optgroup key={group.category} label={group.label}>
                    {group.items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))
              : categoryServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-muted">Country</span>
          <select
            className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-sm text-fg"
            value={search.country ?? ""}
            onChange={(e) => setSearch({ ...search, country: e.target.value || undefined })}
          >
            <option value="">All countries</option>
            {(catalogue.data?.countries ?? data?.countries ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-muted">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-subtle" />
            <Input
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Match, OurTime, POF, Ghana…"
            />
          </div>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-muted">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          In stock only
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-border">
        <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.8fr] bg-surface px-4 py-2 text-xs uppercase tracking-wider text-subtle md:grid">
          <span>Service</span>
          <span>Country</span>
          <span>Stock</span>
          <span>Price</span>
          <span />
        </div>
        {(offersQuery.isLoading || catalogue.isLoading) && (
          <div className="h-40 animate-pulse bg-bg-elevated" />
        )}
        {!offersQuery.isLoading && !catalogue.isLoading && offers.length === 0 && (
          <p className="p-8 text-sm text-muted">No numbers match those filters.</p>
        )}
        {offers.map((offer) => (
          <div
            key={`${offer.serviceId}-${offer.countryId}`}
            className="grid items-center gap-2 border-t border-border px-4 py-3 md:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.8fr]"
          >
            <div>
              <p className="font-medium">{offer.serviceName}</p>
              <p className="text-xs text-subtle md:hidden">{offer.countryName}</p>
            </div>
            <p className="hidden text-sm text-muted md:block">{offer.countryName}</p>
            <p className="text-sm tabular-nums text-muted">
              {offer.available ? `${offer.stock} available` : "Unavailable"}
            </p>
            <p className="font-mono text-sm tabular-nums">{formatGhs(offer.customerPrice)}</p>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!offer.available || buy.isPending}
                onClick={() => {
                  if (!user) {
                    void navigate({ to: "/login" });
                    return;
                  }
                  setPendingOffer(offer);
                }}
              >
                Buy
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-subtle">
        Need a wallet first?{" "}
        <Link to="/wallet" className="underline">
          Add funds
        </Link>{" "}
        via Telecel 0508158717.
      </p>

      {pendingOffer && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-fg/40 p-4 md:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-buy-title"
        >
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
            <h2 id="confirm-buy-title" className="font-display text-xl font-semibold">
              Confirm purchase
            </h2>
            <p className="mt-2 text-sm text-muted">
              {pendingOffer.serviceName} · {pendingOffer.countryName}
            </p>
            <p className="mt-4 font-mono text-2xl tabular-nums">{formatGhs(pendingOffer.customerPrice)}</p>
            <p className="mt-1 text-xs text-subtle">Includes the SMS2 markup. Wallet is charged only if a number is assigned.</p>
            {wallet.data && wallet.data.balance < pendingOffer.customerPrice && (
              <p className="mt-3 text-sm text-danger">
                Insufficient balance ({formatGhs(wallet.data.balance)}).{" "}
                <Link to="/wallet" className="underline">
                  Add funds
                </Link>
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                disabled={
                  buy.isPending ||
                  wallet.isLoading ||
                  Boolean(wallet.data && wallet.data.balance < pendingOffer.customerPrice)
                }
                onClick={() => {
                  buy.mutate({
                    data: {
                      countryId: pendingOffer.countryId,
                      serviceId: pendingOffer.serviceId,
                      idempotencyKey: crypto.randomUUID(),
                    },
                  });
                }}
              >
                {buy.isPending ? "Buying…" : "Confirm buy"}
              </Button>
              <Button variant="secondary" onClick={() => setPendingOffer(null)} disabled={buy.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
