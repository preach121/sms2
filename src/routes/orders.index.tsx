import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { listMyOrders } from "@/lib/fns/orders";
import { formatGhs } from "@/lib/utils";

export const Route = createFileRoute("/orders/")({ component: OrdersPage });

function OrdersPage() {
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => listMyOrders() });
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Orders</h1>
      <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-border">
        {(orders.data ?? []).map((order) => (
          <Link
            key={order.id}
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-elevated px-4 py-3 last:border-0 hover:bg-surface"
          >
            <div>
              <p className="font-medium">
                {order.serviceName} · {order.countryName}
              </p>
              <p className="font-mono text-xs text-muted">{order.phoneNumber ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm tabular-nums">{formatGhs(order.price)}</span>
              <StatusBadge status={order.status} />
            </div>
          </Link>
        ))}
        {(orders.data ?? []).length === 0 && (
          <p className="p-8 text-sm text-muted">You have not purchased a number yet.</p>
        )}
      </div>
    </AppShell>
  );
}
