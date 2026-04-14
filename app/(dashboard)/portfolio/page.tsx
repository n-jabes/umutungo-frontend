"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Landmark, PieChart, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/workspace-context";
import { api } from "@/lib/api";
import { currentMonth, formatCompactMoney, formatMoney, formatPercent, monthRangeLastN } from "@/lib/format";
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
  const { data: assets } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });
  const { data: occupancy } = useQuery({
    queryKey: queryKeys.occupancy,
    queryFn: () => api.occupancy(),
  });
  const month = currentMonth();
  const { data: assetPerformance } = useQuery({
    queryKey: queryKeys.assetPerformance(month),
    queryFn: () => api.assetPerformance(month),
  });

  const chartRange = useMemo(() => monthRangeLastN(8), []);
  const { data: incomeSeriesData } = useQuery({
    queryKey: queryKeys.incomeSeries(chartRange.from, chartRange.to),
    queryFn: () => api.incomeSeries(chartRange.from, chartRange.to),
  });

  const book = useMemo(
    () => (assets ?? []).reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0),
    [assets],
  );

  const series = useMemo(
    () =>
      (incomeSeriesData?.series ?? []).map((p) => ({
        month: p.month,
        income: p.totalIncome,
      })),
    [incomeSeriesData],
  );

  const last = series[series.length - 1]?.income ?? 0;
  const prev = series[series.length - 2]?.income ?? 0;
  const mom = prev > 0 ? (last - prev) / prev : last > 0 ? 1 : 0;
  const topPerformer = useMemo(() => {
    const ranked = [...(assetPerformance?.assets ?? [])].sort((a, b) => b.incomeForMonth - a.incomeForMonth);
    return ranked[0] ?? null;
  }, [assetPerformance]);

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
                {occupancy && occupancy.totalUnits > 0 ? formatPercent(occupancy.rate) : "—"}
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
              {(assets ?? []).filter((a) => a.type === "property").length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted-bg/40 px-4 py-3">
            <p className="text-xs font-medium text-muted">Land</p>
            <p className="mt-1 text-lg font-semibold">
              {(assets ?? []).filter((a) => a.type === "land").length}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-main-green" strokeWidth={1.75} />
        <p>
          Portfolio metrics are built from recorded purchases and paid rent. Add valuation entries on each asset
          to compare cost basis against latest appraised value.
        </p>
      </div>
    </div>
  );
}
