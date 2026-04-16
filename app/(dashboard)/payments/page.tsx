"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarRange, Filter, Receipt } from "lucide-react";
import { EditPaymentModal, RecordPaymentModal } from "@/components/dashboard/quick-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
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
import type { LeaseObligation, Payment, PaymentProof } from "@/lib/types";
import { toast } from "sonner";

type FilterKey = "all" | "paid" | "unpaid" | "partial";
type DisplayRow =
  | { kind: "payment"; payload: Payment & { leaseLabel: string } }
  | { kind: "obligation"; payload: LeaseObligation & { leaseLabel: string } };

function PaymentsInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const leaseFromUrl = searchParams.get("lease");
  const leaseIdFilter = leaseFromUrl?.trim() ?? "";
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<(Payment & { leaseLabel: string }) | null>(null);
  const [viewPayment, setViewPayment] = useState<(Payment & { leaseLabel: string }) | null>(null);
  const [deletePayment, setDeletePayment] = useState<(Payment & { leaseLabel: string }) | null>(null);
  const [attachmentProof, setAttachmentProof] = useState<PaymentProof | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);

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

  const { data: leaseForBanner } = useQuery({
    queryKey: queryKeys.lease(leaseIdFilter),
    queryFn: () => api.getLease(leaseIdFilter),
    enabled: leaseIdFilter.length > 0,
  });

  const { data: paymentDetail } = useQuery({
    queryKey: ["payments", "detail", viewPayment?.id ?? ""],
    queryFn: () => api.getPayment(viewPayment!.id),
    enabled: !!viewPayment,
  });
  const { data: paymentProofs } = useQuery({
    queryKey: queryKeys.paymentProofs(viewPayment?.id ?? ""),
    queryFn: () => api.listPaymentProofs(viewPayment!.id),
    enabled: !!viewPayment,
  });

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) {
        URL.revokeObjectURL(attachmentPreviewUrl);
      }
    };
  }, [attachmentPreviewUrl]);

  const paymentRows = useMemo(() => {
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

  const obligationRows = useMemo(() => {
    return (summary?.obligations ?? []).map((o) => {
      const lease = o.lease;
      const assetName = lease?.unit?.asset.name ?? "Lease";
      const unitName = lease?.unit?.name;
      const label = unitName ? `${assetName} · ${unitName}` : assetName;
      return { ...o, leaseLabel: label };
    });
  }, [summary?.obligations]);

  const scopedPaymentRows = useMemo(() => {
    if (!leaseIdFilter) return paymentRows;
    return paymentRows.filter((p) => p.leaseId === leaseIdFilter);
  }, [paymentRows, leaseIdFilter]);

  const scopedObligationRows = useMemo(() => {
    if (!leaseIdFilter) return obligationRows;
    return obligationRows.filter((o) => o.leaseId === leaseIdFilter);
  }, [obligationRows, leaseIdFilter]);

  /** Paid / unpaid / partial in the applied month range (and lease scope when set). */
  const rangeStatusStats = useMemo(() => {
    const paidRows = scopedPaymentRows.filter((p) => p.status.toLowerCase() === "paid");
    const paidAmount = paidRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const unpaidObs = scopedObligationRows.filter((o) => o.status === "unpaid");
    const partialObs = scopedObligationRows.filter((o) => o.status === "partial");
    const unpaidAmount = unpaidObs.reduce((sum, o) => sum + (o.outstandingAmount ?? 0), 0);
    const partialAmount = partialObs.reduce((sum, o) => sum + (o.outstandingAmount ?? 0), 0);
    return {
      paidCount: paidRows.length,
      paidAmount,
      unpaidCount: unpaidObs.length,
      unpaidAmount,
      partialCount: partialObs.length,
      partialAmount,
    };
  }, [scopedPaymentRows, scopedObligationRows]);

  const filtered = useMemo(() => {
    if (filter === "unpaid") {
      return scopedObligationRows
        .filter((o) => o.status === "unpaid")
        .map((payload): DisplayRow => ({ kind: "obligation", payload }));
    }
    if (filter === "partial") {
      return scopedObligationRows
        .filter((o) => o.status === "partial")
        .map((payload): DisplayRow => ({ kind: "obligation", payload }));
    }
    if (filter === "paid") {
      return scopedPaymentRows
        .filter((r) => r.status.toLowerCase() === "paid")
        .map((payload): DisplayRow => ({ kind: "payment", payload }));
    }
    /** "All": every payment row plus every obligation row in scope (same set as the table below). */
    const obligationDisplay = scopedObligationRows.map((payload): DisplayRow => ({ kind: "obligation", payload }));
    const paymentDisplay = scopedPaymentRows.map((payload): DisplayRow => ({ kind: "payment", payload }));
    return [...obligationDisplay, ...paymentDisplay].sort((a, b) => {
      const ta = a.kind === "payment" ? new Date(a.payload.paidAt).getTime() : new Date(a.payload.periodStartDate).getTime();
      const tb = b.kind === "payment" ? new Date(b.payload.paidAt).getTime() : new Date(b.payload.periodStartDate).getTime();
      return tb - ta;
    });
  }, [scopedPaymentRows, scopedObligationRows, filter]);

  /** Matches the table: same rows, same amount column (payment amount vs obligation outstanding). */
  const listSummary = useMemo(() => {
    let payments = 0;
    let obligations = 0;
    let openObligations = 0;
    let sumAmounts = 0;
    for (const row of filtered) {
      if (row.kind === "payment") {
        payments += 1;
        sumAmounts += Number(row.payload.amount || 0);
      } else {
        obligations += 1;
        sumAmounts += row.payload.outstandingAmount ?? 0;
        if (row.payload.status === "unpaid" || row.payload.status === "partial") {
          openObligations += 1;
        }
      }
    }
    return {
      rowCount: filtered.length,
      payments,
      obligations,
      openObligations,
      sumAmounts,
    };
  }, [filtered]);

  useEffect(() => {
    setPage(1);
  }, [filter, appliedFrom, appliedTo, leaseIdFilter]);
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
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
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
      <Modal
        open={!!viewPayment}
        onClose={() => setViewPayment(null)}
        title="Payment details"
        description="Review coverage, creator metadata, and proof attachments."
        size="lg"
      >
        {!paymentDetail ? (
          <p className="text-sm text-muted">Loading payment details…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-border bg-muted-bg/50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Amount</p>
                <p className="mt-0.5 text-sm font-semibold text-main-green">{formatMoney(paymentDetail.amount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</p>
                <p className="mt-0.5 text-sm capitalize text-foreground">{paymentDetail.status}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Lease</p>
                <p className="mt-0.5 text-sm text-foreground">
                  {paymentDetail.lease?.unit?.asset.name ?? "Asset"}
                  {paymentDetail.lease?.unit?.name ? ` · ${paymentDetail.lease.unit.name}` : ""}
                  {paymentDetail.lease?.tenant?.name ? ` · ${paymentDetail.lease.tenant.name}` : ""}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Coverage</p>
                <p className="mt-0.5 text-sm text-foreground">{paymentCoverageLabel(paymentDetail)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Method</p>
                <p className="mt-0.5 text-sm text-foreground">{paymentDetail.method ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Audit details</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <p className="text-foreground">
                  Created by:{" "}
                  <span className="font-medium">
                    {paymentDetail.createdBy?.name ?? paymentDetail.recordedByUserId ?? "Unknown"}
                  </span>
                  {paymentDetail.createdBy?.role ? (
                    <span className="ml-1 capitalize text-muted">({paymentDetail.createdBy.role})</span>
                  ) : null}
                </p>
                <p className="text-muted">
                  Recorded at:{" "}
                  {paymentDetail.recordedAt
                    ? new Date(paymentDetail.recordedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                    : "—"}
                </p>
                <p className="text-foreground">
                  Last edited by:{" "}
                  <span className="font-medium">
                    {paymentDetail.lastEditedBy?.name ?? paymentDetail.lastEditedByUserId ?? "—"}
                  </span>
                </p>
                <p className="text-muted">
                  Last edited at:{" "}
                  {paymentDetail.lastEditedAt
                    ? new Date(paymentDetail.lastEditedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                    : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Attachments</p>
                <span className="text-xs text-muted">{paymentProofs?.length ?? 0} file(s)</span>
              </div>
              {(paymentProofs ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted">No proof of payment attached.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {(paymentProofs ?? []).map((proof) => (
                    <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted-bg/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{proof.fileName}</p>
                        <p className="text-[11px] text-muted">
                          {new Date(proof.uploadedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                        onClick={async () => {
                          try {
                            setAttachmentLoading(true);
                            const blob = await api.getPaymentProofBlob(viewPayment!.id, proof.id);
                            if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
                            const url = URL.createObjectURL(blob);
                            setAttachmentPreviewUrl(url);
                            setAttachmentProof(proof);
                          } catch (e) {
                            toast.error(getErrorMessage(e));
                          } finally {
                            setAttachmentLoading(false);
                          }
                        }}
                      >
                        {attachmentLoading && attachmentProof?.id === proof.id ? "Opening…" : "Open attachment"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {attachmentProof && attachmentPreviewUrl ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close attachment preview"
            onClick={() => {
              URL.revokeObjectURL(attachmentPreviewUrl);
              setAttachmentPreviewUrl(null);
              setAttachmentProof(null);
            }}
          />
          <div className="relative z-10 flex h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{attachmentProof.fileName}</p>
                <p className="text-xs text-muted">Proof attachment preview</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  URL.revokeObjectURL(attachmentPreviewUrl);
                  setAttachmentPreviewUrl(null);
                  setAttachmentProof(null);
                }}
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              {attachmentProof.contentType === "application/pdf" ? (
                <iframe title="Proof preview" src={attachmentPreviewUrl} className="h-full w-full rounded-lg border border-border" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URLs; next/image is a poor fit here
                <img src={attachmentPreviewUrl} alt={attachmentProof.fileName} className="h-full w-full rounded-lg object-contain" />
              )}
            </div>
          </div>
        </div>
      ) : null}
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

      {leaseIdFilter ? (
        <Card className="border border-main-blue/20 bg-blue-soft/40 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            Ledger scoped to this lease
            {leaseForBanner
              ? ` · ${leaseForBanner.unit?.asset.name ?? "Property"}${
                  leaseForBanner.unit?.name ? ` · ${leaseForBanner.unit.name}` : ""
                }${leaseForBanner.tenant?.name ? ` · ${leaseForBanner.tenant.name}` : ""}`
              : null}
          </p>
          <p className="mt-1 text-xs text-muted">
            Paid rows are payments in the month range above. Unpaid and partial rows are open rent periods for this
            lease. Counts and totals above match the table for this lease. Use{" "}
            <strong className="text-foreground">All</strong> to see both together.
          </p>
          <Link
            href="/payments"
            className="mt-3 inline-flex text-xs font-medium text-main-blue underline-offset-2 hover:underline"
          >
            Clear lease filter
          </Link>
        </Card>
      ) : null}

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
            Showing <strong className="font-medium text-foreground">{listSummary.rowCount}</strong>{" "}
            row{listSummary.rowCount === 1 ? "" : "s"} in{" "}
            <strong className="font-medium text-foreground">
              {summary.from} — {summary.to}
            </strong>
            {leaseIdFilter ? (
              <>
                {" "}
                <span className="text-muted/90">(this lease)</span>
              </>
            ) : null}
            {listSummary.rowCount === 0 ? (
              <> · No rows match the current status filter.</>
            ) : (
              <>
                {" · "}
                Total of amounts in this list:{" "}
                <strong className="font-medium text-main-green">{formatMoney(listSummary.sumAmounts)}</strong>
                {listSummary.payments > 0 ? (
                  <>
                    {" · "}
                    <strong className="font-medium text-foreground">{listSummary.payments}</strong> payment
                    {listSummary.payments === 1 ? "" : "s"}
                  </>
                ) : null}
                {listSummary.obligations > 0 ? (
                  <>
                    {" · "}
                    <strong className="font-medium text-foreground">{listSummary.obligations}</strong> rent period
                    {listSummary.obligations === 1 ? "" : "s"}
                    {listSummary.openObligations > 0 ? (
                      <>
                        {" "}
                        (<strong>{listSummary.openObligations}</strong> unpaid or partial)
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </p>
        ) : null}
        {summary && !isLoading ? (
          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted-bg/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Paid</p>
              <p className="mt-1 text-lg font-semibold tabular-nums-fin text-main-green">
                {formatMoney(rangeStatusStats.paidAmount)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {rangeStatusStats.paidCount} payment{rangeStatusStats.paidCount === 1 ? "" : "s"} with status paid
                {leaseIdFilter ? " (this lease)" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted-bg/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Unpaid periods</p>
              <p className="mt-1 text-lg font-semibold tabular-nums-fin text-foreground">
                {formatMoney(rangeStatusStats.unpaidAmount)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {rangeStatusStats.unpaidCount} open obligation{rangeStatusStats.unpaidCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted-bg/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Partially paid</p>
              <p className="mt-1 text-lg font-semibold tabular-nums-fin text-foreground">
                {formatMoney(rangeStatusStats.partialAmount)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {rangeStatusStats.partialCount} period{rangeStatusStats.partialCount === 1 ? "" : "s"} with balance remaining
              </p>
            </div>
          </div>
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
          No rows match this filter in the selected range.
        </Card>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card shadow-sm xl:hidden">
          {paginated.map((item) => (
            <div key={`${item.kind}:${item.payload.id}`} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums-fin text-main-green">
                    {item.kind === "payment"
                      ? formatMoney(item.payload.amount)
                      : formatMoney(item.payload.outstandingAmount)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                    <Receipt className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    {item.payload.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">{item.payload.leaseLabel}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                  {item.kind === "payment" ? (
                    <>
                      <span className="font-medium text-foreground">{paymentCoverageLabel(item.payload)}</span>
                      <span className={item.payload.proofCount ? "font-medium text-main-green" : ""}>
                        {item.payload.proofCount
                          ? `${item.payload.proofCount} proof${item.payload.proofCount === 1 ? "" : "s"}`
                          : "No proof"}
                      </span>
                      <button
                        type="button"
                        className="text-main-blue underline-offset-2 transition hover:underline"
                        onClick={() => setViewPayment(item.payload)}
                      >
                        View details
                      </button>
                      {item.payload.month ? (
                        <span className="text-[10px] text-muted">ref. {item.payload.month}</span>
                      ) : null}
                      {item.payload.method ? <span>{item.payload.method}</span> : null}
                      <span>
                        {new Date(item.payload.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">
                        Due period {item.payload.periodStartDate.slice(0, 10)} - {item.payload.periodEndDate.slice(0, 10)}
                      </span>
                      <span>Expected {formatMoney(item.payload.expectedAmount)}</span>
                      <span>Paid {formatMoney(item.payload.paidAmount)}</span>
                    </>
                  )}
                </div>
              </div>
              {item.kind === "payment" ? (
                <div className="shrink-0">
                  <RowActions
                    onView={() => setViewPayment(item.payload)}
                    onEdit={() => setEditPayment(item.payload)}
                    onDelete={() => setDeletePayment(item.payload)}
                  />
                </div>
              ) : null}
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
              <th className="whitespace-nowrap px-4 py-3">Proof</th>
              <th className="whitespace-nowrap px-4 py-3">Lease</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                  Loading payment history…
                </td>
              </tr>
            ) : paginated.length ? (
              paginated.map((item) => (
                <tr key={`${item.kind}:${item.payload.id}`} className="transition hover:bg-muted-bg/30">
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                    {item.kind === "payment"
                      ? new Date(item.payload.paidAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : `${item.payload.periodStartDate.slice(0, 10)} - ${item.payload.periodEndDate.slice(0, 10)}`}
                  </td>
                  <td className="max-w-[220px] whitespace-normal px-4 py-3.5 text-sm font-medium leading-snug text-foreground">
                    {item.kind === "payment" ? (
                      <>
                        <span className="block">{paymentCoverageLabel(item.payload)}</span>
                        {item.payload.month ? (
                          <span className="mt-0.5 block text-[10px] font-normal text-muted">ref. {item.payload.month}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="block">Expected {formatMoney(item.payload.expectedAmount)}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums-fin text-main-green">
                    {item.kind === "payment"
                      ? formatMoney(item.payload.amount)
                      : formatMoney(item.payload.outstandingAmount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                    {item.kind === "payment" ? item.payload.method ?? "—" : `Paid ${formatMoney(item.payload.paidAmount)}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {item.kind === "payment" ? (
                      <div className="flex items-center gap-2">
                        {item.payload.proofCount ? (
                          <span className="inline-flex items-center rounded-full bg-main-green/10 px-2 py-0.5 text-xs font-medium text-main-green">
                            {item.payload.proofCount} attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted-bg px-2 py-0.5 text-xs text-muted">
                            None
                          </span>
                        )}
                        <button
                          type="button"
                          className="text-xs font-medium text-main-blue underline-offset-2 transition hover:underline"
                          onClick={() => setViewPayment(item.payload)}
                        >
                          View details
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Auto-generated obligation</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted">{item.payload.leaseLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                      <Receipt className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                      {item.payload.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    {item.kind === "payment" ? (
                      <RowActions
                        onView={() => setViewPayment(item.payload)}
                        onEdit={() => setEditPayment(item.payload)}
                        onDelete={() => setDeletePayment(item.payload)}
                      />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                  No rows match this filter in the selected range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {paginated.length} of {filtered.length} row{filtered.length === 1 ? "" : "s"}
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
