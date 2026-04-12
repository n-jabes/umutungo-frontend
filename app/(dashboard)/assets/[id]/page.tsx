"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronLeft,
  DoorClosed,
  Layers,
  LineChart,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCompactMoney, formatMoney, formatPercent, monthOffsets } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Unit } from "@/lib/types";
import { cn } from "@/lib/utils";

const IncomeChart = dynamic(
  () => import("@/components/charts/income-chart").then((m) => m.IncomeChart),
  { ssr: false, loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-muted-bg" /> },
);

const tabs = ["Overview", "Units", "Income", "Valuation", "Events"] as const;

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");

  const { data: assets } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });
  const asset = assets?.find((a) => a.id === id);

  const { data: units } = useQuery({
    queryKey: queryKeys.units(id),
    queryFn: () => api.listUnits(id),
    enabled: !!id,
  });

  const { data: leases } = useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.listLeases(),
  });

  const unitIds = useMemo(() => new Set((units ?? []).map((u) => u.id)), [units]);
  const leasesForAsset = useMemo(
    () =>
      (leases ?? []).filter((l) => l.unit && unitIds.has(l.unitId)),
    [leases, unitIds],
  );

  const months = useMemo(() => monthOffsets(6), []);
  const perfQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: queryKeys.assetPerformance(m),
      queryFn: () => api.assetPerformance(m),
      enabled: !!asset,
    })),
  });

  const incomeSeries = useMemo(() => {
    if (!asset) return [];
    return months.map((m, i) => {
      const data = perfQueries[i]?.data;
      const row = data?.assets.find((a) => a.assetId === asset.id);
      return { month: m, income: row?.incomeForMonth ?? 0 };
    });
  }, [asset, months, perfQueries]);

  const occupiedUnits = useMemo(
    () => (units ?? []).filter((u) => u.status === "occupied").length,
    [units],
  );
  const occupancyRate =
    units && units.length > 0 ? occupiedUnits / units.length : 0;

  const monthlyRentPotential = useMemo(() => {
    return (units ?? []).reduce((s, u) => s + Number(u.rentAmount ?? 0), 0);
  }, [units]);

  const events = useMemo(() => {
    const list: { date: string; title: string; detail: string }[] = [];
    for (const l of leasesForAsset) {
      list.push({
        date: l.startDate.slice(0, 10),
        title: "Lease started",
        detail: `${l.tenant?.name ?? "Tenant pending"} · ${formatMoney(l.rentAmountAtTime)}/period`,
      });
    }
    if (asset?.purchaseDate && asset.purchasePrice) {
      list.push({
        date: asset.purchaseDate.slice(0, 10),
        title: "Acquisition recorded",
        detail: `Purchase basis ${formatMoney(asset.purchasePrice)}`,
      });
    }
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [leasesForAsset, asset]);

  if (!asset) {
    return (
      <div className="space-y-4">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1 text-sm font-medium text-main-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to assets
        </Link>
        <p className="text-sm text-muted">
          {assets ? "Asset not found." : "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1 text-sm font-medium text-main-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Assets
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-muted-bg px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {asset.type === "land" ? "Land" : "Property"}
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{asset.name}</h1>
            {asset.location ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {asset.location}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <StatPill
              label="Occupancy"
              value={units?.length ? formatPercent(occupancyRate) : "—"}
              icon={DoorClosed}
            />
            <StatPill
              label="Monthly rent (units)"
              value={formatCompactMoney(monthlyRentPotential)}
              icon={LineChart}
            />
            <StatPill
              label="Book value"
              value={asset.purchasePrice ? formatCompactMoney(asset.purchasePrice) : "—"}
              icon={Building2}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
              tab === t
                ? "bg-blue-soft text-main-blue"
                : "text-muted hover:bg-muted-bg hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader className="p-0">
              <CardTitle>Snapshot</CardTitle>
              <CardDescription>Key operating metrics for this asset</CardDescription>
            </CardHeader>
            <CardContent className="mt-4 grid gap-4 p-0 sm:grid-cols-2">
              <Metric label="Units" value={String(units?.length ?? 0)} />
              <Metric label="Occupied" value={String(occupiedUnits)} />
              <Metric label="Vacant" value={String((units?.length ?? 0) - occupiedUnits)} />
              <Metric
                label="Listed monthly rent"
                value={formatCompactMoney(monthlyRentPotential)}
              />
            </CardContent>
          </Card>
          <Card className="p-6">
            <CardHeader className="p-0">
              <CardTitle>Notes</CardTitle>
              <CardDescription>Internal context you have saved</CardDescription>
            </CardHeader>
            <CardContent className="mt-4 p-0">
              <p className="text-sm leading-relaxed text-muted">
                {asset.notes?.trim()
                  ? asset.notes
                  : "No notes on file. Capture capex, lender covenants, or tenant nuances here when your team adds that field on the asset record."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "Units" && (
        <Card className="p-0">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Units</h2>
            <p className="text-xs text-muted">Rentable spaces attached to this asset</p>
          </div>
          <ul className="divide-y divide-border">
            {(units ?? []).length ? (
              (units as Unit[]).map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted-bg">
                      <Layers className="h-5 w-5 text-main-blue" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.name ?? "Unnamed unit"}</p>
                      <p className="text-xs capitalize text-muted">
                        {u.type ?? "unit"} ·{" "}
                        <span className={u.status === "occupied" ? "text-main-green" : ""}>
                          {u.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums-fin text-foreground">
                    {u.rentAmount ? formatMoney(u.rentAmount) : "—"}
                    <span className="ml-1 text-xs font-normal text-muted">/ period</span>
                  </p>
                </li>
              ))
            ) : (
              <li className="px-6 py-10 text-center text-sm text-muted">
                No units yet. Add units so you can attach leases and track occupancy.
              </li>
            )}
          </ul>
        </Card>
      )}

      {tab === "Income" && (
        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>Income attributed to this asset</CardTitle>
            <CardDescription>Paid rent flowing through leases on these units</CardDescription>
          </CardHeader>
          <CardContent className="mt-6 p-0">
            <IncomeChart data={incomeSeries} />
          </CardContent>
        </Card>
      )}

      {tab === "Valuation" && (
        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>Valuation & basis</CardTitle>
            <CardDescription>Ground truth from your acquisition data</CardDescription>
          </CardHeader>
          <CardContent className="mt-6 space-y-4 p-0">
            {asset.purchasePrice ? (
              <div className="flex gap-4 rounded-xl border border-border bg-muted-bg/40 p-4">
                <Sparkles className="h-5 w-5 shrink-0 text-accent-gold" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-foreground">Recorded purchase</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums-fin text-foreground">
                    {formatMoney(asset.purchasePrice)}
                  </p>
                  {asset.purchaseDate ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {asset.purchaseDate.slice(0, 10)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Add a purchase price on this asset to anchor performance and reporting to a cost
                basis.
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted">
              Formal appraisal history will appear here when the API exposes valuation entries from
              your ledger.
            </p>
          </CardContent>
        </Card>
      )}

      {tab === "Events" && (
        <Card className="p-0">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Investment events</h2>
            <p className="text-xs text-muted">Leasing and capital events tied to this asset</p>
          </div>
          <ul className="divide-y divide-border">
            {events.length ? (
              events.map((e, idx) => (
                <li key={`${e.date}-${idx}`} className="px-6 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{e.date}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{e.title}</p>
                  <p className="mt-1 text-sm text-muted">{e.detail}</p>
                </li>
              ))
            ) : (
              <li className="px-6 py-10 text-center text-sm text-muted">
                No events yet. Create leases to see a timeline of rental cash flow starts.
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
}) {
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
      <Icon className="h-5 w-5 shrink-0 text-main-blue" strokeWidth={1.75} />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="text-sm font-semibold tabular-nums-fin text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums-fin">{value}</p>
    </div>
  );
}
