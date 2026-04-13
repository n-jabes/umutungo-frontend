"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarRange, Filter, Receipt } from "lucide-react";
import { RecordPaymentModal } from "@/components/dashboard/quick-dialogs";
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
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, status, method }: { id: string; status?: "paid" | "pending" | "failed"; method?: string }) =>
      api.updatePayment(id, { status, method }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.paymentSummaryRange(appliedFrom, appliedTo) });
      await qc.invalidateQueries({ queryKey: queryKeys.paymentSummary(currentMonth()) });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(currentMonth()) });
      toast.success("Payment updated");
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ledger</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            One request loads all payments in your chosen billing-month range (up to 36 months).
            Adjust the range below, then apply.
          </p>
        </div>
        <Button type="button" className="self-start" onClick={() => setRecordOpen(true)}>
          Record payment
        </Button>
      </div>

      <Card className="space-y-4 border-border p-4">
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

      <Card className="flex flex-wrap items-center gap-2 border-border p-4">
        <span className="mr-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
          Status
        </span>
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "rounded-lg bg-main-blue px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
            }
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">
          Default month for new entries: {currentMonth()}
        </span>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-6 py-3">Paid</th>
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3">Amount</th>
              <th className="hidden px-6 py-3 md:table-cell">Method</th>
              <th className="px-6 py-3">Lease</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted">
                  Loading payment history…
                </td>
              </tr>
            ) : paginated.length ? (
              paginated.map((p) => (
                <tr key={p.id} className="transition hover:bg-muted-bg/30">
                  <td className="px-6 py-4 text-muted">
                    {new Date(p.paidAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium tabular-nums-fin text-foreground">{p.month}</td>
                  <td className="px-6 py-4 font-semibold tabular-nums-fin text-main-green">
                    {formatMoney(p.amount)}
                  </td>
                  <td className="hidden px-6 py-4 text-muted md:table-cell">
                    {p.method ?? "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-6 py-4 text-muted">{p.leaseLabel}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                      <Receipt className="h-3 w-3" strokeWidth={1.75} />
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RowActions
                      onView={() => (window.location.href = `/leases#${p.leaseId}`)}
                      onEdit={() => {
                        const nextStatus = window.prompt(
                          "Set payment status: paid | pending | failed",
                          p.status,
                        );
                        if (!nextStatus) return;
                        const normalized = nextStatus.trim().toLowerCase();
                        if (normalized !== "paid" && normalized !== "pending" && normalized !== "failed") {
                          toast.error("Status must be paid, pending, or failed");
                          return;
                        }
                        const nextMethod = window.prompt("Edit method (optional)", p.method ?? "");
                        updatePaymentMutation.mutate({
                          id: p.id,
                          status: normalized as "paid" | "pending" | "failed",
                          method: nextMethod?.trim() || undefined,
                        });
                      }}
                      onDelete={() =>
                        toast.promise(deletePaymentMutation.mutateAsync(p.id), {
                          loading: "Deleting payment...",
                          success: "Payment deleted",
                          error: "Failed to delete payment",
                        })
                      }
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted">
                  No payments match this filter in the selected range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <p>
          Showing {paginated.length} of {filtered.length} payments
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
