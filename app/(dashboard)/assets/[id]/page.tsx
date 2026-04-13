"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronLeft,
  DoorClosed,
  Home,
  Layers,
  LineChart,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddUnitModal } from "@/components/assets/add-unit-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";
import { formatCompactMoney, formatMoney, formatPercent, monthRangeLastN } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Unit } from "@/lib/types";
import { cn } from "@/lib/utils";

const IncomeChart = dynamic(
  () => import("@/components/charts/income-chart").then((m) => m.IncomeChart),
  { ssr: false, loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-muted-bg" /> },
);

const tabs = ["Overview", "Units", "Income", "Valuation", "Events"] as const;

export default function AssetDetailPage() {
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [unitModal, setUnitModal] = useState<null | "custom" | "whole">(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);

  const deleteUnitMutation = useMutation({
    mutationFn: (unitId: string) => api.deleteUnit(unitId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.units(id) });
      await qc.invalidateQueries({ queryKey: queryKeys.units() });
      await qc.invalidateQueries({ queryKey: queryKeys.occupancy });
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.assets });
      await qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Unit deleted");
      setDeleteUnit(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updateUnitMutation = useMutation({
    mutationFn: ({ unitId, name, rentAmount, status }: { unitId: string; name: string; rentAmount?: string; status?: Unit["status"] }) =>
      api.updateUnit(unitId, { name, rentAmount, status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.units(id) });
      await qc.invalidateQueries({ queryKey: queryKeys.units() });
      toast.success("Unit updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

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
        detail="All active leases and payment records tied to this unit will also be permanently deleted."
        isPending={deleteUnitMutation.isPending}
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
            onChange={(e) => setRentAmount(e.target.value)}
            placeholder="0"
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
