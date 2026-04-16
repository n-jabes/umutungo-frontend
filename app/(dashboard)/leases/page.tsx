"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, FileText, Plus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EditLeaseModal } from "@/components/dashboard/quick-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import {
  filterMoneyInput,
  isValidMoneyAmount,
  normalizeMoneyInput,
} from "@/lib/decimal-input";
import { formatMoney, paymentCoverageLabel } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Lease } from "@/lib/types";

export default function LeasesPage() {
  const qc = useQueryClient();
  const { data: leases, isLoading } = useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.listLeases(),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended" | "draft">("all");
  const [search, setSearch] = useState("");
  const [assetId, setAssetId] = useState("");
  const [tenantIdFilter, setTenantIdFilter] = useState("");
  const [openEndedOnly, setOpenEndedOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editLease, setEditLease] = useState<Lease | null>(null);
  const [viewLeaseId, setViewLeaseId] = useState<string | null>(null);
  const [endLease, setEndLease] = useState<Lease | null>(null);

  const sorted = useMemo(
    () =>
      [...(leases ?? [])].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      ),
    [leases],
  );

  const assetOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of sorted) {
      const id = l.unit?.assetId;
      const name = l.unit?.asset.name;
      if (id && name) map.set(id, name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sorted]);

  const tenantOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of sorted) {
      if (l.tenantId && l.tenant?.name) map.set(l.tenantId, l.tenant.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((lease) => {
      if (statusFilter !== "all" && lease.status !== statusFilter) return false;
      if (assetId && lease.unit?.assetId !== assetId) return false;
      if (tenantIdFilter && lease.tenantId !== tenantIdFilter) return false;
      if (openEndedOnly && (lease.status !== "active" || lease.endDate)) return false;
      if (unassignedOnly && lease.tenantId) return false;
      if (q) {
        const blob = [lease.tenant?.name, lease.unit?.asset.name, lease.unit?.name, lease.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, statusFilter, search, assetId, tenantIdFilter, openEndedOnly, unassignedOnly]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, assetId, tenantIdFilter, openEndedOnly, unassignedOnly]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const endMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => api.endLease(id, endDate),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      toast.success("Lease ended successfully");
      setEndLease(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <ViewLeaseModal
        leaseId={viewLeaseId}
        onClose={() => setViewLeaseId(null)}
        onEdit={(l) => {
          setViewLeaseId(null);
          setEditLease(l);
        }}
      />
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
      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["all", "active", "ended", "draft"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={
                  statusFilter === filter
                    ? "rounded-lg bg-blue-soft px-3 py-1.5 text-xs font-medium capitalize text-main-blue"
                    : "rounded-lg px-3 py-1.5 text-xs font-medium capitalize text-muted"
                }
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-medium text-muted" htmlFor="lease-search">
              Search
            </label>
            <input
              id="lease-search"
              type="search"
              placeholder="Tenant, property, unit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="lease-asset">
              Property
            </label>
            <select
              id="lease-asset"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/30 focus:ring-2"
            >
              <option value="">All properties</option>
              {assetOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="lease-tenant">
              Tenant
            </label>
            <select
              id="lease-tenant"
              value={tenantIdFilter}
              onChange={(e) => setTenantIdFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/30 focus:ring-2"
            >
              <option value="">All tenants</option>
              {tenantOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-border pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={openEndedOnly}
              onChange={(e) => setOpenEndedOnly(e.target.checked)}
              className="rounded border-border"
            />
            Active &amp; open-ended only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
              className="rounded border-border"
            />
            No tenant assigned
          </label>
          {(search.trim() ||
            assetId ||
            tenantIdFilter ||
            openEndedOnly ||
            unassignedOnly ||
            statusFilter !== "all") && (
            <button
              type="button"
              className="text-xs font-medium text-main-blue underline-offset-2 hover:underline"
              onClick={() => {
                setSearch("");
                setAssetId("");
                setTenantIdFilter("");
                setOpenEndedOnly(false);
                setUnassignedOnly(false);
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
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
                    onView={() => setViewLeaseId(l.id)}
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

function ViewLeaseModal({
  leaseId,
  onClose,
  onEdit,
}: {
  leaseId: string | null;
  onClose: () => void;
  onEdit: (lease: Lease) => void;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.lease(leaseId ?? ""),
    queryFn: () => api.getLease(leaseId!),
    enabled: !!leaseId,
  });

  const sortedPayments = useMemo(() => {
    if (!data?.payments?.length) return [];
    return [...data.payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [data?.payments]);

  return (
    <Modal
      open={!!leaseId}
      onClose={onClose}
      title="Lease details"
      description="Read-only summary. Edit the lease or open the payments ledger for this contract."
      size="lg"
    >
      {isLoading ? (
        <p className="text-sm text-muted">Loading lease…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">{getErrorMessage(error)}</p>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-border bg-muted-bg/40 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Location</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {data.unit?.asset.name ?? "—"}
                {data.unit?.name ? ` · ${data.unit.name}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Tenant</p>
              <p className="mt-0.5 text-sm text-foreground">{data.tenant?.name ?? "Unassigned"}</p>
              {data.tenant?.phone ? (
                <p className="mt-0.5 text-xs text-muted">{data.tenant.phone}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</p>
              <p className="mt-0.5 text-sm capitalize text-foreground">{data.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Term</p>
              <p className="mt-0.5 text-sm text-foreground">
                {data.startDate.slice(0, 10)}
                {data.endDate ? ` → ${data.endDate.slice(0, 10)}` : " → open-ended"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Contract rent</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums-fin text-foreground">
                {formatMoney(data.rentAmountAtTime)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Deposit</p>
              <p className="mt-0.5 text-sm tabular-nums-fin text-foreground">{formatMoney(data.deposit)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Created</p>
              <p className="mt-0.5 text-sm text-foreground">
                {new Date(data.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent payments</p>
            {sortedPayments.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No payments recorded for this lease yet.</p>
            ) : (
              <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-2 text-sm">
                {sortedPayments.slice(0, 25).map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted-bg/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums-fin text-main-green">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-muted">{paymentCoverageLabel(p)}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {new Date(p.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      <span className="ml-1 capitalize">· {p.status}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {sortedPayments.length > 25 ? (
              <p className="mt-1 text-[11px] text-muted">Showing 25 most recent. Full history is on Payments.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Link
              href={`/payments?lease=${encodeURIComponent(data.id)}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted-bg active:scale-[0.99]"
            >
              <Wallet className="h-4 w-4" strokeWidth={1.75} />
              Payments ledger
            </Link>
            <Button
              type="button"
              onClick={() => {
                const lease = { ...data } as Lease & { payments?: unknown };
                delete lease.payments;
                onEdit(lease);
              }}
            >
              Edit lease
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
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
  const [endDate, setEndDate] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUnitId("");
    setTenantId("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setRent("");
    setDeposit("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!unitId || !units?.length) return;
    const u = units.find((x) => x.id === unitId);
    if (u?.rentAmount != null && String(u.rentAmount).trim() !== "") {
      setRent(filterMoneyInput(String(u.rentAmount)));
    } else {
      setRent("");
    }
  }, [unitId, units]);

  const mutation = useMutation({
    mutationFn: () => {
      const rentNorm = normalizeMoneyInput(rent);
      const depRaw = deposit.trim();
      const depNorm = depRaw === "" ? "" : normalizeMoneyInput(deposit);
      return api.createLease({
        unitId,
        tenantId: tenantId || undefined,
        startDate,
        endDate: endDate || undefined,
        rentAmountAtTime: rentNorm,
        deposit: depNorm === "" ? undefined : depNorm,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.units() });
      await qc.invalidateQueries({ queryKey: ["analytics"] });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      setUnitId("");
      setTenantId("");
      setEndDate("");
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
      description="Attach a tenant to a unit. Contract rent is prefilled from the unit list price when available; adjust if the deal differs. It stays fixed for the life of the lease."
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
          if (endDate && endDate < startDate) {
            setError("End date must be on or after the start date, or leave it empty for open-ended.");
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
        <div className="grid gap-4 sm:grid-cols-3">
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
            <label className="text-xs font-medium text-muted">End date (optional)</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
            <p className="mt-1 text-[11px] text-muted">Leave blank to keep lease open-ended.</p>
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
              Prefilled from the unit&apos;s list rent when set on the unit; edit if the agreed contract rent is
              different.
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
