import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cancelOrder, completeOrder, getOrder, refreshOrder } from "@/lib/fns/orders";
import { formatGhs } from "@/lib/utils";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderPage });

function useCountdown(iso: string | null) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!iso) return;
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) {
        setLeft("Expired");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return left;
}

function OrderPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
  });

  useEffect(() => {
    if (!order.data) return;
    if (order.data.status !== "active" && order.data.status !== "processing") return;
    let cancelled = false;
    const tick = () => {
      void refreshOrder({ data: { orderId } })
        .then((data) => {
          if (!cancelled) qc.setQueryData(["order", orderId], data);
        })
        .catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [order.data?.status, orderId, qc]);
  const refresh = useMutation({
    mutationFn: () => refreshOrder({ data: { orderId } }),
    onSuccess: (data) => {
      qc.setQueryData(["order", orderId], data);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Refresh failed"),
  });
  const cancel = useMutation({
    mutationFn: () => cancelOrder({ data: { orderId } }),
    onSuccess: (data) => {
      qc.setQueryData(["order", orderId], data);
      toast.success("Order cancelled and wallet refunded.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cancel failed"),
  });
  const complete = useMutation({
    mutationFn: () => completeOrder({ data: { orderId } }),
    onSuccess: (data) => qc.setQueryData(["order", orderId], data),
  });
  const data = order.data;
  const left = useCountdown(data?.expiresAt ?? null);

  return (
    <AppShell>
      <p className="text-xs uppercase tracking-wider text-subtle">Purchase</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{data?.serviceName ?? "Order"}</h1>
        {data && <StatusBadge status={data.status} />}
      </div>
      {order.isLoading && <div className="mt-6 h-48 animate-pulse rounded-[var(--radius-xl)] bg-surface" />}
      {data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <p className="text-xs uppercase tracking-wider text-subtle">Number</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="font-mono text-2xl tracking-tight">{data.phoneNumber ?? "Assigning…"}</p>
              {data.phoneNumber && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(data.phoneNumber ?? "");
                    toast.success("Copied");
                  }}
                  aria-label="Copy number"
                >
                  <Copy className="size-4" />
                </Button>
              )}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-subtle">Country</dt>
                <dd className="mt-1">{data.countryName}</dd>
              </div>
              <div>
                <dt className="text-subtle">Service</dt>
                <dd className="mt-1">{data.serviceName}</dd>
              </div>
              <div>
                <dt className="text-subtle">Price</dt>
                <dd className="mt-1 font-mono tabular-nums">{formatGhs(data.customerPrice)}</dd>
              </div>
              <div>
                <dt className="text-subtle">Time remaining</dt>
                <dd className="mt-1 font-mono tabular-nums">{left || "—"}</dd>
              </div>
            </dl>
            {data.errorMessage && <p className="mt-4 text-sm text-danger">{data.errorMessage}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                <RefreshCw className="size-4" />
                Refresh SMS
              </Button>
              {data.status === "sms_received" && (
                <Button variant="secondary" onClick={() => complete.mutate()}>
                  Mark completed
                </Button>
              )}
              {["active", "processing"].includes(data.status) && !data.smsCode && (
                <Button variant="secondary" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                  Cancel & refund
                </Button>
              )}
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wider text-subtle">Incoming SMS</p>
            {data.smsCode && (
              <p className="mt-3 font-mono text-3xl tracking-widest text-accent">{data.smsCode}</p>
            )}
            <ul className="mt-4 space-y-3">
              {data.messages.map((m) => (
                <li key={m.id} className="rounded-[var(--radius-md)] bg-surface p-3 text-sm">
                  <p className="text-xs text-subtle">{m.sender ?? "SMS"}</p>
                  <p className="mt-1">{m.body}</p>
                </li>
              ))}
              {data.messages.length === 0 && (
                <p className="text-sm text-muted">Waiting for the verification message…</p>
              )}
            </ul>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
