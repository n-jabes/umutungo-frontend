"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { CatalogPlanCards } from "@/components/marketing/catalog-plan-cards";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/** Full-page decorative layers — performance-friendly (transform/GPU, no JS). */
function AmbientField({ variant }: { variant: "hero" | "section" | "features" }) {
  const gridStyle =
    variant === "hero"
      ? {
          backgroundImage: `linear-gradient(to right, rgba(30, 58, 138, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(30, 58, 138, 0.06) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }
      : {
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 opacity-[0.65]" style={gridStyle} />
      {variant === "hero" ? (
        <>
          <div className="absolute -left-[20%] top-0 h-[min(520px,80vw)] w-[min(520px,80vw)] rounded-full bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.18)_0%,transparent_68%)] blur-2xl" />
          <div className="absolute -right-[15%] top-1/4 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,83,45,0.12)_0%,transparent_65%)] blur-2xl" />
          <div className="absolute bottom-0 left-1/2 h-px w-[min(900px,90%)] -translate-x-1/2 bg-gradient-to-r from-transparent via-main-blue/25 to-transparent" />
        </>
      ) : null}
      {variant === "section" ? (
        <>
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-main-blue/[0.06] blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-main-green/[0.05] blur-3xl" />
          <div className="absolute right-[8%] top-[12%] h-px w-32 rotate-[-38deg] bg-gradient-to-r from-transparent via-accent-gold/40 to-transparent" />
        </>
      ) : null}
      {variant === "features" ? (
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-main-blue/15 via-transparent to-transparent" />
      ) : null}
    </div>
  );
}

function AppScreenMock({ title, highlight, children }: { title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl p-[1px] shadow-xl transition duration-500",
        highlight
          ? "bg-gradient-to-br from-main-blue/35 via-border to-accent-gold/30 shadow-main-blue/10"
          : "bg-gradient-to-br from-border via-card to-border shadow-black/[0.04]",
      )}
    >
      <div className="relative overflow-hidden rounded-[15px] border border-border/80 bg-card ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-border/90 bg-gradient-to-r from-muted-bg/90 to-background px-3 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90" />
          </span>
          <span className="flex-1 text-center font-mono text-[10px] font-medium tracking-tight text-muted">
            {title}
          </span>
          <span className="w-10" />
        </div>
        <div className="bg-gradient-to-b from-background to-muted-bg/30 p-3.5 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

/** High-fidelity illustrative dashboard (not live data). */
function PreviewDashboardRich() {
  const bars = [40, 65, 45, 88, 52, 72, 58];
  return (
    <div className="flex gap-2.5">
      <div className="flex w-9 shrink-0 flex-col items-center gap-2 rounded-lg bg-slate-900 py-2.5">
        <div className="h-7 w-7 rounded-md bg-white/12 ring-1 ring-white/10" />
        <div className="h-7 w-7 rounded-md bg-white/[0.06]" />
        <div className="h-7 w-7 rounded-md bg-white/[0.06]" />
        <div className="mt-auto h-7 w-7 rounded-full bg-white/10" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Overview</p>
            <p className="text-xs font-semibold text-foreground">April 2026</p>
          </div>
          <div className="hidden h-7 max-w-[140px] flex-1 rounded-md border border-border bg-background px-2 text-[10px] leading-7 text-muted sm:block">
            Search portfolio…
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Collected", value: "42.3M", sub: "RWF", delta: "+2.1%", up: true },
            { label: "Outstanding", value: "8.1M", sub: "RWF", delta: "4 leases", up: false },
            { label: "Occupancy", value: "94%", sub: "units", delta: "+3%", up: true },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border/80 bg-card px-2 py-2 shadow-sm"
            >
              <p className="text-[9px] font-medium text-muted">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums-fin text-foreground">
                {s.value}
                <span className="ml-0.5 text-[9px] font-normal text-muted">{s.sub}</span>
              </p>
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-0.5 text-[9px] font-medium",
                  s.up ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400",
                )}
              >
                {s.up ? <TrendingUp className="h-2.5 w-2.5" strokeWidth={2} /> : null}
                {s.delta}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border/80 bg-card p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground">Income trend</span>
            <span className="text-[9px] text-muted">Last 7 periods</span>
          </div>
          <div className="flex h-14 items-end justify-between gap-1 px-0.5">
            {bars.map((h, i) => (
              <div
                key={i}
                className="w-full max-w-[14px] rounded-t-sm bg-gradient-to-t from-main-blue to-main-blue/50 opacity-90"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted">Activity</p>
          {[
            { t: "Rent recorded", d: "Unit 3B · Gishushu", time: "2h", tone: "emerald" as const },
            { t: "Lease review", d: "Block A renewal", time: "1d", tone: "amber" as const },
          ].map((row) => (
            <div
              key={row.t}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  row.tone === "emerald" ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-foreground">{row.t}</p>
                <p className="truncate text-[9px] text-muted">{row.d}</p>
              </div>
              <span className="shrink-0 text-[9px] text-muted">{row.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewAssetsRich() {
  const rows = [
    { name: "Gishushu apartments", loc: "Gasabo", type: "Residential", occ: "12 / 14", badge: "Strong" },
    { name: "Nyabugogo mixed-use", loc: "Nyarugenge", type: "Mixed", occ: "8 / 10", badge: "Watch" },
    { name: "Musanze land", loc: "Musanze", type: "Land", occ: "—", badge: "Pipeline" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-soft text-main-blue">
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Assets</p>
            <p className="text-[9px] text-muted">3 properties · 24 units</p>
          </div>
        </div>
        <span className="rounded-md bg-main-blue px-2 py-1 text-[9px] font-semibold text-white">+ New</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
        <div className="grid grid-cols-[1fr_0.7fr_0.55fr_0.5fr] gap-1 border-b border-border/80 bg-muted-bg/50 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-wider text-muted">
          <span>Name</span>
          <span>Location</span>
          <span className="text-center">Occ.</span>
          <span className="text-right">Signal</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.name}
            className="grid grid-cols-[1fr_0.7fr_0.55fr_0.5fr] items-center gap-1 border-b border-border/50 px-2 py-2 text-[10px] last:border-0"
          >
            <span className="truncate font-medium text-foreground">{r.name}</span>
            <span className="flex items-center gap-0.5 truncate text-muted">
              <MapPin className="h-2.5 w-2.5 shrink-0 opacity-70" />
              {r.loc}
            </span>
            <span className="text-center font-mono tabular-nums-fin text-foreground">{r.occ}</span>
            <span className="text-right">
              <span
                className={cn(
                  "inline-block rounded px-1.5 py-0.5 text-[8px] font-semibold",
                  r.badge === "Strong" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
                  r.badge === "Watch" && "bg-amber-500/15 text-amber-900 dark:text-amber-300",
                  r.badge === "Pipeline" && "bg-slate-500/10 text-muted",
                )}
              >
                {r.badge}
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] leading-relaxed text-muted">
        Illustrative UI — connect your portfolio to see live occupancy and valuations.
      </p>
    </div>
  );
}

function PreviewLeasesRich() {
  const leases = [
    { unit: "Unit 3B", tenant: "M. Hakizimana", rent: "450,000", pct: 88, status: "Current", tone: "emerald" as const },
    { unit: "A-12", tenant: "Co. Ltd lease", rent: "2.1M", pct: 45, status: "Partial", tone: "amber" as const },
    { unit: "Parcel B", tenant: "—", rent: "—", pct: 0, status: "Vacant", tone: "slate" as const },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">Active leases</p>
          <p className="text-[9px] text-muted">Coverage vs expected rent</p>
        </div>
        <Calendar className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
      </div>
      <div className="space-y-2">
        {leases.map((L) => (
          <div key={L.unit} className="rounded-lg border border-border/80 bg-card p-2 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-main-blue/20 to-main-blue/5 text-[10px] font-bold text-main-blue">
                  {L.tenant === "—" ? "—" : L.tenant.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-foreground">{L.unit}</p>
                  <p className="truncate text-[9px] text-muted">{L.tenant}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold tabular-nums-fin text-foreground">{L.rent}</p>
                <p className="text-[8px] text-muted">RWF / mo</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-bg">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    L.tone === "emerald" && "bg-emerald-500",
                    L.tone === "amber" && "bg-amber-500",
                    L.tone === "slate" && "bg-slate-300 dark:bg-slate-600",
                  )}
                  style={{ width: `${L.pct}%` }}
                />
              </div>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold",
                  L.tone === "emerald" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
                  L.tone === "amber" && "bg-amber-500/15 text-amber-900 dark:text-amber-300",
                  L.tone === "slate" && "bg-muted-bg text-muted",
                )}
              >
                {L.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1 text-[9px] font-medium text-main-blue">
        Open lease timeline
        <ChevronRight className="h-3 w-3" strokeWidth={2} />
      </p>
    </div>
  );
}

const testimonials = [
  {
    quote:
      "We moved three buildings and a land parcel into Umutungo in one weekend. Rent status and lease timelines finally match how we actually work.",
    name: "Jeanne Mukamana",
    role: "Portfolio manager, Kigali",
  },
  {
    quote:
      "My agents see only what they need; I keep full control. The plan limits are clear before we add another unit — no surprises at month-end.",
    name: "David Nkurunziza",
    role: "Owner, 42 units",
  },
  {
    quote:
      "Reporting is calm and factual. We use it in investor updates without rebuilding spreadsheets from five different folders.",
    name: "Aline Uwase",
    role: "Finance lead, development group",
  },
];

export function MarketingHome() {
  const plansQuery = useQuery({
    queryKey: queryKeys.publicPricingPlans,
    queryFn: () => api.getPublicPricingPlans(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <AmbientField variant="hero" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="relative z-10 flex items-center gap-2">
            <Logo />
          </Link>
          <nav className="relative z-10 hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#product" className="transition hover:text-foreground">
              Product
            </a>
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-foreground">
              Plans
            </a>
            <a href="#testimonials" className="transition hover:text-foreground">
              Customers
            </a>
          </nav>
          <div className="relative z-10 flex items-center gap-2 sm:gap-3">
            <Link href="/login" className={cn("hidden text-sm font-medium text-muted hover:text-foreground sm:inline")}>
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5 shadow-md shadow-main-blue/15">
                Get started
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative overflow-hidden border-b border-border/80">
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:pb-28 lg:pt-24">
            <div className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full border border-main-blue/10 opacity-60" />
            <div className="pointer-events-none absolute -left-8 bottom-10 h-40 w-40 rounded-full border border-accent-gold/20 opacity-50" />
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-main-blue/15 bg-gradient-to-r from-card to-blue-soft/40 px-3 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/[0.03]">
                <Sparkles className="h-3.5 w-3.5 text-accent-gold" strokeWidth={1.75} />
                Built for serious landlords and asset teams
              </p>
              <h1 className="mt-6 bg-gradient-to-br from-foreground via-foreground to-main-blue bg-clip-text text-balance text-4xl font-semibold tracking-tight text-transparent sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                Asset, lease, and rent intelligence — in one disciplined workspace.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted sm:text-xl">
                Model your portfolio, track obligations, and give agents a safe scope — with entitlements that match the
                plan you choose at signup.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="min-w-[200px] gap-2 shadow-lg shadow-main-blue/20">
                    Create account
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </Link>
                <a href="#product">
                  <Button variant="secondary" size="lg" className="min-w-[200px] border-border/80 bg-card/80 backdrop-blur-sm">
                    View product tour
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="relative border-b border-border/80 py-20 sm:py-24">
          <AmbientField variant="section" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-main-blue">Product tour</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Inside the workspace</h2>
              <p className="mt-3 text-muted">
                Rich previews of the live app structure — metrics, tables, and lease health as your team would see them
                after onboarding.
              </p>
            </div>
            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              <AppScreenMock title="app.umutungo.io/dashboard" highlight>
                <PreviewDashboardRich />
              </AppScreenMock>
              <AppScreenMock title="app.umutungo.io/assets">
                <PreviewAssetsRich />
              </AppScreenMock>
              <AppScreenMock title="app.umutungo.io/leases">
                <PreviewLeasesRich />
              </AppScreenMock>
            </div>
          </div>
        </section>

        <section id="features" className="relative py-20 sm:py-24">
          <AmbientField variant="features" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Everything you expect from a modern ops stack
              </h2>
              <p className="mt-3 text-muted">Designed for multi-unit owners who outgrew spreadsheets but refuse chaos.</p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: LayoutDashboard,
                  title: "Operational dashboard",
                  body: "Portfolio signals, onboarding progress, and plan usage without opening five tabs.",
                },
                {
                  icon: Building2,
                  title: "Assets & units",
                  body: "Model properties and land, split into rentable units, and keep valuation history attached.",
                },
                {
                  icon: Users,
                  title: "Tenants & agents",
                  body: "Invite agents with scoped access while you retain full entitlement control as the owner.",
                },
                {
                  icon: FileSpreadsheet,
                  title: "Leases & obligations",
                  body: "Track coverage, periods, and rent status with audit-friendly changes.",
                },
                {
                  icon: BarChart3,
                  title: "Analytics & risk",
                  body: "Income series, occupancy, and risk views that stay aligned with your catalog plan matrix.",
                },
                {
                  icon: Shield,
                  title: "Plans that enforce themselves",
                  body: "Limits on units and agents come from your subscription — chosen at signup, visible in settings.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-main-blue/25 hover:shadow-lg hover:shadow-main-blue/[0.06]"
                >
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-main-blue/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-soft to-blue-soft/40 text-main-blue ring-1 ring-main-blue/10">
                    <f.icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="relative border-y border-border/80 bg-gradient-to-b from-muted-bg/50 via-muted-bg/30 to-background py-20 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(30,58,138,0.06),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Trusted by teams who ship
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              Placeholder testimonials for layout — replace with verified customer stories when you are ready.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <blockquote
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-border/80 bg-card/90 p-6 shadow-md shadow-black/[0.03] backdrop-blur-sm"
                >
                  <p className="flex-1 text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-6 border-t border-border/80 pt-4">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="relative py-20 sm:py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Plans & limits</h2>
              <p className="mt-3 text-muted">
                Pick a tier when you register. Limits below come from your live published catalog; card billing connects
                on the next screen (placeholder for now).
              </p>
            </div>
            <div className="mt-12">
              {plansQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-main-blue" strokeWidth={1.75} />
                </div>
              ) : plansQuery.isError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                  Could not load plans. Ensure the API is running and the entitlements catalog is seeded, then refresh.
                </p>
              ) : plansQuery.data && plansQuery.data.plans.length > 0 ? (
                <CatalogPlanCards plans={plansQuery.data.plans} mode="cta" />
              ) : (
                <p className="text-center text-sm text-muted">No published plans found. Run the database seed.</p>
              )}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/10 bg-main-blue py-16 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_45%,transparent_55%,rgba(212,175,55,0.08)_100%)]" />
          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Ready when you are</h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                Choose your plan, walk through mock checkout, and land in a workspace already aligned to your tier.
              </p>
            </div>
            <Link href="/register">
              <Button
                size="lg"
                className="border border-white/25 bg-white text-main-blue shadow-xl shadow-black/20 hover:bg-white/95"
              >
                Start free trial flow
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/80 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Register
            </Link>
            <span>© {new Date().getFullYear()} Umutungo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
