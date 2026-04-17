"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
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
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import { DashboardCursorTableFooter } from "@/components/dashboard/dashboard-table-pagination";
import { api } from "@/lib/api";
import { cannotCreateAssetDueToUnits } from "@/lib/plan-usage";
import {
  currentMonth,
  formatCompactMoney,
  formatMoney,
  formatPercent,
  formatTimeAgo,
  monthRangeLastN,
} from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useCursorPagination } from "@/lib/use-cursor-pagination";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function launchChecklistDismissStorageKey(userId: string) {
  return `umutungo.launchChecklist.dismissed:${userId}`;
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

/** Max leases listed in Alerts → Unpaid balances (rest via Payments). */
const UNPAID_BALANCES_ALERT_LIMIT = 5;

export default function DashboardPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const month = currentMonth();
  const [assetOpen, setAssetOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [launchChecklistDismissed, setLaunchChecklistDismissed] = useState(false);
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
  const onboardingQuery = useQuery({
    queryKey: queryKeys.onboarding(month),
    queryFn: () => api.getOnboarding({ month }),
    enabled: user?.role !== "agent",
    staleTime: 60_000,
  });
  const entitlementsQuery = useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: () => api.getMeEntitlements(),
    enabled: user?.role === "owner" && workspace === "rental",
    staleTime: 60_000,
  });
  const assetCapReached =
    entitlementsQuery.data != null && cannotCreateAssetDueToUnits(entitlementsQuery.data);

  useLayoutEffect(() => {
    if (!user?.id) {
      setLaunchChecklistDismissed(false);
      return;
    }
    try {
      setLaunchChecklistDismissed(
        typeof window !== "undefined" &&
          localStorage.getItem(launchChecklistDismissStorageKey(user.id)) === "1",
      );
    } catch {
      setLaunchChecklistDismissed(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !onboardingQuery.data?.complete) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(launchChecklistDismissStorageKey(user.id));
      }
    } catch {
      /* ignore */
    }
    setLaunchChecklistDismissed(false);
  }, [onboardingQuery.data?.complete, user?.id]);
  const ownerRiskSummaryQuery = useQuery({
    queryKey: ["analytics", "risk-summary", "owner", asOf],
    queryFn: () => api.ownerRiskSummary({ asOf }),
  });
  const ownerRiskSummaryPreviousQuery = useQuery({
    queryKey: ["analytics", "risk-summary", "owner", previousAsOf],
    queryFn: () => api.ownerRiskSummary({ asOf: previousAsOf }),
  });
  const chartRange = useMemo(() => monthRangeLastN(6), []);
  const [riskDrillLimit, setRiskDrillLimit] = useState(8);
  const [assetRiskLimit, setAssetRiskLimit] = useState(6);
  const [agingLimit, setAgingLimit] = useState(8);
  const [qualityLimit, setQualityLimit] = useState(8);

  const riskPagination = useCursorPagination(`${asOf}:${riskFilter}:${riskDrillLimit}`);
  const assetRiskPagination = useCursorPagination(`${asOf}:${assetRiskLimit}`);
  const agingPagination = useCursorPagination(`${asOf}:${agingLimit}`);
  const qualityPagination = useCursorPagination(`${chartRange.from}:${chartRange.to}:${qualityLimit}`);

  const assetRiskCursor = assetRiskPagination.cursor;
  const assetRiskSummaryQuery = useQuery({
    queryKey: ["analytics", "risk-summary", "assets", asOf, assetRiskLimit, assetRiskPagination.page, assetRiskCursor],
    queryFn: () => api.assetRiskSummary({ asOf, cursor: assetRiskCursor, limit: assetRiskLimit }),
  });
  const agingCursor = agingPagination.cursor;
  const unpaidAgingQuery = useQuery({
    queryKey: ["analytics", "unpaid-aging", asOf, agingLimit, agingPagination.page, agingCursor],
    queryFn: () => api.unpaidAging({ asOf, cursor: agingCursor, limit: agingLimit }),
  });

  const managerQualityQuery = useQuery({
    queryKey: [
      "analytics",
      "manager-quality",
      chartRange.from,
      chartRange.to,
      qualityLimit,
      qualityPagination.page,
      qualityPagination.cursor,
    ],
    queryFn: () =>
      api.managerReportingQuality({
        from: chartRange.from,
        to: chartRange.to,
        cursor: qualityPagination.cursor,
        limit: qualityLimit,
      }),
    enabled: user?.role !== "agent",
  });
  const riskCursor = riskPagination.cursor;
  const riskDrillDownQuery = useQuery({
    queryKey: ["analytics", "risk-drill-down", asOf, riskFilter, riskDrillLimit, riskPagination.page, riskCursor],
    queryFn: () =>
      api.riskDrillDown({
        asOf,
        status: riskFilter === "all" ? undefined : riskFilter,
        cursor: riskCursor,
        limit: riskDrillLimit,
      }),
  });
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
  const firstAssetId = assetsQuery.data?.[0]?.id;
  const launch = onboardingQuery.data;
  const checklistHasAssets = launch?.hasAsset ?? false;
  const checklistHasUnits = launch?.hasUnit ?? false;
  const checklistHasTenants = launch?.hasTenant ?? false;
  const checklistHasLeases = launch?.hasLease ?? false;
  const checklistHasPayments = launch?.hasPayment ?? false;
  const showLaunchChecklist =
    user?.role !== "agent" &&
    onboardingQuery.isSuccess &&
    !!launch &&
    !launch.complete &&
    !launchChecklistDismissed;
  const nextAction = !checklistHasAssets
    ? { href: "/assets", label: "Add your first property/asset" }
    : !checklistHasUnits
      ? {
          href: firstAssetId ? `/assets/${firstAssetId}` : "/assets",
          label: "Add at least one unit (room, shop, etc.) under your property",
        }
      : !checklistHasTenants
        ? { href: "/tenants", label: "Add your first tenant" }
        : !checklistHasLeases
          ? { href: "/leases", label: "Create your first lease" }
          : !checklistHasPayments
            ? { href: "/payments", label: "Record your first payment" }
            : null;
  const hasPaymentsIntegrity = launch ? launch.hasPayment : (paymentsQuery.data?.count ?? 0) > 0;
  const hasLeasesIntegrity = launch ? launch.hasLease : (leasesQuery.data?.length ?? 0) > 0;
  const hasUnitsIntegrity = launch ? launch.hasUnit : (unitsQuery.data?.length ?? 0) > 0;
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
    onboardingQuery.dataUpdatedAt,
  );
  const dataDiscrepancies = useMemo(() => {
    const items: string[] = [];
    if (occupancyQuery.data && occupancyQuery.data.totalUnits !== occupancyQuery.data.occupied + occupancyQuery.data.vacant) {
      items.push("Occupancy totals do not match occupied + vacant units.");
    }
    if ((outstandingQuery.data?.leasesWithBalance?.length ?? 0) > (leasesQuery.data?.length ?? 0)) {
      items.push("Overdue lease count exceeds loaded lease records.");
    }
    if (hasPaymentsIntegrity && !hasLeasesIntegrity) {
      items.push("Payments exist but no leases are loaded.");
    }
    if (hasLeasesIntegrity && !hasUnitsIntegrity) {
      items.push("Leases exist but no units are registered — add units under your properties.");
    }
    return items;
  }, [
    hasLeasesIntegrity,
    hasPaymentsIntegrity,
    hasUnitsIntegrity,
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
  const riskCounts = ownerRiskSummaryQuery.data?.totals;
  const previousRiskCounts = ownerRiskSummaryPreviousQuery.data?.totals;
  const riskRows = riskDrillDownQuery.data?.items ?? [];

  const leasesWithBalanceRows = useMemo(
    () => outstandingQuery.data?.leasesWithBalance ?? [],
    [outstandingQuery.data?.leasesWithBalance],
  );
  const unpaidBalancesPreview = useMemo(
    () => leasesWithBalanceRows.slice(0, UNPAID_BALANCES_ALERT_LIMIT),
    [leasesWithBalanceRows],
  );
  const unpaidBalancesMoreCount = Math.max(0, leasesWithBalanceRows.length - UNPAID_BALANCES_ALERT_LIMIT);

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
    <div className="min-w-0 space-y-10">
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
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={assetCapReached}
                title={
                  assetCapReached
                    ? "Unit limit reached for your plan. Open Settings → Plan & usage."
                    : undefined
                }
                onClick={() => setAssetOpen(true)}
              >
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

      {showLaunchChecklist ? (
        <Card className="border border-accent-gold/50 bg-gold-soft p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Finish setting up your workspace</p>
                <p className="mt-1 text-sm text-muted">
                  Follow this order: property → unit → tenant → lease → payment for{" "}
                  <span className="font-medium text-foreground">{launch.month}</span>. You need a unit before you can
                  create a lease.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 shrink-0 rounded-lg p-0 text-muted hover:bg-black/[0.06] hover:text-foreground"
                aria-label="Dismiss setup checklist"
                onClick={() => {
                  if (!user?.id) return;
                  setLaunchChecklistDismissed(true);
                  try {
                    localStorage.setItem(launchChecklistDismissStorageKey(user.id), "1");
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                href="/assets"
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  {checklistHasAssets ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
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
                    {checklistHasUnits ? <CheckCircle2 className="h-4 w-4 shrink-0 text-main-green" /> : <Circle className="h-4 w-4 shrink-0 text-muted" />}
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
                  {checklistHasTenants ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
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
                    {checklistHasLeases ? <CheckCircle2 className="h-4 w-4 shrink-0 text-main-green" /> : <Circle className="h-4 w-4 shrink-0 text-muted" />}
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
                  {checklistHasPayments ? <CheckCircle2 className="h-4 w-4 text-main-green" /> : <Circle className="h-4 w-4 text-muted" />}
                  Record payment
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              </Link>
            </div>
            {nextAction ? (
              <div className="flex items-center justify-between rounded-lg border border-accent-gold/35 bg-background/80 px-3 py-2.5 text-sm">
                <p className="inline-flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-accent-gold" />
                  Next step
                </p>
                <Link
                  href={nextAction.href}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-accent-gold/50 underline-offset-2 hover:decoration-accent-gold"
                >
                  {nextAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
            {!checklistHasAssets ? (
              <div className="space-y-1">
                <Button
                  type="button"
                  className="gap-2"
                  disabled={assetCapReached}
                  title={
                    assetCapReached
                      ? "Unit limit reached for your plan. Open Settings → Plan & usage."
                      : undefined
                  }
                  onClick={() => setAssetOpen(true)}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Add first asset
                </Button>
                {assetCapReached ? (
                  <p className="text-xs text-muted">
                    Unit limit reached — remove a unit or review limits under Settings → Plan & usage.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Income (this month)"
          value={formatCompactMoney(incomeQuery.data?.totalIncome ?? 0)}
          valueTitle={formatMoney(incomeQuery.data?.totalIncome ?? 0)}
          hint="Paid rent recognized in the ledger"
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          label="Outstanding rent"
          value={formatCompactMoney(outstandingQuery.data?.outstanding ?? 0)}
          valueTitle={formatMoney(outstandingQuery.data?.outstanding ?? 0)}
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
          valueTitle={totalBookValue > 0 ? formatMoney(totalBookValue) : "Add purchase prices"}
          hint="Sum of recorded purchase prices on assets"
          icon={PiggyBank}
          tone="neutral"
        />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 [&>*]:min-w-0">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Portfolio risk & performance</h2>
            <p className="text-sm text-muted">Color-coded rent health by active policy as of {asOf}.</p>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-medium text-main-blue hover:underline sm:self-auto"
          >
            Full portfolio view
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setRiskFilter("PAID")}
            className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-emerald-700">Units paid</p>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tabular-nums-fin text-foreground sm:text-3xl">
              {riskCounts?.paid ?? "—"}
            </p>
            <p className="mt-1 break-words text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.paid ?? 0) - previousRiskCounts.paid >= 0 ? "+" : ""}${(riskCounts?.paid ?? 0) - previousRiskCounts.paid} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter("LATE")}
            className="min-w-0 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-amber-700">Late</p>
              <Timer className="h-4 w-4 shrink-0 text-amber-600" />
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tabular-nums-fin text-foreground sm:text-3xl">
              {riskCounts?.late ?? "—"}
            </p>
            <p className="mt-1 break-words text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.late ?? 0) - previousRiskCounts.late >= 0 ? "+" : ""}${(riskCounts?.late ?? 0) - previousRiskCounts.late} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter("CRITICAL")}
            className="min-w-0 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-rose-700">Critical</p>
              <Flame className="h-4 w-4 shrink-0 text-rose-600" />
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tabular-nums-fin text-foreground sm:text-3xl">
              {riskCounts?.critical ?? "—"}
            </p>
            <p className="mt-1 break-words text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.critical ?? 0) - previousRiskCounts.critical >= 0 ? "+" : ""}${(riskCounts?.critical ?? 0) - previousRiskCounts.critical} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter("VACANT")}
            className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-700">Vacant</p>
              <Users className="h-4 w-4 shrink-0 text-slate-600" />
            </div>
            <p className="mt-3 truncate text-2xl font-semibold tabular-nums-fin text-foreground sm:text-3xl">
              {riskCounts?.vacant ?? "—"}
            </p>
            <p className="mt-1 break-words text-xs text-muted">
              {previousRiskCounts
                ? `${(riskCounts?.vacant ?? 0) - previousRiskCounts.vacant >= 0 ? "+" : ""}${(riskCounts?.vacant ?? 0) - previousRiskCounts.vacant} vs 30d`
                : "Trend loading..."}
            </p>
          </button>
        </div>
        <Card className="min-w-0 p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Risk drill-down</p>
              <p className="text-xs text-muted">Focused unit list for portfolio follow-up.</p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5">
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
          <div className="mt-4 min-w-0 overflow-x-auto">
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
                {riskRows.map((row) => (
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
                      {row.leaseId ? (
                        <Link
                          href={`/payments?lease=${encodeURIComponent(row.leaseId)}`}
                          className="text-xs font-medium text-main-blue hover:underline"
                        >
                          Open payments
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">No lease</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!riskDrillDownQuery.isLoading && riskRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-muted">
                      No units in this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {riskFilter !== "all" ? (
            <p className="mt-2 text-[11px] text-muted">Showing units with status {riskFilter}.</p>
          ) : null}
          <DashboardCursorTableFooter
            page={riskPagination.page}
            canPrev={riskPagination.canPrev}
            onPrev={riskPagination.goPrev}
            onNext={() => riskPagination.goNext(riskDrillDownQuery.data?.nextCursor)}
            nextDisabled={!riskDrillDownQuery.data?.nextCursor}
            pageSize={riskDrillLimit}
            onPageSizeChange={setRiskDrillLimit}
            isLoading={riskDrillDownQuery.isLoading}
          />
        </Card>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-3">
        <Card className="min-w-0 p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Risk summary by asset</p>
              <p className="text-xs text-muted">Defensible risk ranking for owner decisions.</p>
            </div>
            <BarChart3 className="h-4 w-4 shrink-0 text-muted" />
          </div>
          <div className="mt-4 min-w-0 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2">Asset</th>
                  <th className="py-2">Risk units</th>
                  <th className="py-2">Risk rate</th>
                  <th className="py-2">Counts (P/L/C/V)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(assetRiskSummaryQuery.data?.items ?? []).map((row) => (
                  <tr key={row.assetId}>
                    <td className="py-2.5 font-medium text-foreground">{row.assetName}</td>
                    <td className="py-2.5 tabular-nums-fin">{row.riskUnits}</td>
                    <td className="py-2.5 tabular-nums-fin">{formatPercent(row.riskRate)}</td>
                    <td className="py-2.5 text-xs text-muted tabular-nums-fin">
                      {row.counts.paid}/{row.counts.late}/{row.counts.critical}/{row.counts.vacant}
                    </td>
                  </tr>
                ))}
                {(assetRiskSummaryQuery.data?.items?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-muted">
                      No asset risk data available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <DashboardCursorTableFooter
            page={assetRiskPagination.page}
            canPrev={assetRiskPagination.canPrev}
            onPrev={assetRiskPagination.goPrev}
            onNext={() => assetRiskPagination.goNext(assetRiskSummaryQuery.data?.nextCursor)}
            nextDisabled={!assetRiskSummaryQuery.data?.nextCursor}
            pageSize={assetRiskLimit}
            onPageSizeChange={setAssetRiskLimit}
            isLoading={assetRiskSummaryQuery.isLoading}
          />
        </Card>

        <Card className="min-w-0 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Unpaid aging buckets</p>
              <p className="text-xs text-muted">0-30, 31-60, and 61+ day risk split.</p>
            </div>
            <ShieldAlert className="h-4 w-4 shrink-0 text-muted" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <span className="text-muted">0-30 days</span>
              <span className="float-right font-semibold tabular-nums-fin">
                {unpaidAgingQuery.data?.bucketCounts["0-30"] ?? 0}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <span className="text-muted">31-60 days</span>
              <span className="float-right font-semibold tabular-nums-fin">
                {unpaidAgingQuery.data?.bucketCounts["31-60"] ?? 0}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <span className="text-muted">61+ days</span>
              <span className="float-right font-semibold tabular-nums-fin">
                {unpaidAgingQuery.data?.bucketCounts["61+"] ?? 0}
              </span>
            </div>
          </div>
          <div className="mt-4 min-w-0 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="py-1.5">Unit</th>
                  <th className="py-1.5">Bucket</th>
                  <th className="py-1.5 text-right">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(unpaidAgingQuery.data?.items ?? []).map((row) => (
                  <tr key={row.unitId}>
                    <td className="py-2 text-foreground">{row.unitName ?? "Unnamed"}</td>
                    <td className="py-2 text-muted">{row.bucket}</td>
                    <td className="py-2 text-right tabular-nums-fin">{row.overdueDays}d</td>
                  </tr>
                ))}
                {!unpaidAgingQuery.isLoading && (unpaidAgingQuery.data?.items?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted">
                      No delinquent units on this page.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <DashboardCursorTableFooter
            page={agingPagination.page}
            canPrev={agingPagination.canPrev}
            onPrev={agingPagination.goPrev}
            onNext={() => agingPagination.goNext(unpaidAgingQuery.data?.nextCursor)}
            nextDisabled={!unpaidAgingQuery.data?.nextCursor}
            pageSize={agingLimit}
            onPageSizeChange={setAgingLimit}
            isLoading={unpaidAgingQuery.isLoading}
          />
        </Card>
      </section>

      {user?.role !== "agent" ? (
        <section className="grid min-w-0 grid-cols-1 gap-6">
          <Card className="min-w-0 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">Manager reporting quality</h3>
                <p className="text-xs text-muted">
                  Period: {chartRange.from} to {chartRange.to}
                </p>
              </div>
            </div>
            <div className="mt-4 min-w-0 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2">Manager</th>
                    <th className="py-2 text-right">Recorded</th>
                    <th className="py-2 text-right">Proof coverage</th>
                    <th className="py-2 text-right">Edit rate</th>
                    <th className="py-2 text-right">Reason-on-edit</th>
                    <th className="py-2 text-right">Avg proof delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(managerQualityQuery.data?.items ?? []).map((row) => (
                    <tr key={row.managerId}>
                      <td className="py-2.5">
                        <p className="font-medium text-foreground">{row.managerName}</p>
                        <p className="text-xs capitalize text-muted">{row.managerRole}</p>
                      </td>
                      <td className="py-2.5 text-right tabular-nums-fin">{row.totals.paymentsRecorded}</td>
                      <td className="py-2.5 text-right tabular-nums-fin">
                        {formatPercent(row.indicators.proofCoverageRate)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums-fin">{formatPercent(row.indicators.editRate)}</td>
                      <td className="py-2.5 text-right tabular-nums-fin">
                        {formatPercent(row.indicators.reasonProvidedRateOnEdited)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums-fin">
                        {row.indicators.avgProofDelayHours == null
                          ? "—"
                          : `${row.indicators.avgProofDelayHours.toFixed(1)}h`}
                      </td>
                    </tr>
                  ))}
                  {(managerQualityQuery.data?.items?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted">
                        No manager quality data for this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <DashboardCursorTableFooter
              page={qualityPagination.page}
              canPrev={qualityPagination.canPrev}
              onPrev={qualityPagination.goPrev}
              onNext={() => qualityPagination.goNext(managerQualityQuery.data?.nextCursor)}
              nextDisabled={!managerQualityQuery.data?.nextCursor}
              pageSize={qualityLimit}
              onPageSizeChange={setQualityLimit}
              isLoading={managerQualityQuery.isLoading}
            />
          </Card>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-6 lg:grid-cols-3">
        <Card className="min-w-0 p-6 lg:col-span-2">
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

        <Card className="min-w-0 p-6">
          <CardHeader className="p-0">
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Items that need attention</CardDescription>
          </CardHeader>
          <CardContent className="mt-5 space-y-4 p-0">
            {leasesWithBalanceRows.length > 0 ? (
              <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-gold-soft/60 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-gold" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Unpaid balances</p>
                  <p className="mt-0.5 text-[11px] text-muted">Leases with a balance for {month} (highest due first).</p>
                  <ul className="mt-2 space-y-2 text-xs text-muted">
                    {unpaidBalancesPreview.map((row) => (
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
                  {unpaidBalancesMoreCount > 0 ? (
                    <p className="mt-2 text-[11px] text-muted">
                      +{unpaidBalancesMoreCount} more in Payments
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
