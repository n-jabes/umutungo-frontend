"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MoreHorizontal,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { type Workspace, useWorkspace } from "@/contexts/workspace-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, workspace: "rental" as Workspace },
  { href: "/assets", label: "Assets", icon: Building2, workspace: "all" as const },
  { href: "/tenants", label: "Tenants", icon: Users, workspace: "rental" as Workspace },
  { href: "/leases", label: "Leases", icon: FileText, workspace: "rental" as Workspace },
  { href: "/payments", label: "Payments", icon: Wallet, workspace: "rental" as Workspace },
  { href: "/portfolio", label: "Portfolio", icon: LineChart, workspace: "portfolio" as Workspace },
] as const;

function NavLinks({
  onNavigate,
  variant,
  workspace,
}: {
  onNavigate?: () => void;
  variant: "sidebar" | "mobile-bar" | "mobile-drawer";
  workspace: Workspace;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const filtered = nav.filter((item) => item.workspace === "all" || item.workspace === workspace);
  const mobilePrimary = filtered.slice(0, 4);
  const mobileOverflow = filtered.slice(4);

  if (variant === "mobile-bar") {
    return (
      <nav className="relative flex w-full items-center justify-between px-2">
        {mobilePrimary.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors duration-200",
                active ? "text-main-blue" : "text-muted",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-main-blue" : "text-muted")} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium text-muted transition hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
          More
        </button>
        {moreOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10"
              aria-label="Close more menu"
              onClick={() => setMoreOpen(false)}
            />
            <div className="absolute bottom-14 right-2 z-20 min-w-40 rounded-xl border border-border bg-card p-2 shadow-lg">
              {mobileOverflow.length ? (
                mobileOverflow.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => {
                      setMoreOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-muted-bg"
                  >
                    <Icon className="h-4 w-4 text-main-blue" strokeWidth={1.75} />
                    {label}
                  </Link>
                ))
              ) : (
                <p className="px-2 py-1 text-xs text-muted">No extra items</p>
              )}
            </div>
          </>
        ) : null}
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "flex gap-1",
        variant === "sidebar" && "flex-col",
        variant === "mobile-drawer" && "flex-col",
      )}
    >
      {filtered.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-blue-soft text-main-blue"
                : "text-muted hover:bg-muted-bg hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-main-blue" : "text-muted",
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
  const { workspace, setWorkspace } = useWorkspace();
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-card/80 px-4 py-8 backdrop-blur-sm lg:flex lg:flex-col">
          <Logo className="px-2" size="sm" />
          <WorkspaceSwitcher workspace={workspace} setWorkspace={setWorkspace} />
          <div className="mt-10 flex-1">
            <NavLinks variant="sidebar" workspace={workspace} />
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

        <div className="flex h-full min-h-0 flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-md lg:hidden">
            <div className="flex items-center gap-3">
              <Logo showTagline={false} size="sm" />
              <WorkspaceSwitcher workspace={workspace} setWorkspace={setWorkspace} compact />
            </div>
            <button
              type="button"
              className="rounded-lg border border-border bg-card p-2 text-foreground shadow-card transition hover:shadow-card-hover"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md lg:hidden",
        )}
      >
        <NavLinks variant="mobile-bar" workspace={workspace} />
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
              <WorkspaceSwitcher
                workspace={workspace}
                setWorkspace={setWorkspace}
                compact
                className="mb-4"
              />
              <NavLinks variant="mobile-drawer" workspace={workspace} onNavigate={() => setDrawer(false)} />
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

function WorkspaceSwitcher({
  workspace,
  setWorkspace,
  compact,
  className,
}: {
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mt-5 rounded-xl border border-border bg-muted-bg/50 p-1", compact && "mt-0", className)}>
      <p className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
        <BriefcaseBusiness className="h-3 w-3" strokeWidth={1.75} />
        Workspace
      </p>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setWorkspace("rental")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            workspace === "rental" ? "bg-card text-main-blue shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          Rental
        </button>
        <button
          type="button"
          onClick={() => setWorkspace("portfolio")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            workspace === "portfolio" ? "bg-card text-main-blue shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          Portfolio
        </button>
      </div>
    </div>
  );
}
