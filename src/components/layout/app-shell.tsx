import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ListOrdered, LogOut, Menu, Moon, ShoppingBag, Sun, UserRound, Wallet, X, Shield } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme";
import { RedirectToSignIn, SignedIn, SignedOut } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAccount } from "@/lib/fns/account";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/orders", label: "Orders", icon: ListOrdered },
  { to: "/account", label: "Account", icon: UserRound },
];

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  const { theme, toggle } = useTheme();
  if (isPending) {
    return <div className="h-11 w-28 animate-pulse rounded-[var(--radius-sm)] bg-surface" />;
  }
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-fg"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      {user ? (
        <Link
          to="/account"
          className="hidden items-center gap-2 rounded-full border border-border bg-bg-elevated py-1 pl-1 pr-3 text-sm md:inline-flex"
        >
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-medium text-accent">
              {(user.displayName ?? "U").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="max-w-28 truncate">{user.displayName ?? "Account"}</span>
        </Link>
      ) : (
        <Button asChild size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      )}
    </div>
  );
}

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link to="/marketplace" className="hover:text-fg">
            Marketplace
          </Link>
          <Link to="/marketplace" search={{ category: "dating", service: "559" }} className="hover:text-fg">
            Dating
          </Link>
          <Link to="/terms" className="hover:text-fg">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-fg">
            Privacy
          </Link>
        </nav>
        <AuthSlot />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => getAccount(),
    enabled: Boolean(user),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-muted">
        <div className="h-10 w-40 animate-pulse rounded-full bg-surface" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const links = [
    ...(account.data?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
    ...LINKS,
  ];

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-[var(--radius-sm)] hover:bg-surface md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface hover:text-fg"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <SignedIn>
            <span className="hidden text-sm text-muted sm:inline">{user.displayName ?? user.primaryEmail}</span>
          </SignedIn>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl">
        <aside
          className={cn(
            "fixed inset-y-16 left-0 z-20 w-64 border-r border-border bg-bg p-3 md:static md:block md:min-h-[calc(100dvh-4rem)]",
            open ? "block" : "hidden",
          )}
        >
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.to || pathname.startsWith(`${link.to}/`);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm",
                    active ? "bg-surface text-fg" : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
            <SignedOut>
              <Link to="/login" className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm text-muted">
                Sign in
              </Link>
            </SignedOut>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut("/").catch(() => setSigningOut(false));
              }}
              className="mt-4 flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-left text-sm text-muted hover:bg-surface hover:text-fg"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Log out"}
            </button>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
