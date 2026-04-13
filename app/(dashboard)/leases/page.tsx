"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EditLeaseModal } from "@/components/dashboard/quick-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { filterMoneyInput, isValidMoneyAmount, normalizeMoneyInput } from "@/lib/decimal-input";
import { formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Lease } from "@/lib/types";

export default function LeasesPage() {
  const qc = useQueryClient();
  const { data: leases, isLoading } = useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.listLeases(),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("all");
  const [page, setPage] = useState(1);
  const [editLease, setEditLease] = useState<Lease | null>(null);
  const [endLease, setEndLease] = useState<Lease | null>(null);

  const sorted = useMemo(
    () =>
      [...(leases ?? [])].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [leases],
  );
  const filtered = useMemo(
    () =>
      sorted.filter((lease) => {
        if (statusFilter === "all") return true;
        return statusFilter === "active" ? lease.status === "active" : lease.status !== "active";
      }),
    [sorted, statusFilter],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const endMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => api.endLease(id, endDate),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      toast.success("Lease ended successfully");
      setEndLease(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <EditLeaseModal lease={editLease} onClose={() => setEditLease(null)} />
      <ConfirmDialog
        open={!!endLease}
        onClose={() => setEndLease(null)}
        onConfirm={() =>
          endLease &&
          endMutation.mutate({ id: endLease.id, endDate: new Date().toISOString().slice(0, 10) })
        }
        title="End lease"
        description={`End the lease for "${endLease?.tenant?.name ?? "Unassigned tenant"}" on ${endLease?.unit?.asset.name ?? "this asset"}${endLease?.unit?.name ? ` · ${endLease.unit.name}` : ""}?`}
        detail="The contract will be closed with today's date as the end date."
        confirmLabel="End lease"
        isPending={endMutation.isPending}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Contracts</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Leases</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Every agreement across your units, with rent terms and lifecycle status.
          </p>
        </div>
        <Button type="button" className="gap-2 self-start" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          New lease
        </Button>
      </div>
      <Card className="p-3">
        <div className="flex gap-2">
          {(["all", "active", "ended"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setStatusFilter(filter);
                setPage(1);
              }}
              className={statusFilter === filter ? "rounded-lg bg-blue-soft px-3 py-1.5 text-xs font-medium text-main-blue" : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted"}
            >
              {filter}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted">Loading leases…</p>
      ) : !sorted.length ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted">
          No leases on file. Create a lease once you have units and tenants.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((l) => (
            <div
              key={l.id}
              id={l.id}
              className="scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-card transition hover:shadow-card-hover"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-soft">
                    <FileText className="h-5 w-5 text-main-blue" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {l.tenant?.name ?? "Unassigned tenant"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {l.unit?.asset.name}
                      {l.unit?.name ? ` · ${l.unit.name}` : ""}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {l.startDate.slice(0, 10)}
                        {l.endDate ? ` → ${l.endDate.slice(0, 10)}` : " → open"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-right">
                  <RowActions
                    onView={() => (window.location.href = `/leases#${l.id}`)}
                    onEdit={() => setEditLease(l)}
                    onDelete={() => {
                      if (l.status !== "active") {
                        toast.info("Lease already ended");
                        return;
                      }
                      setEndLease(l);
                    }}
                    deleteLabel="End lease"
                  />
                  <div>
                  <p className="text-lg font-semibold tabular-nums-fin text-foreground">
                    {formatMoney(l.rentAmountAtTime)}
                  </p>
                  <p className="mt-1 text-xs text-muted">contract rent</p>
                  <span
                    className={
                      l.status === "active"
                        ? "mt-2 inline-flex rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-main-green"
                        : "mt-2 inline-flex rounded-full bg-muted-bg px-2.5 py-0.5 text-xs font-medium capitalize text-muted"
                    }
                  >
                    {l.status}
                  </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-muted">
        <p>
          Showing {rows.length} of {filtered.length} leases
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <CreateLeaseModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateLeaseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: assets } = useQuery({
    queryKey: queryKeys.assets,
    queryFn: () => api.listAssets(),
    enabled: open,
  });
  const { data: units } = useQuery({
    queryKey: queryKeys.units(),
    queryFn: () => api.listUnits(),
    enabled: open,
  });
  const { data: tenants } = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.listTenants(),
    enabled: open,
  });

  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const rentNorm = normalizeMoneyInput(rent);
      const depRaw = deposit.trim();
      const depNorm = depRaw === "" ? "" : normalizeMoneyInput(deposit);
      return api.createLease({
        unitId,
        tenantId: tenantId || undefined,
        startDate,
        rentAmountAtTime: rentNorm,
        deposit: depNorm === "" ? undefined : depNorm,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.units() });
      await qc.invalidateQueries({ queryKey: ["analytics"] });
      setUnitId("");
      setTenantId("");
      setRent("");
      setDeposit("");
      setError(null);
      toast.success("Lease created successfully");
      onClose();
    },
    onError: (e: unknown) => {
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create lease"
      description="Attach a tenant to a unit. Rent is locked for the life of the lease."
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!unitId) {
            setError("Select a unit.");
            return;
          }
          const rentNorm = normalizeMoneyInput(rent);
          if (!isValidMoneyAmount(rentNorm)) {
            setError("Rent must be a positive number (e.g. 800000 or 1500.50).");
            return;
          }
          const depNorm = normalizeMoneyInput(deposit);
          if (deposit.trim() !== "" && !isValidMoneyAmount(depNorm)) {
            setError(
              "Security deposit must be a number only (e.g. 0 or 500000), not payment notes.",
            );
            return;
          }
          mutation.mutate();
        }}
      >
        <div>
          <label className="text-xs font-medium text-muted">Unit</label>
          <select
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">Select unit…</option>
            {(units ?? []).map((u) => {
              const an = assets?.find((a) => a.id === u.assetId)?.name ?? "Asset";
              return (
                <option key={u.id} value={u.id}>
                  {an} · {u.name ?? "Unnamed unit"}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-muted">
            Pick the correct space; the API rejects overlapping active leases on the same unit.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Tenant (optional)</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">Assign later</option>
            {(tenants ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Start date</label>
            <input
              required
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Rent amount</label>
            <input
              required
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 800000"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={rent}
              onChange={(e) => setRent(filterMoneyInput(e.target.value))}
            />
            <p className="mt-1 text-[11px] text-muted">
              Monthly rent for this contract (digits only; use 0 if needed).
            </p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Security deposit (optional)</label>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 0 or 500000"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={deposit}
            onChange={(e) => setDeposit(filterMoneyInput(e.target.value))}
          />
          <p className="mt-1 text-[11px] text-muted">
            One-time deposit amount in the same currency as rent. Leave empty for none.
          </p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create lease"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
