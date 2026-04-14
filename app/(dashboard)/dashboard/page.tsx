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
  Landmark,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
  UserPlus,
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
  const paymentsQuery = useQuery({
    queryKey: queryKeys.paymentSummary(month),
    queryFn: () => api.paymentSummary(month),
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
  const hasTenants = (tenantsQuery.data?.length ?? 0) > 0;
  const hasPayments = (paymentsQuery.data?.count ?? 0) > 0;
  const hasLeases = (leasesQuery.data?.length ?? 0) > 0;
  const onboardingDone = hasAssets && hasTenants && hasPayments;
  const nextAction = !hasAssets
    ? { href: "/assets", label: "Add your first property/asset" }
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
    return items;
  }, [hasLeases, hasPayments, leasesQuery.data, occupancyQuery.data, outstandingQuery.data?.leasesWithBalance?.length]);
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
                Follow these steps once and Umutungo becomes your daily control center.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link
                href="/assets"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {hasAssets ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Add property/asset
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
              </Link>
              <Link
                href="/tenants"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {hasTenants ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Add tenant
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
              </Link>
              <Link
                href="/payments"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {hasPayments ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Record payment
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
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
