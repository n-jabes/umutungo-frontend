"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { AlertTriangle, Landmark, PieChart, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { api } from "@/lib/api";
import { currentMonth, formatCompactMoney, formatMoney, formatPercent, formatTimeAgo, monthRangeLastN } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

const GrowthChart = dynamic(
  () => import("@/components/charts/growth-chart").then((m) => m.GrowthChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-muted-bg" />,
  },
);

export default function PortfolioPage() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const assetsQuery = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });
  const occupancyQuery = useQuery({
    queryKey: queryKeys.occupancy,
    queryFn: () => api.occupancy(),
  });
  const month = currentMonth();
  const assetPerformanceQuery = useQuery({
    queryKey: queryKeys.assetPerformance(month),
    queryFn: () => api.assetPerformance(month),
  });
  const valuationsSummary = useQuery({
    queryKey: ["analytics", "valuations-summary", (assetsQuery.data ?? []).map((a) => a.id).join(",")],
    enabled: (assetsQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        (assetsQuery.data ?? []).map(async (asset) => {
          const valuations = await api.listAssetValuations(asset.id);
          return valuations[0] ?? null;
        }),
      );
      return rows.filter(Boolean).reduce((sum, row) => sum + Number(row?.value ?? 0), 0);
    },
  });

  const chartRange = useMemo(() => monthRangeLastN(8), []);
  const trailingRange = useMemo(() => monthRangeLastN(12), []);
  const incomeSeriesQuery = useQuery({
    queryKey: queryKeys.incomeSeries(chartRange.from, chartRange.to),
    queryFn: () => api.incomeSeries(chartRange.from, chartRange.to),
  });
  const trailingIncomeQuery = useQuery({
    queryKey: queryKeys.incomeSeries(trailingRange.from, trailingRange.to),
    queryFn: () => api.incomeSeries(trailingRange.from, trailingRange.to),
  });

  const book = useMemo(
    () => (assetsQuery.data ?? []).reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0),
    [assetsQuery.data],
  );

  const series = useMemo(
    () =>
      (incomeSeriesQuery.data?.series ?? []).map((p) => ({
        month: p.month,
        income: p.totalIncome,
      })),
    [incomeSeriesQuery.data],
  );

  const last = series[series.length - 1]?.income ?? 0;
  const prev = series[series.length - 2]?.income ?? 0;
  const mom = prev > 0 ? (last - prev) / prev : last > 0 ? 1 : 0;
  const topPerformer = useMemo(() => {
    const ranked = [...(assetPerformanceQuery.data?.assets ?? [])].sort((a, b) => b.incomeForMonth - a.incomeForMonth);
    return ranked[0] ?? null;
  }, [assetPerformanceQuery.data]);
  const totalMonthlyIncome = useMemo(
    () => (assetPerformanceQuery.data?.assets ?? []).reduce((sum, asset) => sum + asset.incomeForMonth, 0),
    [assetPerformanceQuery.data],
  );
  const trailingIncome = useMemo(
    () => (trailingIncomeQuery.data?.series ?? []).reduce((sum, row) => sum + row.totalIncome, 0),
    [trailingIncomeQuery.data],
  );
  const annualizedYield = book > 0 ? (totalMonthlyIncome * 12) / book : null;
  const latestValuationTotal = valuationsSummary.data ?? 0;
  const unrealizedPL = latestValuationTotal > 0 ? latestValuationTotal - book : null;
  const totalReturn = book > 0 && unrealizedPL !== null ? (unrealizedPL + trailingIncome) / book : null;
  const byAssetMetrics = useMemo(() => {
    return (assetsQuery.data ?? [])
      .map((asset) => {
        const monthIncome =
          (assetPerformanceQuery.data?.assets ?? []).find((p) => p.assetId === asset.id)?.incomeForMonth ?? 0;
        const cost = Number(asset.purchasePrice ?? 0);
        const annualYield = cost > 0 ? (monthIncome * 12) / cost : null;
        return { id: asset.id, name: asset.name, cost, monthIncome, annualYield };
      })
      .sort((a, b) => b.monthIncome - a.monthIncome);
  }, [assetsQuery.data, assetPerformanceQuery.data]);
  const latestDataSync = Math.max(
    assetsQuery.dataUpdatedAt,
    occupancyQuery.dataUpdatedAt,
    assetPerformanceQuery.dataUpdatedAt,
    valuationsSummary.dataUpdatedAt,
    incomeSeriesQuery.dataUpdatedAt,
    trailingIncomeQuery.dataUpdatedAt,
  );
  const consistencyWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (occupancyQuery.data && occupancyQuery.data.totalUnits !== occupancyQuery.data.occupied + occupancyQuery.data.vacant) {
      warnings.push("Occupancy mix does not equal total units.");
    }
    if ((assetsQuery.data ?? []).some((a) => !a.purchasePrice || Number(a.purchasePrice) <= 0)) {
      warnings.push("Some assets are missing purchase price, affecting yield accuracy.");
    }
    if ((assetsQuery.data?.length ?? 0) > 0 && latestValuationTotal <= 0) {
      warnings.push("No valuation history found yet. Add valuations for accurate gain/loss metrics.");
    }
    return warnings;
  }, [assetsQuery.data, latestValuationTotal, occupancyQuery.data]);

  if (user?.role === "agent") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Portfolio access restricted</h1>
        <p className="mt-2 text-sm text-muted">
          Agent accounts can manage leases and payments, but cannot access portfolio insights.
        </p>
      </Card>
    );
  }

  if (workspace !== "portfolio") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Portfolio Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Switch to the Portfolio workspace to see invested capital, value trend, and growth.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Strategy</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Long-range view of capital at work: book value, occupancy, and rent compounding over time.
        </p>
        <p className="mt-2 text-xs text-muted">Last updated: {formatTimeAgo(latestDataSync)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Total book value</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums-fin text-foreground">
                {book > 0 ? formatCompactMoney(book) : "—"}
              </p>
              <p className="mt-2 text-xs text-muted">Recorded purchase prices across assets</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft ring-1 ring-accent-gold/30">
              <Landmark className="h-5 w-5 text-main-green" strokeWidth={1.75} />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Occupancy</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums-fin text-foreground">
                {occupancyQuery.data && occupancyQuery.data.totalUnits > 0 ? formatPercent(occupancyQuery.data.rate) : "—"}
              </p>
              <p className="mt-2 text-xs text-muted">Leased units vs total inventory</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-soft">
              <PieChart className="h-5 w-5 text-main-blue" strokeWidth={1.75} />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Income momentum</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums-fin text-main-green">
                {mom >= 0 ? "+" : ""}
                {(mom * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-muted">Month-over-month change in paid rent</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft">
              <TrendingUp className="h-5 w-5 text-main-green" strokeWidth={1.75} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Net wealth scorecard</CardTitle>
          <CardDescription>Clear view of where your portfolio stands today</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 grid gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted-bg/35 px-4 py-3">
            <p className="text-xs text-muted">Book value</p>
            <p className="mt-1 text-lg font-semibold tabular-nums-fin text-foreground">{formatMoney(book)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted-bg/35 px-4 py-3">
            <p className="text-xs text-muted">Latest appraised value</p>
            <p className="mt-1 text-lg font-semibold tabular-nums-fin text-foreground">
              {latestValuationTotal > 0 ? formatMoney(latestValuationTotal) : "Add valuations"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted-bg/35 px-4 py-3">
            <p className="text-xs text-muted">Trailing 12-month rent</p>
            <p className="mt-1 text-lg font-semibold tabular-nums-fin text-main-green">{formatMoney(trailingIncome)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted-bg/35 px-4 py-3">
            <p className="text-xs text-muted">Total return signal</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums-fin ${totalReturn !== null && totalReturn < 0 ? "text-red-600" : "text-main-green"}`}>
              {totalReturn === null ? "Add valuations" : `${totalReturn >= 0 ? "+" : ""}${formatPercent(totalReturn)}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Income this month</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums-fin text-main-green">
            {formatMoney(totalMonthlyIncome)}
          </p>
          <p className="mt-2 text-xs text-muted">Realized cash flow from paid rent in {month}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Annualized yield (cash)</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums-fin text-foreground">
            {annualizedYield === null ? "—" : formatPercent(annualizedYield)}
          </p>
          <p className="mt-2 text-xs text-muted">12x monthly rent over current book value</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Unrealized gain/loss</p>
          <p className={`mt-3 text-2xl font-semibold tabular-nums-fin ${unrealizedPL !== null && unrealizedPL < 0 ? "text-red-600" : "text-main-green"}`}>
            {unrealizedPL === null ? "Add valuations" : `${unrealizedPL >= 0 ? "+" : ""}${formatMoney(unrealizedPL)}`}
          </p>
          <p className="mt-2 text-xs text-muted">Latest valuations minus purchase cost basis</p>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Performance focus ({month})</CardTitle>
          <CardDescription>Highest rent-contributing asset this month</CardDescription>
        </CardHeader>
        <CardContent className="mt-5 p-0">
          {topPerformer ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted-bg/35 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{topPerformer.name}</p>
                <p className="mt-1 text-xs text-muted capitalize">{topPerformer.type}</p>
              </div>
              <p className="text-lg font-semibold tabular-nums-fin text-main-green">
                {formatMoney(topPerformer.incomeForMonth)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">No recorded payments for this month yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Asset return leaders</CardTitle>
          <CardDescription>Compare monthly income and annualized yield by asset</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 p-0">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {byAssetMetrics.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{asset.name}</p>
                  <p className="text-xs text-muted">
                    Cost basis: {asset.cost > 0 ? formatMoney(asset.cost) : "Missing purchase price"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums-fin text-main-green">
                    {formatMoney(asset.monthIncome)} / mo
                  </p>
                  <p className="text-xs text-muted">
                    Yield: {asset.annualYield === null ? "—" : formatPercent(asset.annualYield)}
                  </p>
                </div>
              </li>
            ))}
            {byAssetMetrics.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">No assets yet.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Rent growth curve</CardTitle>
          <CardDescription>Paid rent by month — a simple proxy for portfolio yield</CardDescription>
        </CardHeader>
        <CardContent className="mt-6 p-0">
          <GrowthChart data={series} />
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Asset mix</CardTitle>
          <CardDescription>Count by category</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 grid gap-3 p-0 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted-bg/40 px-4 py-3">
            <p className="text-xs font-medium text-muted">Properties</p>
            <p className="mt-1 text-lg font-semibold">
              {(assetsQuery.data ?? []).filter((a) => a.type === "property").length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted-bg/40 px-4 py-3">
            <p className="text-xs font-medium text-muted">Land</p>
            <p className="mt-1 text-lg font-semibold">
              {(assetsQuery.data ?? []).filter((a) => a.type === "land").length}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-main-green" strokeWidth={1.75} />
        <p>
          {consistencyWarnings.length === 0
            ? "Portfolio data passed consistency checks."
            : `${consistencyWarnings.length} consistency warning${consistencyWarnings.length > 1 ? "s" : ""} found.`}
        </p>
      </div>
      {consistencyWarnings.length > 0 ? (
        <Card className="border-amber-200/70 bg-gold-soft/40 p-4">
          <ul className="space-y-1 text-xs text-muted">
            {consistencyWarnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
