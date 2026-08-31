import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  getAdminOverview,
  listAdminDeposits,
  listAdminOrders,
  listAdminUsers,
  listAuditLogs,
  reviewDeposit,
  setUserRole,
  setUserStatus,
  updateMarkup,
  updateSupplierLogin,
} from "@/lib/fns/admin";
import { formatGhs } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => listAdminUsers() });
  const deposits = useQuery({ queryKey: ["admin-deposits"], queryFn: () => listAdminDeposits() });
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => listAdminOrders() });
  const logs = useQuery({ queryKey: ["admin-logs"], queryFn: () => listAuditLogs() });
  const [markup, setMarkup] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPassword, setSupplierPassword] = useState("");
  const o = overview.data;

  const refreshAll = () => {
    void qc.invalidateQueries();
  };

  const review = useMutation({
    mutationFn: reviewDeposit,
    onSuccess: () => {
      toast.success("Deposit updated");
      refreshAll();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Review failed"),
  });

  if (overview.isError) {
    return (
      <AppShell>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 text-sm text-danger">You need an admin role to open this dashboard.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted">Users, payments, orders, and supplier connection.</p>
        </div>
        <Badge tone={o?.provider.connected ? "ok" : "warn"}>
          {o?.provider.connected ? "Supplier connected" : "Supplier disconnected"}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total users", String(o?.users ?? 0)],
          ["Total sales", String(o?.orders ?? 0)],
          ["Revenue", formatGhs(o?.revenue ?? 0)],
          ["Profit / markup", formatGhs(o?.profit ?? 0)],
          ["Deposits pending", formatGhs(o?.deposits.pending.amount ?? 0)],
          ["Failed orders", String(o?.failedOrders ?? 0)],
          ["Refunds", formatGhs(o?.refunds.amount ?? 0)],
          ["Supplier balance", o?.provider.balance != null ? formatGhs(o.provider.balance) : "—"],
        ].map(([k, v]) => (
          <Card key={k} className="p-4">
            <p className="text-xs uppercase tracking-wider text-subtle">{k}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{v}</p>
          </Card>
        ))}
      </div>

      {o?.provider.lastError && (
        <p className="mt-4 text-sm text-warn">API: {o.provider.lastError}</p>
      )}

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Pricing / markup</h2>
        <p className="mt-1 text-sm text-muted">
          Customer price = wholesale × multiplier. Current multiplier: {o?.markup ?? 1.5}
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(markup);
            void updateMarkup({ data: { multiplier: n } })
              .then(() => {
                toast.success("Markup saved");
                refreshAll();
              })
              .catch((err) => toast.error(err instanceof Error ? err.message : "Save failed"));
          }}
        >
          <Input
            className="max-w-40"
            type="number"
            min={1}
            max={5}
            step="0.05"
            placeholder="1.50"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
          />
          <Button type="submit">Save markup</Button>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Supplier login</h2>
        <p className="mt-1 text-sm text-muted">
          Stored on the server only. Current login: {o?.supplierEmail ?? "not set"}.
          {o?.supplierConfigured ? " Saved." : " Not saved yet."}
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void updateSupplierLogin({ data: { email: supplierEmail, password: supplierPassword } })
              .then((res) => {
                toast.success(res.connected ? "Supplier connected" : "Login saved. Supplier is still reconnecting.");
                setSupplierPassword("");
                refreshAll();
              })
              .catch((err) => toast.error(err instanceof Error ? err.message : "Save failed"));
          }}
        >
          <Input
            className="max-w-64"
            type="email"
            placeholder="supplier email"
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
            required
          />
          <Input
            className="max-w-48"
            type="password"
            placeholder="supplier password"
            value={supplierPassword}
            onChange={(e) => setSupplierPassword(e.target.value)}
            required
          />
          <Button type="submit">Save supplier login</Button>
        </form>
      </Card>

      <h2 className="mt-10 font-display text-xl font-semibold">Payment verification</h2>
      <div className="mt-3 overflow-x-auto rounded-[var(--radius-xl)] border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(deposits.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <p>{row.email ?? row.userId.slice(0, 8)}</p>
                  <p className="text-xs text-subtle">
                    {row.payerName} · {row.payerPhone}
                  </p>
                </td>
                <td className="px-3 py-2 font-mono tabular-nums">{formatGhs(row.amount)}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.reference}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2">
                  {row.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ data: { depositId: row.id, action: "approve" } })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => review.mutate({ data: { depositId: row.id, action: "reject" } })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">User management</h2>
      <div className="mt-3 overflow-x-auto rounded-[var(--radius-xl)] border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Balance</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <p>{row.displayName ?? "—"}</p>
                  <p className="text-xs text-subtle">{row.email}</p>
                </td>
                <td className="px-3 py-2">{row.role}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{formatGhs(row.balance)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.status === "suspended" ? "rejected" : "approved"} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void setUserStatus({
                          data: { userId: row.id, status: row.status === "active" ? "suspended" : "active" },
                        }).then(refreshAll)
                      }
                    >
                      {row.status === "active" ? "Suspend" : "Restore"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void setUserRole({
                          data: { userId: row.id, role: row.role === "admin" ? "customer" : "admin" },
                        }).then(refreshAll)
                      }
                    >
                      {row.role === "admin" ? "Make customer" : "Make admin"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Orders</h2>
      <div className="mt-3 overflow-x-auto rounded-[var(--radius-xl)] border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Profit</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <p>
                    {row.serviceName} · {row.countryName}
                  </p>
                  <p className="font-mono text-xs text-subtle">{row.phoneNumber ?? "—"}</p>
                </td>
                <td className="px-3 py-2 text-xs">{row.email ?? row.userId.slice(0, 8)}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{formatGhs(row.customerPrice)}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{formatGhs(row.profit)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Audit log</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[var(--radius-xl)] border border-border bg-bg-elevated">
        {(logs.data ?? []).map((row) => (
          <li key={row.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{row.action}</p>
            <p className="text-xs text-subtle">
              {new Date(row.createdAt).toLocaleString()} · {row.entityType} {row.entityId}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
