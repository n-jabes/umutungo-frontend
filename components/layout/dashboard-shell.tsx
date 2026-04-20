"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileText,
  GitCompareArrows,
  Home,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MoreHorizontal,
  TrendingUp,
  Users,
  Wallet,
  Settings,
  ScrollText,
  ShieldCheck,
  MessageSquareText,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/auth-context";
import { type Workspace, useWorkspace } from "@/contexts/workspace-context";
import { cn } from "@/lib/utils";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { PlanUsageBanner } from "@/components/plan/plan-usage-banner";
import { PlatformCommandPalette } from "@/components/platform/platform-command-palette";

/* ─────────────────────────────────────────────────────────────────
   Nav definitions — order here is the order they render
   Portfolio is the "home" of the portfolio workspace, so it leads.
───────────────────────────────────────────────────────────────── */
const navByWorkspace = {
  rental: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/assets",    label: "Assets",    icon: Building2 },
    { href: "/tenants",   label: "Tenants",   icon: Users },
    { href: "/leases",    label: "Leases",    icon: FileText },
    { href: "/payments",  label: "Payments",  icon: Wallet },
    { href: "/feedback",  label: "Feedback",  icon: MessageSquareText },
    { href: "/settings",  label: "Settings",  icon: Settings },
  ],
  portfolio: [
    { href: "/portfolio", label: "Portfolio", icon: LineChart },
    { href: "/assets",    label: "Assets",    icon: Building2 },
  ],
  /** Operator-only; tenants use `platformNavForTenant` at runtime. */
  platform: [
    { href: "/platform",               label: "Overview",      icon: ShieldCheck },
    { href: "/platform/plans",         label: "Plans",         icon: FileText },
    { href: "/platform/plans/compare", label: "Compare",       icon: GitCompareArrows },
    { href: "/platform/subscriptions", label: "Subscriptions", icon: Wallet },
    { href: "/platform/accounts",      label: "Accounts",      icon: Users },
    { href: "/admin/feedback",         label: "Feedback",      icon: MessageSquareText },
    { href: "/platform/audit",         label: "Audit",         icon: ScrollText },
  ],
} as const;

const platformNavForTenant = [
  { href: "/platform", label: "Overview", icon: ShieldCheck },
  { href: "/settings?tab=plan", label: "Plan & billing", icon: CreditCard },
  { href: "/feedback", label: "Feedback", icon: MessageSquareText },
] as const;

function isNavHrefActive(pathname: string, href: string, searchParams: ReturnType<typeof useSearchParams>) {
  if (href.includes("?")) {
    const [path, qs] = href.split("?");
    if (pathname !== path) return false;
    const want = new URLSearchParams(qs);
    for (const [k, v] of want.entries()) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  }
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

/* Home page per workspace — where to land when switching */
const workspaceHome: Record<Workspace, string> = {
  rental:    "/dashboard",
  portfolio: "/portfolio",
  platform:  "/platform",
};

/* ─────────────────────────────────────────────────────────────────
   NavLinks
───────────────────────────────────────────────────────────────── */
function NavLinks({
  onNavigate,
  variant,
  workspace,
  itemsOverride,
}: {
  onNavigate?: () => void;
  variant: "sidebar" | "mobile-bar" | "mobile-drawer";
  workspace: Workspace;
  itemsOverride?: ReadonlyArray<{ href: string; label: string; icon: React.ElementType }>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = itemsOverride ?? navByWorkspace[workspace];
  const mobilePrimary = items.slice(0, 4) as typeof items[number][];
  const mobileOverflow = items.slice(4) as typeof items[number][];

  if (variant === "mobile-bar") {
    return (
      <nav className="relative flex w-full items-center justify-between px-2">
        {mobilePrimary.map(({ href, label, icon: Icon }) => {
          const active = isNavHrefActive(pathname, href, searchParams);
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
              <Icon
                className={cn("h-4 w-4 shrink-0", active ? "text-main-blue" : "text-muted")}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}

        {mobileOverflow.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium text-muted transition hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
              More
            </button>
            {moreOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close more menu"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute bottom-14 right-2 z-20 min-w-40 rounded-xl border border-border bg-card p-2 shadow-lg">
                  {mobileOverflow.map(({ href, label, icon: Icon }) => (
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
                  ))}
                </div>
              </>
            )}
          </>
        )}
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
      {items.map(({ href, label, icon: Icon }) => {
        const active = isNavHrefActive(pathname, href, searchParams);
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

/* ─────────────────────────────────────────────────────────────────
   DashboardShell
───────────────────────────────────────────────────────────────── */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const isAgent = user?.role === "agent";
  const canUsePlatform = user?.role === "owner" || user?.role === "admin" || user?.role === "agent";

  const platformNavResolved = useMemo(
    () => (user?.role === "admin" ? navByWorkspace.platform : platformNavForTenant),
    [user?.role],
  );

  const navItems = useMemo(() => {
    if (isAgent) {
      if (workspace === "platform") return [...platformNavResolved];
      return navByWorkspace.rental.filter((item) =>
        ["/dashboard", "/leases", "/payments", "/settings"].includes(item.href),
      );
    }
    if (workspace === "platform") return [...platformNavResolved];
    return navByWorkspace[workspace];
  }, [isAgent, workspace, platformNavResolved]);
  const profileHref = "/settings?tab=profile";

  function handleWorkspaceSwitch(next: Workspace) {
    if (isAgent) {
      if (next === "portfolio") return;
      if (next === "platform" && !canUsePlatform) return;
      setWorkspace(next);
      router.push(workspaceHome[next]);
      return;
    }
    if (next === "platform" && !canUsePlatform) return;
    setWorkspace(next);
    router.push(workspaceHome[next]);
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-card/80 px-4 py-8 backdrop-blur-sm lg:flex lg:flex-col">
          <Logo className="px-2" size="sm" />
          <WorkspaceSwitcher
            workspace={workspace}
            onSwitch={handleWorkspaceSwitch}
            isAgent={isAgent}
            canUsePlatform={canUsePlatform}
            platformDescriptionOverride={user?.role !== "admin" ? "Your plan, usage & billing" : undefined}
          />
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            <NavLinks variant="sidebar" workspace={workspace} itemsOverride={navItems} />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-2">
              <Link href={profileHref} className="group min-w-0 flex flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-muted-bg">
                <UserRound className="h-4 w-4 shrink-0 text-muted group-hover:text-foreground" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-foreground">{user?.name ?? "Profile"}</span>
                  <span className="block truncate text-[11px] text-muted">{user?.email ?? user?.phone ?? "Account"}</span>
                </span>
              </Link>
              <button
                type="button"
                className="group relative rounded-lg p-2 text-muted transition hover:bg-muted-bg hover:text-foreground"
                aria-label="Logout"
                title="Logout"
                onClick={() => void logout()}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                <span className="pointer-events-none absolute -top-7 right-0 hidden rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-sm group-hover:block">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex h-full min-h-0 flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-4 py-3.5 backdrop-blur-md lg:hidden">
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

          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <EmailVerificationBanner />
            {workspace === "rental" && (user?.role === "owner" || user?.role === "agent") ? <PlanUsageBanner /> : null}
            {children}
          </main>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md lg:hidden">
        <NavLinks variant="mobile-bar" workspace={workspace} itemsOverride={navItems} />
      </div>

      {user?.role === "admin" && pathname.startsWith("/platform") ? <PlatformCommandPalette /> : null}

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
                onSwitch={(w) => {
                  handleWorkspaceSwitch(w);
                  setDrawer(false);
                }}
                isAgent={isAgent}
                canUsePlatform={canUsePlatform}
                platformDescriptionOverride={user?.role !== "admin" ? "Your plan, usage & billing" : undefined}
                className="mb-5"
              />
              <NavLinks variant="mobile-drawer" workspace={workspace} itemsOverride={navItems} onNavigate={() => setDrawer(false)} />
            </div>
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <Link href={profileHref} className="min-w-0 flex-1 rounded-lg border border-border bg-muted-bg/40 px-3 py-2">
                  <p className="truncate text-sm font-medium text-foreground">{user?.name ?? "Profile"}</p>
                  <p className="truncate text-xs text-muted">{user?.email ?? user?.phone ?? "Account"}</p>
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-border p-2 text-muted transition hover:bg-muted-bg hover:text-foreground"
                  aria-label="Logout"
                  title="Logout"
                  onClick={() => void logout()}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WorkspaceSwitcher
───────────────────────────────────────────────────────────────── */
const workspaceMeta: Record<Workspace, { label: string; icon: React.ElementType; description: string }> = {
  rental:    { label: "Rental",    icon: Home,       description: "Tenants, leases & payments" },
  portfolio: { label: "Portfolio", icon: TrendingUp, description: "Assets & performance" },
  platform:  { label: "Platform",  icon: ShieldCheck, description: "Plans, subscriptions & operations" },
};

function WorkspaceSwitcher({
  workspace,
  onSwitch,
  className,
  isAgent,
  canUsePlatform,
  platformDescriptionOverride,
}: {
  workspace: Workspace;
  onSwitch: (w: Workspace) => void;
  className?: string;
  isAgent?: boolean;
  canUsePlatform?: boolean;
  /** Shown under "Platform" for owners/agents (not admins). */
  platformDescriptionOverride?: string;
}) {
  const options = isAgent
    ? canUsePlatform
      ? (["rental", "platform"] as const)
      : (["rental"] as const)
    : canUsePlatform
      ? (["rental", "portfolio", "platform"] as const)
      : (["rental", "portfolio"] as const);

  return (
    <div className={cn("mt-5 space-y-1", className)}>
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
        Workspace
      </p>
      {options.map((w) => {
        const base = workspaceMeta[w];
        const { label, icon: Icon } = base;
        const description =
          w === "platform" && platformDescriptionOverride ? platformDescriptionOverride : base.description;
        const active = workspace === w;
        return (
          <button
            key={w}
            type="button"
            onClick={() => onSwitch(w)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
              active
                ? "border-main-blue/20 bg-blue-soft text-main-blue shadow-sm"
                : "border-transparent bg-muted-bg/50 text-muted hover:border-border hover:bg-muted-bg hover:text-foreground",
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                active ? "bg-main-blue/10" : "bg-card group-hover:bg-card",
              )}
            >
              <Icon
                className={cn("h-3.5 w-3.5", active ? "text-main-blue" : "text-muted group-hover:text-foreground")}
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight">{label}</p>
              <p className={cn("mt-0.5 truncate text-[10px] leading-tight", active ? "text-main-blue/70" : "text-muted")}>
                {description}
              </p>
            </div>
            {active && (
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-main-blue" />
            )}
          </button>
        );
      })}
    </div>
  );
}
