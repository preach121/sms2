import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardStats, listMyOrders } from "@/lib/fns/orders";
import { formatGhs } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const stats = useQuery({ queryKey: ["dash-stats"], queryFn: () => getDashboardStats() });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => listMyOrders() });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Your wallet, live orders, and spend.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Wallet Balance", formatGhs(stats.data?.balance ?? 0)],
          ["Active Orders", String(stats.data?.activeOrders ?? 0)],
          ["Completed Orders", String(stats.data?.completedOrders ?? 0)],
          ["Total Spent", formatGhs(stats.data?.totalSpent ?? 0)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs uppercase tracking-wider text-subtle">{label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/marketplace">Buy Number</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/wallet">Add Funds</Link>
        </Button>
      </div>
      <h2 className="mt-10 font-display text-xl font-semibold">Recent orders</h2>
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-[var(--radius-xl)] border border-border">
        {(orders.data ?? []).slice(0, 8).map((order) => (
          <Link
            key={order.id}
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="flex items-center justify-between gap-3 bg-bg-elevated px-4 py-3 hover:bg-surface"
          >
            <div>
              <p className="font-medium">
                {order.serviceName} · {order.countryName}
              </p>
              <p className="font-mono text-xs text-muted">{order.phoneNumber ?? "Assigning…"}</p>
            </div>
            <StatusBadge status={order.status} />
          </Link>
        ))}
        {(orders.data ?? []).length === 0 && (
          <p className="bg-bg-elevated px-4 py-8 text-sm text-muted">No orders yet.</p>
        )}
      </div>
    </AppShell>
  );
}
