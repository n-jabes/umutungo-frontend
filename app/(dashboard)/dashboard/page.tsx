"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  DoorOpen,
  Flame,
  Landmark,
  PiggyBank,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  AddAssetModal,
  AddTenantModal,
  RecordPaymentModal,
} from "@/components/dashboard/quick-dialogs";
import { StatCard } from "@/components/dashboard/stat-card";
import { api } from "@/lib/api";
import {
  currentMonth,
  formatCompactMoney,
  formatMoney,
  formatPercent,
  formatTimeAgo,
  monthRangeLastN,
} from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const IncomeChart = dynamic(
  () => import("@/components/charts/income-chart").then((m) => m.IncomeChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
        Loading chart…
      </div>
    ),
  },
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const month = currentMonth();
  const [assetOpen, setAssetOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"all" | "PAID" | "LATE" | "CRITICAL" | "VACANT">("all");
  const asOf = useMemo(() => toIsoDate(new Date()), []);
  const previousAsOf = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toIsoDate(d);
  }, []);

  const incomeQuery = useQuery({
    queryKey: queryKeys.income(month),
    queryFn: () => api.income(month),
  });
  const outstandingQuery = useQuery({
    queryKey: queryKeys.outstanding(month),
    queryFn: () => api.outstandingRent(month),
  });
  const occupancyQuery = useQuery({
    queryKey: queryKeys.occupancy,
    queryFn: () => api.occupancy(),
  });
  const assetsQuery = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });
  const leasesQuery = useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.listLeases(),
  });
  const tenantsQuery = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.listTenants(),
    enabled: user?.role !== "agent",
  });
  const unitsQuery = useQuery({
    queryKey: queryKeys.units(),
    queryFn: () => api.listUnits(),
    enabled: user?.role !== "agent",
  });
  const paymentsQuery = useQuery({
    queryKey: queryKeys.paymentSummary(month),
    queryFn: () => api.paymentSummary(month),
  });
  const portfolioStatusQuery = useQuery({
    queryKey: queryKeys.portfolioRentStatus(asOf),
    queryFn: () => api.getPortfolioRentStatus({ asOf }),
  });
  const portfolioStatusPreviousQuery = useQuery({
    queryKey: queryKeys.portfolioRentStatus(previousAsOf),
    queryFn: () => api.getPortfolioRentStatus({ asOf: previousAsOf }),
  });

  const chartRange = useMemo(() => monthRangeLastN(6), []);
  const incomeSeries = useQuery({
    queryKey: queryKeys.incomeSeries(chartRange.from, chartRange.to),
    queryFn: () => api.incomeSeries(chartRange.from, chartRange.to),
    select: (d) => d.series.map((p) => ({ month: p.month, income: p.totalIncome })),
  });

  const totalBookValue = useMemo(() => {
    if (!assetsQuery.data?.length) return 0;
    return assetsQuery.data.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  }, [assetsQuery.data]);

  const vacantCount = occupancyQuery.data?.vacant ?? 0;
  const hasAssets = (assetsQuery.data?.length ?? 0) > 0;
  const firstAssetId = assetsQuery.data?.[0]?.id;
  const hasUnits = (unitsQuery.data?.length ?? 0) > 0;
  const hasTenants = (tenantsQuery.data?.length ?? 0) > 0;
  const hasPayments = (paymentsQuery.data?.count ?? 0) > 0;
  const hasLeases = (leasesQuery.data?.length ?? 0) > 0;
  /** Leases need a unit; payments need a lease — enforce unit before lease in onboarding. */
  const onboardingDone = hasAssets && hasUnits && hasTenants && hasLeases && hasPayments;
  const nextAction = !hasAssets
    ? { href: "/assets", label: "Add your first property/asset" }
    : !hasUnits
      ? {
          href: firstAssetId ? `/assets/${firstAssetId}` : "/assets",
          label: "Add at least one unit (room, shop, etc.) under your property",
        }
      : !hasTenants
        ? { href: "/tenants", label: "Add your first tenant" }
        : !hasLeases
          ? { href: "/leases", label: "Create your first lease" }
          : !hasPayments
            ? { href: "/payments", label: "Record your first payment" }
            : null;
  const collectionRate =
    outstandingQuery.data && incomeQuery.data
      ? incomeQuery.data.totalIncome + outstandingQuery.data.outstanding > 0
        ? incomeQuery.data.totalIncome /
          (incomeQuery.data.totalIncome + outstandingQuery.data.outstanding)
        : 1
      : null;
  const latestDataSync = Math.max(
    incomeQuery.dataUpdatedAt,
    outstandingQuery.dataUpdatedAt,
    occupancyQuery.dataUpdatedAt,
    assetsQuery.dataUpdatedAt,
    incomeSeries.dataUpdatedAt,
    paymentsQuery.dataUpdatedAt,
    leasesQuery.dataUpdatedAt,
    tenantsQuery.dataUpdatedAt,
    unitsQuery.dataUpdatedAt,
  );
  const dataDiscrepancies = useMemo(() => {
    const items: string[] = [];
    if (occupancyQuery.data && occupancyQuery.data.totalUnits !== occupancyQuery.data.occupied + occupancyQuery.data.vacant) {
      items.push("Occupancy totals do not match occupied + vacant units.");
    }
    if ((outstandingQuery.data?.leasesWithBalance?.length ?? 0) > (leasesQuery.data?.length ?? 0)) {
      items.push("Overdue lease count exceeds loaded lease records.");
    }
    if (hasPayments && !hasLeases) {
      items.push("Payments exist but no leases are loaded.");
    }
    if (hasLeases && !hasUnits) {
      items.push("Leases exist but no units are registered — add units under your properties.");
    }
    return items;
  }, [
    hasLeases,
    hasPayments,
    hasUnits,
    leasesQuery.data,
    occupancyQuery.data,
    outstandingQuery.data?.leasesWithBalance?.length,
  ]);
  const leaseEndingSoon = useMemo(() => {
    const now = new Date();
    const inThirty = new Date();
    inThirty.setDate(now.getDate() + 30);
    return (leasesQuery.data ?? []).filter((lease) => {
      if (lease.status !== "active" || !lease.endDate) return false;
      const end = new Date(lease.endDate);
      return end >= now && end <= inThirty;
    });
  }, [leasesQuery.data]);
  const riskCounts = portfolioStatusQuery.data?.counts;
  const previousRiskCounts = portfolioStatusPreviousQuery.data?.counts;
  const riskRows = useMemo(() => {
    const rows = portfolioStatusQuery.data?.units ?? [];
    if (riskFilter === "all") return rows;
    return rows.filter((row) => row.rentStatus === riskFilter);
  }, [portfolioStatusQuery.data?.units, riskFilter]);

  if (workspace !== "rental") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Rental Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Switch to the Rental workspace to see income, outstanding rent, occupancy, and alerts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Financial pulse
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Live view of rent collected, exposure, occupancy, and portfolio book value for{" "}
            <span className="font-medium text-foreground">{month}</span>.
          </p>
          <p className="mt-2 text-xs text-muted">Last updated: {formatTimeAgo(latestDataSync)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role !== "agent" ? (
            <>
              <Button type="button" variant="secondary" className="gap-2" onClick={() => setAssetOpen(true)}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Add asset
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={() => setTenantOpen(true)}>
                <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                Add tenant
              </Button>
            </>
          ) : null}
          <Button type="button" className="gap-2" onClick={() => setPayOpen(true)}>
            <Wallet className="h-4 w-4" strokeWidth={1.75} />
            Record payment
          </Button>
        </div>
      </header>

      {user?.role !== "agent" && !onboardingDone ? (
        <Card className="border-main-blue/20 bg-blue-soft/35 p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Launch checklist: complete setup in 2-3 minutes</p>
              <p className="mt-1 text-sm text-muted">
                Follow this order: add a property, add at least one unit inside it, then tenant → lease → payment. You
                need a unit before you can create a lease.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                href="/assets"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {hasAssets ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Add property
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
              <Link
                href={firstAssetId ? `/assets/${firstAssetId}` : "/assets"}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                  <span className="inline-flex items-center gap-2">
                    {hasUnits ? <CheckCircle2 className="h-4 w-4 shrink-0 text-main-green" /> : <Circle className="h-4 w-4 shrink-0 text-muted" />}
                    Add unit
                  </span>
                  <span className="pl-6 text-[11px] leading-snug text-muted">Before any lease</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
              <Link
                href="/tenants"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {hasTenants ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Add tenant
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
              <Link
                href="/leases"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                  <span className="inline-flex items-center gap-2">
                    {hasLeases ? <CheckCircle2 className="h-4 w-4 shrink-0 text-main-green" /> : <Circle className="h-4 w-4 shrink-0 text-muted" />}
                    Create lease
                  </span>
                  <span className="pl-6 text-[11px] leading-snug text-muted">Needs a unit</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
              <Link
                href="/payments"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {hasPayments ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Record payment
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
            </div>
            {nextAction ? (
              <div className="flex items-center justify-between rounded-lg border border-main-blue/20 bg-background px-3 py-2.5 text-sm">
                <p className="inline-flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-main-blue" />
                  Next best action
                </p>
                <Link href={nextAction.href} className="inline-flex items-center gap-1 text-main-blue hover:underline">
                  {nextAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
            {!hasAssets ? (
              <div>
                <Button type="button" className="gap-2" onClick={() => setAssetOpen(true)}>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Add first asset
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Income (this month)"
          value={formatMoney(incomeQuery.data?.totalIncome ?? 0)}
          hint="Paid rent recognized in the ledger"
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          label="Outstanding rent"
          value={formatMoney(outstandingQuery.data?.outstanding ?? 0)}
          hint="Active leases still carrying a balance"
          icon={Landmark}
          tone="gold"
        />
        <StatCard
          label="Occupancy"
          value={
            occupancyQuery.data && occupancyQuery.data.totalUnits > 0
              ? formatPercent(occupancyQuery.data.rate)
              : "—"
          }
          hint={
            occupancyQuery.data && occupancyQuery.data.totalUnits > 0
              ? `${occupancyQuery.data.occupied} of ${occupancyQuery.data.totalUnits} units leased`
              : "Add units to measure occupancy"
          }
          icon={DoorOpen}
          tone="blue"
        />
        <StatCard
          label="Collection health"
          value={
            collectionRate === null
              ? "—"
              : `${collectionRate >= 0.9 ? "Strong" : collectionRate >= 0.75 ? "Watch" : "At risk"}`
          }
          hint={
            collectionRate === null
              ? "Calculated once rent data loads"
              : `${formatPercent(collectionRate)} of expected rent collected`
          }
          icon={ShieldCheck}
          tone={collectionRate !== null && collectionRate < 0.75 ? "gold" : "green"}
        />
        <StatCard
          label="Book value (cost basis)"
          value={
            totalBookValue > 0 ? formatCompactMoney(totalBookValue) : "Add purchase prices"
          }
          hint="Sum of recorded purchase prices on assets"
          icon={PiggyBank}
          tone="neutral"
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Portfolio risk & performance</h2>
            <p className="text-sm text-muted">Color-coded rent health by active policy as of {asOf}.</p>
          </div>
          <Link href="/portfolio" className="inline-flex items-center gap-1 text-sm font-medium text-main-blue hover:underline">
            Full portfolio view
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setRiskFilter("PAID")}
            className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Units paid</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums-fin text-foreground">{riskCounts?.paid ?? "—"}</p>
            <p className="mt-1 text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.paid ?? 0) - previousRiskCounts.paid >= 0 ? "+" : ""}${(riskCounts?.paid ?? 0) - previousRiskCounts.paid} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter("LATE")}
            className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Late</p>
              <Timer className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums-fin text-foreground">{riskCounts?.late ?? "—"}</p>
            <p className="mt-1 text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.late ?? 0) - previousRiskCounts.late >= 0 ? "+" : ""}${(riskCounts?.late ?? 0) - previousRiskCounts.late} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter("CRITICAL")}
            className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Critical</p>
              <Flame className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums-fin text-foreground">{riskCounts?.critical ?? "—"}</p>
            <p className="mt-1 text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.critical ?? 0) - previousRiskCounts.critical >= 0 ? "+" : ""}${(riskCounts?.critical ?? 0) - previousRiskCounts.critical} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter("VACANT")}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Vacant</p>
              <Users className="h-4 w-4 text-slate-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums-fin text-foreground">{riskCounts?.vacant ?? "—"}</p>
            <p className="mt-1 text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.vacant ?? 0) - previousRiskCounts.vacant >= 0 ? "+" : ""}${(riskCounts?.vacant ?? 0) - previousRiskCounts.vacant} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Risk drill-down</p>
              <p className="text-xs text-muted">Focused unit list for portfolio follow-up.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "PAID", "LATE", "CRITICAL", "VACANT"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRiskFilter(status)}
                  className={
                    riskFilter === status
                      ? "rounded-lg bg-main-blue px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-muted-bg"
                  }
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2">Asset / Unit</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Overdue</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {riskRows.slice(0, 8).map((row) => (
                  <tr key={row.unitId}>
                    <td className="py-2.5">
                      <p className="font-medium text-foreground">{row.assetName}</p>
                      <p className="text-xs text-muted">{row.unitName ?? "Unnamed unit"}</p>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={
                          row.rentStatus === "CRITICAL"
                            ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
                            : row.rentStatus === "LATE"
                              ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                              : row.rentStatus === "PAID"
                                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                        }
                      >
                        {row.rentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 tabular-nums-fin">{row.overdueDays}d</td>
                    <td className="py-2.5 text-xs text-muted">{row.statusReason}</td>
                    <td className="py-2.5 text-right">
                      <Link href="/payments" className="text-xs font-medium text-main-blue hover:underline">
                        Open payments
                      </Link>
                    </td>
                  </tr>
                ))}
                {riskRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-muted">
                      No units in this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {portfolioStatusQuery.data?.units && portfolioStatusQuery.data.units.length > 8 ? (
            <p className="mt-3 text-xs text-muted">
              Showing first 8 units. Open full portfolio view for complete list.
            </p>
          ) : null}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <CardHeader className="p-0">
            <CardTitle>Income trajectory</CardTitle>
            <CardDescription>Six-month paid rent trend</CardDescription>
          </CardHeader>
          <CardContent className="mt-6 p-0">
            {incomeSeries.data?.length ? (
              <IncomeChart data={incomeSeries.data} />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted">
                {incomeSeries.isLoading ? "Loading…" : "No data yet"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Items that need attention</CardDescription>
          </CardHeader>
          <CardContent className="mt-5 space-y-4 p-0">
            {(outstandingQuery.data?.leasesWithBalance?.length ?? 0) > 0 ? (
              <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-gold-soft/60 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-gold" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-foreground">Unpaid balances</p>
                  <ul className="mt-2 space-y-2 text-xs text-muted">
                    {outstandingQuery.data?.leasesWithBalance.slice(0, 4).map((row) => (
                      <li key={row.leaseId} className="flex justify-between gap-2">
                        <span className="truncate">
                          {row.assetName}
                          {row.unitName ? ` · ${row.unitName}` : ""}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums-fin text-main-green">
                          {formatMoney(row.due)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(outstandingQuery.data?.leasesWithBalance.length ?? 0) > 4 ? (
                    <p className="mt-2 text-[11px] text-muted">
                      +{(outstandingQuery.data?.leasesWithBalance.length ?? 0) - 4} more
                    </p>
                  ) : null}
                  <Link
                    href="/payments"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-main-blue hover:underline"
                  >
                    Review payments
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted-bg/50 p-4 text-sm text-muted">
                No overdue balances for this month.
              </div>
            )}

            {vacantCount > 0 ? (
              <div className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-main-blue" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-foreground">Vacant units</p>
                  <p className="mt-1 text-xs text-muted">
                    {vacantCount} unit{vacantCount === 1 ? "" : "s"} currently vacant. Keep yield on track by
                    leasing them out.
                  </p>
                  <Link
                    href="/assets"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-main-blue hover:underline"
                  >
                    View assets
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>
            ) : occupancyQuery.data && occupancyQuery.data.totalUnits > 0 ? (
              <div className="rounded-xl border border-border bg-success-soft/40 p-4 text-sm text-main-green">
                Fully occupied portfolio — strong cash-flow discipline.
              </div>
            ) : null}

            {leaseEndingSoon.length > 0 ? (
              <div className="flex gap-3 rounded-xl border border-main-blue/20 bg-blue-soft/30 p-4">
                <Timer className="mt-0.5 h-5 w-5 shrink-0 text-main-blue" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-foreground">Leases ending in 30 days</p>
                  <ul className="mt-2 space-y-2 text-xs text-muted">
                    {leaseEndingSoon.slice(0, 4).map((lease) => (
                      <li key={lease.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {lease.unit?.asset?.name}
                          {lease.unit?.name ? ` · ${lease.unit.name}` : ""}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">
                          {lease.endDate?.slice(0, 10)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(leaseEndingSoon.length ?? 0) > 4 ? (
                    <p className="mt-2 text-[11px] text-muted">+{leaseEndingSoon.length - 4} more</p>
                  ) : null}
                  <Link
                    href="/leases"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-main-blue hover:underline"
                  >
                    Review leases
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Link>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted">
        <CheckCircle2 className="h-4 w-4 text-main-green" strokeWidth={1.75} />
        {dataDiscrepancies.length === 0
          ? "Data consistency checks passed. Metrics look reliable."
          : `${dataDiscrepancies.length} data consistency warning${dataDiscrepancies.length > 1 ? "s" : ""} found.`}
      </div>
      {dataDiscrepancies.length > 0 ? (
        <Card className="border-amber-200/70 bg-gold-soft/40 p-4">
          <ul className="space-y-1 text-xs text-muted">
            {dataDiscrepancies.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <AddAssetModal open={assetOpen} onClose={() => setAssetOpen(false)} />
      <AddTenantModal open={tenantOpen} onClose={() => setTenantOpen(false)} />
      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  );
}
