"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarRange, Filter, Receipt } from "lucide-react";
import { EditPaymentModal, RecordPaymentModal } from "@/components/dashboard/quick-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";
import {
  currentMonth,
  formatMoney,
  monthRangeLastN,
  monthRangeYearToDate,
  monthSpanInclusive,
  paymentCoverageLabel,
} from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Payment } from "@/lib/types";
import { toast } from "sonner";

type FilterKey = "all" | "paid" | "unpaid" | "partial";

function PaymentsInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const leaseFromUrl = searchParams.get("lease");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(!!leaseFromUrl);
  const [editPayment, setEditPayment] = useState<(Payment & { leaseLabel: string }) | null>(null);
  const [deletePayment, setDeletePayment] = useState<(Payment & { leaseLabel: string }) | null>(null);

  const initialRange = useMemo(() => monthRangeLastN(12), []);
  const [appliedFrom, setAppliedFrom] = useState(initialRange.from);
  const [appliedTo, setAppliedTo] = useState(initialRange.to);
  const [draftFrom, setDraftFrom] = useState(initialRange.from);
  const [draftTo, setDraftTo] = useState(initialRange.to);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.paymentSummaryRange(appliedFrom, appliedTo),
    queryFn: () => api.paymentSummaryRange(appliedFrom, appliedTo),
  });

  const { data: leases } = useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => api.listLeases(),
  });

  const rentByLease = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leases ?? []) {
      m.set(l.id, Number(l.rentAmountAtTime));
    }
    return m;
  }, [leases]);

  const rows = useMemo(() => {
    const map = new Map<string, Payment & { leaseLabel: string }>();
    for (const p of summary?.payments ?? []) {
      const lease = p.lease;
      const assetName = lease?.unit?.asset.name ?? "Lease";
      const unitName = lease?.unit?.name;
      const label = unitName ? `${assetName} · ${unitName}` : assetName;
      map.set(p.id, { ...p, leaseLabel: label });
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  }, [summary]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const st = r.status.toLowerCase();
      if (filter === "paid") return st === "paid";
      if (filter === "unpaid") return st === "pending" || st === "failed";
      if (filter === "partial") {
        if (st !== "paid") return false;
        const expected = rentByLease.get(r.leaseId);
        if (!expected) return false;
        const amt = Number(r.amount);
        return amt > 0 && amt < expected;
      }
      return true;
    });
  }, [rows, filter, rentByLease]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => api.deletePayment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.paymentSummaryRange(appliedFrom, appliedTo) });
      await qc.invalidateQueries({ queryKey: queryKeys.paymentSummary(currentMonth()) });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(currentMonth()) });
      toast.success("Payment deleted");
      setDeletePayment(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function applyRange() {
    setRangeError(null);
    if (draftFrom > draftTo) {
      setRangeError("Start month must be on or before end month.");
      return;
    }
    if (monthSpanInclusive(draftFrom, draftTo) > 36) {
      setRangeError("Maximum range is 36 months.");
      return;
    }
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
  }

  function setPreset(range: { from: string; to: string }) {
    setRangeError(null);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setAppliedFrom(range.from);
    setAppliedTo(range.to);
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partial", label: "Partial" },
  ];

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 sm:space-y-8">
      <EditPaymentModal payment={editPayment} onClose={() => setEditPayment(null)} />
      <ConfirmDialog
        open={!!deletePayment}
        onClose={() => setDeletePayment(null)}
        onConfirm={() => deletePayment && deletePaymentMutation.mutate(deletePayment.id)}
        title="Delete payment"
        description={`Delete the ${deletePayment ? formatMoney(deletePayment.amount) : ""} payment for ${deletePayment?.leaseLabel ?? "this lease"}?`}
        detail="The balance due on the lease will be adjusted accordingly."
        isPending={deletePaymentMutation.isPending}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ledger</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Filter by legacy billing month (YYYY-MM) for the list below. Each row also shows the exact rent period
            covered (start–end dates) when available.
          </p>
        </div>
        <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={() => setRecordOpen(true)}>
          Record payment
        </Button>
      </div>

      <Card className="space-y-4 border-border p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.75} />
            Billing months
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:ml-2">
            <label className="sr-only" htmlFor="pay-from">
              From
            </label>
            <input
              id="pay-from"
              type="month"
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
            <span className="text-xs text-muted">to</span>
            <label className="sr-only" htmlFor="pay-to">
              To
            </label>
            <input
              id="pay-to"
              type="month"
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
            />
            <Button type="button" size="sm" variant="secondary" onClick={applyRange}>
              Apply range
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-[11px] font-medium uppercase tracking-wide text-muted sm:w-auto sm:mr-2">
            Quick
          </span>
          <button
            type="button"
            onClick={() => setPreset(monthRangeLastN(6))}
            className="rounded-lg border border-border bg-muted-bg/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted-bg"
          >
            Last 6 months
          </button>
          <button
            type="button"
            onClick={() => setPreset(monthRangeLastN(12))}
            className="rounded-lg border border-border bg-muted-bg/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted-bg"
          >
            Last 12 months
          </button>
          <button
            type="button"
            onClick={() => setPreset(monthRangeYearToDate())}
            className="rounded-lg border border-border bg-muted-bg/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted-bg"
          >
            Year to date
          </button>
        </div>
        {rangeError ? <p className="text-sm text-red-600">{rangeError}</p> : null}
        {summary && !isLoading ? (
          <p className="text-xs text-muted">
            Showing <strong className="font-medium text-foreground">{summary.count}</strong>{" "}
            payment{summary.count === 1 ? "" : "s"} in{" "}
            <strong className="font-medium text-foreground">
              {summary.from} — {summary.to}
            </strong>
            {" · "}
            Total <strong className="font-medium text-main-green">{formatMoney(summary.totalAmount)}</strong>
          </p>
        ) : null}
        {isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <span>{getErrorMessage(error)}</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="border-border p-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
            Status
          </span>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? "shrink-0 rounded-lg bg-main-blue px-3 py-2 text-xs font-medium text-white"
                    : "shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted sm:text-right">
          Quick presets use calendar months; when recording a payment you set the exact coverage dates.
        </p>
      </Card>

      {/* ── Mobile card list ── */}
      {isLoading ? (
        <p className="text-sm text-muted xl:hidden">Loading payment history…</p>
      ) : paginated.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted xl:hidden">
          No payments match this filter in the selected range.
        </Card>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card shadow-sm xl:hidden">
          {paginated.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums-fin text-main-green">{formatMoney(p.amount)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                    <Receipt className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    {p.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{p.leaseLabel}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span className="font-medium text-foreground">{paymentCoverageLabel(p)}</span>
                  {p.month ? (
                    <span className="text-[10px] text-muted">ref. {p.month}</span>
                  ) : null}
                  {p.method ? <span>{p.method}</span> : null}
                  <span>
                    {new Date(p.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <RowActions
                  onView={() => (window.location.href = `/leases#${p.leaseId}`)}
                  onEdit={() => setEditPayment(p)}
                  onDelete={() => setDeletePayment(p)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Full table (≥ 1280 px — enough room alongside sidebar) ── */}
      <div className="hidden w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm xl:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Paid</th>
              <th className="whitespace-nowrap px-4 py-3">Coverage</th>
              <th className="whitespace-nowrap px-4 py-3">Amount</th>
              <th className="whitespace-nowrap px-4 py-3">Method</th>
              <th className="whitespace-nowrap px-4 py-3">Lease</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  Loading payment history…
                </td>
              </tr>
            ) : paginated.length ? (
              paginated.map((p) => (
                <tr key={p.id} className="transition hover:bg-muted-bg/30">
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                    {new Date(p.paidAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="max-w-[220px] whitespace-normal px-4 py-3.5 text-sm font-medium leading-snug text-foreground">
                    <span className="block">{paymentCoverageLabel(p)}</span>
                    {p.month ? (
                      <span className="mt-0.5 block text-[10px] font-normal text-muted">ref. {p.month}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums-fin text-main-green">
                    {formatMoney(p.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                    {p.method ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted">{p.leaseLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                      <Receipt className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                      {p.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <RowActions
                      onView={() => (window.location.href = `/leases#${p.leaseId}`)}
                      onEdit={() => setEditPayment(p)}
                      onDelete={() => setDeletePayment(p)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No payments match this filter in the selected range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {paginated.length} of {filtered.length} payments
        </p>
        <div className="flex items-center justify-end gap-2">
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

      <RecordPaymentModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        initialLeaseId={leaseFromUrl}
      />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-muted">Loading payments…</div>
      }
    >
      <PaymentsInner />
    </Suspense>
  );
}
