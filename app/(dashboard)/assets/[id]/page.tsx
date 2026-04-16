"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronLeft,
  DoorClosed,
  Home,
  Layers,
  LineChart,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddUnitModal } from "@/components/assets/add-unit-modal";
import { EditAssetModal } from "@/components/dashboard/quick-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { filterMoneyInput } from "@/lib/decimal-input";
import { formatCompactMoney, formatMoney, formatPercent, monthRangeLastN } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Asset, AssetValuation, Unit } from "@/lib/types";
import { cn } from "@/lib/utils";

const IncomeChart = dynamic(
  () => import("@/components/charts/income-chart").then((m) => m.IncomeChart),
  { ssr: false, loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-muted-bg" /> },
);

const tabs = ["Overview", "Units", "Income", "Valuation", "Events"] as const;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AssetDetailPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [unitModal, setUnitModal] = useState<null | "custom" | "whole">(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState(false);
  const [valuationValue, setValuationValue] = useState("");
  const [valuationDate, setValuationDate] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState<"all" | "PAID" | "LATE" | "CRITICAL" | "VACANT">("all");
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [unitsPage, setUnitsPage] = useState(1);
  const [unitsSearch, setUnitsSearch] = useState("");
  const unitsPageSize = 60;
  const asOf = useMemo(() => toIsoDate(new Date()), []);

  const deleteUnitMutation = useMutation({
    mutationFn: (unitId: string) => api.deleteUnit(unitId),
    onSuccess: () => {
      toast.success("Unit deleted");
      setDeleteUnit(null);
      void Promise.all([
        qc.invalidateQueries({ queryKey: ["units"] }),
        qc.invalidateQueries({ queryKey: queryKeys.occupancy }),
        qc.invalidateQueries({ queryKey: queryKeys.leases }),
        qc.invalidateQueries({ queryKey: queryKeys.leasesActive }),
        qc.invalidateQueries({ queryKey: queryKeys.assets }),
        qc.invalidateQueries({ queryKey: queryKeys.assetRentStatus(id, asOf) }),
        qc.invalidateQueries({ queryKey: ["payments"] }),
        qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot }),
      ]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updateUnitMutation = useMutation({
    mutationFn: ({ unitId, name, rentAmount, status }: { unitId: string; name: string; rentAmount?: string; status?: Unit["status"] }) =>
      api.updateUnit(unitId, { name, rentAmount, status }),
    onSuccess: () => {
      toast.success("Unit updated");
      void Promise.all([
        qc.invalidateQueries({ queryKey: ["units"] }),
        qc.invalidateQueries({ queryKey: queryKeys.assetRentStatus(id, asOf) }),
      ]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: () => api.deleteAsset(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.assets });
      await qc.invalidateQueries({ queryKey: queryKeys.units() });
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      toast.success("Asset deleted");
      router.push("/assets");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const createValuationMutation = useMutation({
    mutationFn: (payload: { value: string; valuationDate: string }) =>
      api.createAssetValuation(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.assetValuations(id) });
      toast.success("Valuation entry recorded");
      setValuationValue("");
      setValuationDate("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: assets } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
  });
  const asset = assets?.find((a) => a.id === id);

  const { data: unitsPaged } = useQuery({
    queryKey: queryKeys.unitsPaged({
      assetId: id,
      page: unitsPage,
      pageSize: unitsPageSize,
      search: unitsSearch.trim() || undefined,
    }),
    queryFn: () =>
      api.listUnitsPaged({
        assetId: id,
        page: unitsPage,
        pageSize: unitsPageSize,
        search: unitsSearch.trim() || undefined,
      }),
    enabled: !!id,
  });
  const units = unitsPaged?.items ?? [];
  const { data: valuations } = useQuery({
    queryKey: queryKeys.assetValuations(id),
    queryFn: () => api.listAssetValuations(id),
    enabled: !!id,
  });
  const { data: assetRentStatus } = useQuery({
    queryKey: queryKeys.assetRentStatus(id, asOf),
    queryFn: () => api.getAssetRentStatus(id, { asOf }),
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

  const chartRange = useMemo(() => monthRangeLastN(6), []);
  const { data: assetIncomeSeries } = useQuery({
    queryKey: queryKeys.incomeSeries(chartRange.from, chartRange.to, id),
    queryFn: () => api.incomeSeries(chartRange.from, chartRange.to, id),
    enabled: !!asset && !!id,
  });

  const incomeSeries = useMemo(() => {
    if (!assetIncomeSeries) return [];
    return assetIncomeSeries.series.map((p) => ({
      month: p.month,
      income: p.totalIncome,
    }));
  }, [assetIncomeSeries]);

  const occupiedUnits = useMemo(
    () => (assetRentStatus ? assetRentStatus.counts.paid + assetRentStatus.counts.late + assetRentStatus.counts.critical : 0),
    [assetRentStatus],
  );
  const occupancyRate =
    assetRentStatus
      ? (assetRentStatus.counts.paid + assetRentStatus.counts.late + assetRentStatus.counts.critical) /
        Math.max(
          1,
          assetRentStatus.counts.paid +
            assetRentStatus.counts.late +
            assetRentStatus.counts.critical +
            assetRentStatus.counts.vacant,
        )
      : 0;

  const monthlyRentPotential = useMemo(() => {
    return units.reduce((s, u) => s + Number(u.rentAmount ?? 0), 0);
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
  const latestValuation = valuations?.[0] ?? null;
  const unitStatusMap = useMemo(() => {
    const map = new Map<string, { rentStatus: "VACANT" | "PAID" | "LATE" | "CRITICAL"; overdueDays: number }>();
    for (const row of assetRentStatus?.units ?? []) {
      map.set(row.unitId, { rentStatus: row.rentStatus, overdueDays: row.overdueDays });
    }
    return map;
  }, [assetRentStatus?.units]);
  const unitsForMap = useMemo(() => {
    let rows = units.map((u) => ({
      ...u,
      rentStatus: unitStatusMap.get(u.id)?.rentStatus ?? (u.status === "occupied" ? "PAID" : "VACANT"),
      overdueDays: unitStatusMap.get(u.id)?.overdueDays ?? 0,
    }));
    if (riskyOnly) rows = rows.filter((u) => u.rentStatus === "LATE" || u.rentStatus === "CRITICAL");
    if (unitStatusFilter !== "all") rows = rows.filter((u) => u.rentStatus === unitStatusFilter);
    return rows;
  }, [riskyOnly, unitStatusFilter, unitStatusMap, units]);
  useEffect(() => {
    setUnitsPage(1);
  }, [id, riskyOnly, unitStatusFilter, unitsSearch]);
  const unitsTotalPages = unitsPaged?.totalPages ?? 1;

  if (user?.role === "agent") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Asset details restricted</h1>
        <p className="mt-2 text-sm text-muted">
          Agent accounts can work on leases and payments only.
        </p>
      </Card>
    );
  }

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
      <AddUnitModal
        open={unitModal !== null}
        onClose={() => setUnitModal(null)}
        assetId={asset.id}
        assetName={asset.name}
        assetType={asset.type}
        preset={unitModal === "whole" ? "whole" : "custom"}
      />
      <EditUnitModal unit={editUnit} onClose={() => setEditUnit(null)} mutation={updateUnitMutation} />
      <ConfirmDialog
        open={!!deleteUnit}
        onClose={() => setDeleteUnit(null)}
        onConfirm={() => deleteUnit && deleteUnitMutation.mutate(deleteUnit.id)}
        title="Delete unit"
        description={`Delete "${deleteUnit?.name ?? "this unit"}"?`}
        detail="All active leases and payment records tied to this unit will also be permanently deleted. If you delete the last remaining unit on this asset, a default whole-parcel / whole-property unit is created again so the asset stays leasable."
        isPending={deleteUnitMutation.isPending}
      />
      <EditAssetModal asset={editAsset} onClose={() => setEditAsset(null)} />
      <ConfirmDialog
        open={confirmDeleteAsset}
        onClose={() => setConfirmDeleteAsset(false)}
        onConfirm={() => deleteAssetMutation.mutate()}
        title="Delete asset"
        description={`Permanently delete "${asset?.name}"?`}
        detail="All units, leases, and payment records linked to this asset will also be deleted."
        isPending={deleteAssetMutation.isPending}
      />
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-muted-bg px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                {asset.type === "land" ? "Land" : "Property"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditAsset(asset)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.75} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAsset(true)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 active:bg-red-800"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                  Delete
                </button>
              </div>
            </div>
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
              valueTitle={units?.length ? formatPercent(occupancyRate) : "—"}
              icon={DoorClosed}
            />
            <StatPill
              label="Visible monthly rent"
              value={formatCompactMoney(monthlyRentPotential)}
              valueTitle={formatMoney(monthlyRentPotential)}
              icon={LineChart}
            />
            <StatPill
              label="Book value"
              value={asset.purchasePrice ? formatCompactMoney(asset.purchasePrice) : "—"}
              valueTitle={asset.purchasePrice ? formatMoney(asset.purchasePrice) : "—"}
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
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" size="sm" onClick={() => setUnitModal("custom")}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Add unit
              </Button>
              {(units?.length ?? 0) === 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setUnitModal("whole")}
                >
                  <Home className="h-4 w-4" strokeWidth={1.75} />
                  {asset.type === "land" ? "One rentable parcel" : "Single unit (whole property)"}
                </Button>
              ) : null}
            </div>
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
          <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Units</h2>
              <p className="text-xs text-muted">Rentable spaces attached to this asset</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setUnitModal("custom")}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Add unit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setUnitModal("whole")}
              >
                <Home className="h-4 w-4" strokeWidth={1.75} />
                {asset.type === "land" ? "One parcel" : "Whole property"}
              </Button>
            </div>
          </div>
          <div className="border-b border-border bg-gradient-to-b from-slate-50/80 to-white/60 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Occupancy & payment map</p>
                <p className="text-xs text-muted">Modern tile map with payment-status colors.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "PAID", "LATE", "CRITICAL", "VACANT"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setUnitStatusFilter(status)}
                    className={
                      unitStatusFilter === status
                        ? "rounded-lg bg-main-blue px-3 py-1.5 text-xs font-medium text-white"
                        : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-muted-bg"
                    }
                  >
                    {status}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRiskyOnly((v) => !v)}
                  className={
                    riskyOnly
                      ? "rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white"
                      : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-muted-bg"
                  }
                >
                  Show only risky units
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/30 focus:ring-2 sm:max-w-xs"
                placeholder="Search unit name..."
                value={unitsSearch}
                onChange={(e) => setUnitsSearch(e.target.value)}
              />
              <p className="text-xs text-muted">
                Showing page {unitsPage} of {unitsTotalPages} ({unitsPaged?.total ?? 0} units)
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {unitsForMap.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setEditUnit(u)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    "before:absolute before:inset-0 before:pointer-events-none before:bg-gradient-to-br before:from-white/40 before:to-transparent",
                    u.rentStatus === "CRITICAL"
                      ? "border-rose-300 bg-gradient-to-br from-rose-50 to-rose-100/40"
                      : u.rentStatus === "LATE"
                        ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/40"
                        : u.rentStatus === "PAID"
                          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100/40"
                          : "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/40",
                  )}
                >
                  <div className="relative z-10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{u.type ?? "unit"}</p>
                    <p className="mt-1 truncate text-base font-semibold text-foreground">{u.name ?? "Unnamed unit"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {u.rentAmount ? `${formatCompactMoney(u.rentAmount)}/period` : "No rent set"}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          u.rentStatus === "CRITICAL"
                            ? "bg-rose-100 text-rose-700"
                            : u.rentStatus === "LATE"
                              ? "bg-amber-100 text-amber-700"
                              : u.rentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {u.rentStatus}
                      </span>
                      {u.overdueDays > 0 ? <span className="text-[11px] font-medium text-muted">{u.overdueDays}d overdue</span> : null}
                    </div>
                  </div>
                </button>
              ))}
              {unitsForMap.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                  No units match this filter.
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnitsPage((p) => Math.max(1, p - 1))}
                disabled={unitsPage <= 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-muted">
                {unitsPage}/{unitsTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setUnitsPage((p) => Math.min(unitsTotalPages, p + 1))}
                disabled={unitsPage >= unitsTotalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tabular-nums-fin text-foreground">
                      {u.rentAmount ? formatMoney(u.rentAmount) : "—"}
                      <span className="ml-1 text-xs font-normal text-muted">/ period</span>
                    </p>
                    <RowActions
                      onView={() => toast.info(`Unit: ${u.name ?? "Unnamed unit"}`)}
                      onEdit={() => setEditUnit(u)}
                      onDelete={() => setDeleteUnit(u)}
                    />
                  </div>
                </li>
              ))
            ) : (
              <li className="px-6 py-10 text-center text-sm text-muted">
                No units yet. Use <strong className="font-medium text-foreground">Add unit</strong> or{" "}
                <strong className="font-medium text-foreground">Whole property</strong> above to create
                rentable spaces, then attach leases.
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
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Latest valuation</p>
              <p className="mt-1 text-xl font-semibold tabular-nums-fin text-foreground">
                {latestValuation ? formatMoney(latestValuation.value) : "No valuation yet"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {latestValuation
                  ? `Recorded on ${latestValuation.valuationDate.slice(0, 10)}`
                  : "Add your first valuation entry to track appreciation over time."}
              </p>
            </div>

            <form
              className="grid gap-3 rounded-xl border border-border bg-muted-bg/35 p-4 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!valuationValue.trim() || !valuationDate) {
                  toast.error("Valuation amount and date are required");
                  return;
                }
                createValuationMutation.mutate({
                  value: valuationValue.trim(),
                  valuationDate,
                });
              }}
            >
              <div>
                <label className="text-xs font-medium text-muted">Valuation amount</label>
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
                  value={valuationValue}
                  onChange={(e) => setValuationValue(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Valuation date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
                  value={valuationDate}
                  onChange={(e) => setValuationDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createValuationMutation.isPending} className="w-full">
                  {createValuationMutation.isPending ? "Saving…" : "Add valuation"}
                </Button>
              </div>
            </form>

            <ValuationTimeline valuations={valuations ?? []} purchasePrice={asset.purchasePrice} />
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

function ValuationTimeline({
  valuations,
  purchasePrice,
}: {
  valuations: AssetValuation[];
  purchasePrice: string | null;
}) {
  if (!valuations.length) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        Valuation history starts once you add an entry. This helps track growth against purchase basis.
      </p>
    );
  }

  const basis = Number(purchasePrice ?? 0);
  return (
    <div className="rounded-xl border border-border bg-background/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Valuation timeline</p>
      </div>
      <ul className="divide-y divide-border">
        {valuations.map((entry) => {
          const delta = basis > 0 ? Number(entry.value) - basis : null;
          return (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{entry.valuationDate.slice(0, 10)}</p>
                {delta !== null ? (
                  <p className={`text-xs ${delta >= 0 ? "text-main-green" : "text-red-600"}`}>
                    {delta >= 0 ? "+" : ""}
                    {formatMoney(delta)} vs purchase basis
                  </p>
                ) : (
                  <p className="text-xs text-muted">Add purchase price to see gain/loss</p>
                )}
              </div>
              <p className="text-sm font-semibold tabular-nums-fin text-foreground">{formatMoney(entry.value)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatPill({
  label,
  value,
  valueTitle,
  icon: Icon,
}: {
  label: string;
  value: string;
  valueTitle?: string;
  icon: typeof Building2;
}) {
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-card">
      <Icon className="h-5 w-5 shrink-0 text-main-blue" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p
          title={valueTitle ?? value}
          className="truncate text-sm font-semibold tabular-nums-fin text-foreground"
        >
          {value}
        </p>
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

function EditUnitModal({
  unit,
  onClose,
  mutation,
}: {
  unit: Unit | null;
  onClose: () => void;
  mutation: {
    mutate: (args: { unitId: string; name: string; rentAmount?: string; status?: Unit["status"] }) => void;
    isPending: boolean;
  };
}) {
  const [name, setName] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [status, setStatus] = useState<Unit["status"]>("vacant");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unit) return;
    setName(unit.name ?? "");
    setRentAmount(unit.rentAmount ?? "");
    setStatus(unit.status);
    setError(null);
  }, [unit]);

  return (
    <Modal open={!!unit} onClose={onClose} title="Edit unit" description="Update this rentable space.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!unit) return;
          mutation.mutate({
            unitId: unit.id,
            name: name.trim() || (unit.name ?? ""),
            rentAmount: rentAmount.trim() || undefined,
            status,
          });
          onClose();
        }}
      >
        <div>
          <label className="text-xs font-medium text-muted">Unit name</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unit 2A"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Type (readonly)</label>
          <input
            readOnly
            className="mt-1 w-full rounded-lg border border-border bg-muted-bg px-3 py-2.5 text-sm capitalize text-muted outline-none"
            value={unit?.type === "whole" ? "Whole property / parcel" : (unit?.type ?? "—")}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Monthly rent</label>
          <input
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={rentAmount}
            onChange={(e) => setRentAmount(filterMoneyInput(e.target.value))}
            placeholder="0"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Status</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as Unit["status"])}
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
