import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { createDeposit, getWallet, getWalletHistory } from "@/lib/fns/wallet";
import { formatGhs } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const qc = useQueryClient();
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet() });
  const history = useQuery({ queryKey: ["wallet-history"], queryFn: () => getWalletHistory() });
  const [amount, setAmount] = useState("50");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const submit = useMutation({
    mutationFn: createDeposit,
    onSuccess: () => {
      toast.success("Deposit submitted. It stays pending until an admin verifies the payment.");
      setReference("");
      setNote("");
      void qc.invalidateQueries({ queryKey: ["wallet-history"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit deposit"),
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Wallet</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-xs uppercase tracking-wider text-subtle">Current balance</p>
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums">
            {formatGhs(wallet.data?.balance ?? 0)}
          </p>
          <CardTitle className="mt-8 text-base">Add Funds</CardTitle>
          <CardDesc className="mt-1">
            Pay the exact amount to Telecel Mobile Money, then submit the transaction details.
            Credits are applied only after admin verification.
          </CardDesc>
          <div className="mt-4 rounded-[var(--radius-md)] bg-surface p-4">
            <p className="text-xs uppercase tracking-wider text-subtle">Pay to</p>
            <p className="mt-1 font-medium">{wallet.data?.destination.network ?? "Telecel Mobile Money"}</p>
            <p className="mt-1 font-mono text-2xl tracking-wide">0508158717</p>
          </div>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate({
                data: {
                  amount: Number(amount),
                  payerName,
                  payerPhone,
                  reference,
                  note: note || undefined,
                  idempotencyKey: crypto.randomUUID(),
                },
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (GHS)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payerName">Name on the MoMo account</Label>
              <Input id="payerName" value={payerName} onChange={(e) => setPayerName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payerPhone">Sending number</Label>
              <Input id="payerPhone" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Transaction / reference ID</Label>
              <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit for verification"}
            </Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardTitle className="text-base">Deposits</CardTitle>
            <ul className="mt-3 divide-y divide-border">
              {(history.data?.deposits ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-mono tabular-nums">{formatGhs(row.amount)}</p>
                    <p className="text-xs text-subtle">Ref {row.reference}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </li>
              ))}
              {(history.data?.deposits ?? []).length === 0 && (
                <li className="py-6 text-sm text-muted">No deposits yet.</li>
              )}
            </ul>
          </Card>
          <Card>
            <CardTitle className="text-base">Transactions</CardTitle>
            <ul className="mt-3 divide-y divide-border">
              {(history.data?.transactions ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p>{row.description}</p>
                    <p className="text-xs text-subtle">{new Date(row.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="font-mono tabular-nums">
                    {row.amount > 0 ? "+" : ""}
                    {formatGhs(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle className="text-base">Purchase history</CardTitle>
            <ul className="mt-3 divide-y divide-border">
              {(history.data?.purchases ?? []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p>
                      {row.serviceName} · {row.countryName}
                    </p>
                    <p className="font-mono text-xs text-subtle">{row.phoneNumber ?? "—"}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
