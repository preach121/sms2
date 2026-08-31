import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authClient, signOut } from "@/lib/auth/client";
import {
  beginTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  getAccount,
  updateAccount,
} from "@/lib/fns/account";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const qc = useQueryClient();
  const account = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);

  const save = useMutation({
    mutationFn: updateAccount,
    onSuccess: () => {
      toast.success("Profile saved");
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
  });

  const start2fa = useMutation({
    mutationFn: () => beginTwoFactor(),
    onSuccess: (data) => setSetup(data),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not start 2FA"),
  });

  const confirm2fa = useMutation({
    mutationFn: confirmTwoFactor,
    onSuccess: () => {
      setSetup(null);
      setTotp("");
      toast.success("Two-factor authentication is on");
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Invalid code"),
  });

  const stop2fa = useMutation({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      setTotp("");
      toast.success("Two-factor authentication is off");
      void qc.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Invalid code"),
  });

  const profile = account.data;
  const nameValue = displayName || profile?.displayName || "";
  const phoneValue = phone || profile?.phone || "";

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Account</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Profile</CardTitle>
          <CardDesc className="mt-1">{profile?.email}</CardDesc>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={profile?.emailVerified ? "ok" : "warn"}>
              {profile?.emailVerified ? "Email verified" : "Email unverified"}
            </Badge>
            <Badge tone="accent">{profile?.role === "admin" ? "Admin" : "Customer"}</Badge>
          </div>
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ data: { displayName: nameValue, phone: phoneValue } });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={nameValue}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phoneValue} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={save.isPending}>
              Save profile
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Password</CardTitle>
          <CardDesc className="mt-1">Change the password for email sign-in.</CardDesc>
          <form
            className="mt-5 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { error } = await authClient.changePassword({
                  currentPassword,
                  newPassword,
                  revokeOtherSessions: true,
                });
                if (error) {
                  toast.error(error.message);
                  return;
                }
                setCurrentPassword("");
                setNewPassword("");
                toast.success("Password updated");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Password change failed");
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next">New password</Label>
              <Input
                id="next"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Update password</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDesc className="mt-1">
            Optional authenticator-app codes. Add SMS2 to your app using the secret, then confirm a code.
          </CardDesc>
          <p className="mt-3 text-sm">
            Status: {profile?.twoFactorEnabled ? "On" : "Off"}
          </p>
          {setup && (
            <div className="mt-4 rounded-[var(--radius-md)] bg-surface p-3 text-sm">
              <p className="text-muted">Secret</p>
              <p className="mt-1 break-all font-mono">{setup.secret}</p>
              <p className="mt-3 break-all text-xs text-subtle">{setup.uri}</p>
            </div>
          )}
          <div className="mt-4 space-y-3">
            <Input
              placeholder="6-digit code"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              inputMode="numeric"
            />
            <div className="flex flex-wrap gap-2">
              {!profile?.twoFactorEnabled && !setup && (
                <Button type="button" onClick={() => start2fa.mutate()}>
                  Set up 2FA
                </Button>
              )}
              {setup && (
                <Button type="button" onClick={() => confirm2fa.mutate({ data: { code: totp } })}>
                  Confirm 2FA
                </Button>
              )}
              {profile?.twoFactorEnabled && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => stop2fa.mutate({ data: { code: totp } })}
                >
                  Disable 2FA
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Logout</CardTitle>
          <CardDesc className="mt-1">End this session on this device.</CardDesc>
          <Button className="mt-5" variant="secondary" onClick={() => void signOut("/")}>
            Log out
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
