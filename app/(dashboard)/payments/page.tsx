"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Receipt } from "lucide-react";
import { RecordPaymentModal } from "@/components/dashboard/quick-dialogs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { currentMonth, formatMoney, monthOffsets } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Payment } from "@/lib/types";

type FilterKey = "all" | "paid" | "unpaid" | "partial";

function PaymentsInner() {
  const searchParams = useSearchParams();
  const leaseFromUrl = searchParams.get("lease");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [recordOpen, setRecordOpen] = useState(!!leaseFromUrl);

  const months = useMemo(() => monthOffsets(12), []);
  const summaries = useQueries({
    queries: months.map((m) => ({
      queryKey: queryKeys.paymentSummary(m),
      queryFn: () => api.paymentSummary(m),
    })),
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
    for (const q of summaries) {
      for (const p of q.data?.payments ?? []) {
        const lease = p.lease;
        const assetName = lease?.unit?.asset.name ?? "Lease";
        const unitName = lease?.unit?.name;
        const label = unitName ? `${assetName} · ${unitName}` : assetName;
        map.set(p.id, { ...p, leaseLabel: label });
      }
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  }, [summaries]);

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
            Consolidated rent entries from the last twelve billing months, with collection filters.
          </p>
        </div>
        <Button type="button" className="self-start" onClick={() => setRecordOpen(true)}>
          Record payment
        </Button>
      </div>

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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-6 py-3">Paid</th>
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3">Amount</th>
              <th className="hidden px-6 py-3 md:table-cell">Method</th>
              <th className="px-6 py-3">Lease</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summaries.some((s) => s.isLoading) ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">
                  Loading payment history…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((p) => (
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">
                  No payments match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
