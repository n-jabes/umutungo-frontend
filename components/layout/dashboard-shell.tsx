"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/leases", label: "Leases", icon: FileText },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/portfolio", label: "Portfolio", icon: LineChart },
] as const;

function NavLinks({
  onNavigate,
  variant,
}: {
  onNavigate?: () => void;
  variant: "sidebar" | "mobile-bar" | "mobile-drawer";
}) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "flex gap-1",
        variant === "sidebar" && "flex-col",
        variant === "mobile-bar" && "w-full justify-around px-1",
        variant === "mobile-drawer" && "flex-col",
      )}
    >
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              variant === "mobile-bar" && "flex-col gap-1 py-2 text-[11px]",
              active
                ? "bg-blue-soft text-main-blue"
                : "text-muted hover:bg-muted-bg hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-main-blue" : "text-muted",
                variant === "mobile-bar" && "h-5 w-5",
              )}
              strokeWidth={1.75}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card/80 px-4 py-8 backdrop-blur-sm lg:flex lg:flex-col">
          <Logo className="px-2" size="sm" />
          <div className="mt-10 flex-1">
            <NavLinks variant="sidebar" />
          </div>
          <div className="mt-auto space-y-3 border-t border-border pt-6">
            <p className="truncate px-2 text-xs font-medium text-foreground">{user?.name}</p>
            <p className="truncate px-2 text-[11px] text-muted">
              {user?.email ?? user?.phone ?? "Account"}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-start gap-2"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-md lg:hidden">
            <Logo showTagline={false} size="sm" />
            <button
              type="button"
              className="rounded-lg border border-border bg-card p-2 text-foreground shadow-card transition hover:shadow-card-hover"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md lg:hidden",
        )}
      >
        <NavLinks variant="mobile-bar" />
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,320px)] flex-col border-l border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Logo showTagline={false} size="sm" />
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-muted-bg hover:text-foreground"
                aria-label="Close"
                onClick={() => setDrawer(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <NavLinks variant="mobile-drawer" onNavigate={() => setDrawer(false)} />
            </div>
            <div className="border-t border-border p-4">
              <p className="mb-1 text-sm font-medium">{user?.name}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => void logout()}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
