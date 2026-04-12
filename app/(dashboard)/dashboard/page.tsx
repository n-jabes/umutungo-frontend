"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleDollarSign,
  DoorOpen,
  Landmark,
  PiggyBank,
  Plus,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const month = currentMonth();
  const [assetOpen, setAssetOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const { data: income } = useQuery({
    queryKey: queryKeys.income(month),
    queryFn: () => api.income(month),
  });
  const { data: outstanding } = useQuery({
    queryKey: queryKeys.outstanding(month),
    queryFn: () => api.outstandingRent(month),
  });
  const { data: occupancy } = useQuery({
    queryKey: queryKeys.occupancy,
    queryFn: () => api.occupancy(),
  });
  const { data: assets } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });

  const chartRange = useMemo(() => monthRangeLastN(6), []);
  const incomeSeries = useQuery({
    queryKey: queryKeys.incomeSeries(chartRange.from, chartRange.to),
    queryFn: () => api.incomeSeries(chartRange.from, chartRange.to),
    select: (d) => d.series.map((p) => ({ month: p.month, income: p.totalIncome })),
  });

  const totalBookValue = useMemo(() => {
    if (!assets?.length) return 0;
    return assets.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  }, [assets]);

  const vacantCount = occupancy?.vacant ?? 0;

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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="gap-2" onClick={() => setAssetOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add asset
          </Button>
          <Button type="button" variant="secondary" className="gap-2" onClick={() => setTenantOpen(true)}>
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Add tenant
          </Button>
          <Button type="button" className="gap-2" onClick={() => setPayOpen(true)}>
            <Wallet className="h-4 w-4" strokeWidth={1.75} />
            Record payment
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Income (this month)"
          value={formatMoney(income?.totalIncome ?? 0)}
          hint="Paid rent recognized in the ledger"
          icon={CircleDollarSign}
          tone="green"
        />
        <StatCard
          label="Outstanding rent"
          value={formatMoney(outstanding?.outstanding ?? 0)}
          hint="Active leases still carrying a balance"
          icon={Landmark}
          tone="gold"
        />
        <StatCard
          label="Occupancy"
          value={
            occupancy && occupancy.totalUnits > 0
              ? formatPercent(occupancy.rate)
              : "—"
          }
          hint={
            occupancy && occupancy.totalUnits > 0
              ? `${occupancy.occupied} of ${occupancy.totalUnits} units leased`
              : "Add units to measure occupancy"
          }
          icon={DoorOpen}
          tone="blue"
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
            {(outstanding?.leasesWithBalance?.length ?? 0) > 0 ? (
              <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-gold-soft/60 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-gold" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-foreground">Unpaid balances</p>
                  <ul className="mt-2 space-y-2 text-xs text-muted">
                    {outstanding?.leasesWithBalance.slice(0, 4).map((row) => (
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
                  {(outstanding?.leasesWithBalance.length ?? 0) > 4 ? (
                    <p className="mt-2 text-[11px] text-muted">
                      +{(outstanding?.leasesWithBalance.length ?? 0) - 4} more
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
            ) : occupancy && occupancy.totalUnits > 0 ? (
              <div className="rounded-xl border border-border bg-success-soft/40 p-4 text-sm text-main-green">
                Fully occupied portfolio — strong cash-flow discipline.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <AddAssetModal open={assetOpen} onClose={() => setAssetOpen(false)} />
      <AddTenantModal open={tenantOpen} onClose={() => setTenantOpen(false)} />
      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  );
}
