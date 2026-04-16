"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  currentMonth,
  firstDayOfMonthYm,
  formatMoney,
  formatPaymentCoverage,
  lastDayOfMonthYm,
  previousMonthYm,
} from "@/lib/format";
import type { Asset, Lease, Payment, Tenant } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import {
  filterMoneyInput,
  isValidMoneyAmount,
  normalizeMoneyInput,
} from "@/lib/decimal-input";

const ALLOWED_PROOF_MIME = ["application/pdf", "image/jpeg", "image/png"];

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddAssetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<"property" | "land">("property");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const priceNorm = normalizeMoneyInput(purchasePrice.trim());
      return api.createAsset({
        type,
        name: name.trim(),
        location: location.trim() || undefined,
        purchasePrice: priceNorm && isValidMoneyAmount(priceNorm) ? priceNorm : undefined,
        purchaseDate: purchaseDate || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      setName("");
      setLocation("");
      setPurchasePrice("");
      setPurchaseDate("");
      setNotes("");
      setError(null);
      toast.success("Asset created successfully");
      onClose();
      void Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.assets }),
        qc.invalidateQueries({ queryKey: ["analytics"] }),
        qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot }),
        qc.invalidateQueries({ queryKey: ["units"] }),
      ]);
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
      title="Add asset"
      description="Land or income-producing property in your portfolio."
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const priceNorm = normalizeMoneyInput(purchasePrice.trim());
          if (purchasePrice.trim() !== "" && !isValidMoneyAmount(priceNorm)) {
            setError("Purchase price must be numeric (digits and at most one decimal point).");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={type}
              onChange={(e) => setType(e.target.value as "property" | "land")}
            >
              <option value="property">Property</option>
              <option value="land">Land</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Name</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kimihurura apartments"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Location</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, district, or landmark"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Purchase price (optional)</label>
            <input
              inputMode="decimal"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(filterMoneyInput(e.target.value))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Purchase date (optional)</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Notes (optional)</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capex history, lender covenants, tenant notes…"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Create asset"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AddTenantModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.createTenant({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      setName("");
      setPhone("");
      setEmail("");
      setError(null);
      toast.success("Tenant added successfully");
      onClose();
    },
    onError: (e: unknown) => {
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add tenant" description="People you lease units to.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div>
          <label className="text-xs font-medium text-muted">Full name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Phone</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+250…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Email (optional)</label>
          <input
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <p className="mt-1 text-[11px] text-muted">For owner and admin records only.</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save tenant"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function RecordPaymentModal({
  open,
  onClose,
  initialLeaseId,
}: {
  open: boolean;
  onClose: () => void;
  initialLeaseId?: string | null;
}) {
  const qc = useQueryClient();
  const [leaseId, setLeaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState(() => firstDayOfMonthYm(currentMonth()));
  const [periodEnd, setPeriodEnd] = useState(() => lastDayOfMonthYm(currentMonth()));
  const [method, setMethod] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: leases } = useQuery({
    queryKey: queryKeys.leasesActive,
    queryFn: () => api.listActiveLeases(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setLeaseId(initialLeaseId ?? "");
    setAmount("");
    const ym = currentMonth();
    setPeriodStart(firstDayOfMonthYm(ym));
    setPeriodEnd(lastDayOfMonthYm(ym));
    setProofFile(null);
    setError(null);
  }, [open, initialLeaseId]);

  useEffect(() => {
    if (!leaseId) {
      setAmount("");
      return;
    }
    const lease = leases?.find((l) => l.id === leaseId);
    if (lease?.rentAmountAtTime != null && String(lease.rentAmountAtTime).trim() !== "") {
      setAmount(filterMoneyInput(String(lease.rentAmountAtTime)));
    }
  }, [leaseId, leases]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payment = await api.recordPayment({
        leaseId,
        amount: normalizeMoneyInput(amount),
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        method: method.trim() || undefined,
        status: "paid",
      });
      if (proofFile) {
        await api.uploadPaymentProof(payment.id, proofFile);
      }
      return payment;
    },
    onSuccess: () => {
      setAmount("");
      setMethod("");
      setProofFile(null);
      setError(null);
      toast.success("Payment recorded");
      onClose();
      // Do not await: invalidateQueries waits for active refetches, which blocked the modal
      // (especially every dashboard query under ["analytics"]) for users entering many payments.
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      void qc.invalidateQueries({ queryKey: queryKeys.leases });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
      void qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
    },
    onError: (e: unknown) => {
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    },
  });

  const selectedLease = leases?.find((l) => l.id === leaseId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      description="Log rent received for a date range (e.g. several months in one payment). The system stores the exact period covered."
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!leaseId) {
            setError("Select a lease.");
            return;
          }
          if (!periodStart || !periodEnd) {
            setError("Choose both start and end dates for the rent period.");
            return;
          }
          if (periodStart > periodEnd) {
            setError("Rent period start must be on or before the end date.");
            return;
          }
          const amtNorm = normalizeMoneyInput(amount);
          if (!isValidMoneyAmount(amtNorm)) {
            setError("Enter a valid payment amount (e.g. 800000).");
            return;
          }
          if (proofFile && !ALLOWED_PROOF_MIME.includes(proofFile.type)) {
            setError("Only PDF, JPG, and PNG files are allowed as payment proof.");
            return;
          }
          if (proofFile && proofFile.size > 5_000_000) {
            setError("Payment proof must be 5 MB or smaller.");
            return;
          }
          mutation.mutate();
        }}
      >
        <div>
          <label className="text-xs font-medium text-muted">Lease</label>
          <select
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
          >
            <option value="">Select lease…</option>
            {(leases ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {(l.tenant?.name ?? "Unassigned")} —{" "}
                {l.unit?.asset.name ?? "Asset"}
                {l.unit?.name ? ` · ${l.unit.name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-muted">Rent covers (inclusive)</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                onClick={() => {
                  const ym = currentMonth();
                  setPeriodStart(firstDayOfMonthYm(ym));
                  setPeriodEnd(lastDayOfMonthYm(ym));
                }}
              >
                This month
              </button>
              <button
                type="button"
                className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                onClick={() => {
                  const ym = previousMonthYm(currentMonth());
                  setPeriodStart(firstDayOfMonthYm(ym));
                  setPeriodEnd(lastDayOfMonthYm(ym));
                }}
              >
                Last month
              </button>
            </div>
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-muted" htmlFor="pay-period-start">
                From
              </label>
              <input
                id="pay-period-start"
                type="date"
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted" htmlFor="pay-period-end">
                Through
              </label>
              <input
                id="pay-period-end"
                type="date"
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Preview:{" "}
            <span className="font-medium text-foreground">
              {formatPaymentCoverage(periodStart, periodEnd)}
            </span>
          </p>
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-muted" htmlFor="pay-amount">
              Amount received
            </label>
            <button
              type="button"
              id="pay-use-contract"
              disabled={!selectedLease?.rentAmountAtTime}
              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-muted-bg hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (selectedLease?.rentAmountAtTime) {
                  setAmount(filterMoneyInput(String(selectedLease.rentAmountAtTime)));
                }
              }}
            >
              Use contract rent
            </button>
          </div>
          <input
            id="pay-amount"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={amount}
            onChange={(e) => setAmount(filterMoneyInput(e.target.value))}
            inputMode="decimal"
            placeholder="e.g. 800000"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Defaults to this lease&apos;s contract rent when you pick a lease; change for partial payments, combined
            months, or fees.
            {selectedLease?.rentAmountAtTime ? (
              <span className="mt-0.5 block font-medium text-foreground">
                Contract rent: {formatMoney(selectedLease.rentAmountAtTime)}
              </span>
            ) : null}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Method (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Bank, mobile money, cash…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted" htmlFor="payment-proof">
            Proof of payment (optional)
          </label>
          <input
            id="payment-proof"
            type="file"
            accept=".pdf,image/png,image/jpeg"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/30 focus:ring-2 file:mr-3 file:rounded-md file:border-0 file:bg-main-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-[11px] text-muted">
            Accepted formats: PDF, JPG, PNG. Max 5 MB.
            {proofFile ? (
              <span className="ml-1 font-medium text-foreground">
                Selected: {proofFile.name} ({formatFileSize(proofFile.size)})
              </span>
            ) : null}
          </p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EditTenantModal
───────────────────────────────────────────────────────────────── */
export function EditTenantModal({
  tenant,
  onClose,
}: {
  tenant: Tenant | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setPhone(tenant.phone ?? "");
    setEmail(tenant.email ?? "");
    setError(null);
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateTenant(tenant!.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() ? email.trim() : null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      toast.success("Tenant updated");
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  return (
    <Modal open={!!tenant} onClose={onClose} title="Edit tenant" description="Update contact details for this tenant.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div>
          <label className="text-xs font-medium text-muted">Full name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Phone</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+250…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Email (optional)</label>
          <input
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <p className="mt-1 text-[11px] text-muted">For owner and admin records only.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Tenant ID (readonly)</label>
          <input
            readOnly
            className="mt-1 w-full rounded-lg border border-border bg-muted-bg px-3 py-2.5 text-xs text-muted outline-none"
            value={tenant?.id ?? ""}
          />
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

/* ─────────────────────────────────────────────────────────────────
   EditPaymentModal
───────────────────────────────────────────────────────────────── */
export function EditPaymentModal({
  payment,
  onClose,
}: {
  payment: (Payment & { leaseLabel?: string }) | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [status, setStatus] = useState<"paid" | "pending" | "failed">("paid");
  const [method, setMethod] = useState("");
  const [editReason, setEditReason] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofDeleteReason, setProofDeleteReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: proofs } = useQuery({
    queryKey: queryKeys.paymentProofs(payment?.id ?? ""),
    queryFn: () => api.listPaymentProofs(payment!.id),
    enabled: !!payment,
  });

  useEffect(() => {
    if (!payment) return;
    setAmount(String(payment.amount));
    setStatus((payment.status ?? "paid") as "paid" | "pending" | "failed");
    setMethod(payment.method ?? "");
    setEditReason("");
    setProofFile(null);
    setProofDeleteReason("");
    let ps = payment.periodStartDate?.slice(0, 10) ?? "";
    let pe = payment.periodEndDate?.slice(0, 10) ?? "";
    if ((!ps || !pe) && payment.month) {
      ps = firstDayOfMonthYm(payment.month);
      pe = lastDayOfMonthYm(payment.month);
    }
    setPeriodStart(ps);
    setPeriodEnd(pe);
    setError(null);
  }, [payment]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedReason = editReason.trim();
      const body: Parameters<typeof api.updatePayment>[1] = {
        amount: amount.trim(),
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        status,
        method: method.trim() || undefined,
      };
      if (user?.role && user.role !== "owner") {
        body.editReason = trimmedReason;
      } else if (trimmedReason) {
        body.editReason = trimmedReason;
      }
      const updated = await api.updatePayment(payment!.id, body);
      if (proofFile) {
        await api.uploadPaymentProof(payment!.id, proofFile);
      }
      return updated;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(currentMonth()) });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      if (payment?.id) {
        await qc.invalidateQueries({ queryKey: queryKeys.paymentProofs(payment.id) });
      }
      setProofFile(null);
      toast.success("Payment updated");
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  const deleteProofMutation = useMutation({
    mutationFn: (proofId: string) =>
      api.deletePaymentProof(payment!.id, proofId, proofDeleteReason.trim() || undefined),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.paymentProofs(payment!.id) });
      setProofDeleteReason("");
      toast.success("Payment proof removed");
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title="Edit payment"
      description="Update the rent period covered, amount, or status. Administrators must briefly explain every change for the audit trail."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!periodStart || !periodEnd) {
            setError("Start and end dates are required.");
            return;
          }
          if (periodStart > periodEnd) {
            setError("Period start must be on or before the end date.");
            return;
          }
          if (user?.role && user.role !== "owner" && editReason.trim().length < 3) {
            setError("A short reason for this change is required (at least 3 characters).");
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="grid gap-3 rounded-xl border border-border bg-muted-bg/50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Lease</p>
            <p className="mt-0.5 truncate text-sm text-foreground">{payment?.leaseLabel ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Reference month</p>
            <p className="mt-0.5 text-sm text-foreground">{payment?.month ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Coverage (read-only summary)</p>
            <p className="mt-0.5 text-sm text-foreground">
              {payment?.periodStartDate && payment?.periodEndDate
                ? formatPaymentCoverage(payment.periodStartDate, payment.periodEndDate)
                : payment?.month ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Recorded at</p>
            <p className="mt-0.5 text-sm text-foreground">
              {payment ? new Date(payment.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="edit-pay-from">
              Rent covers from
            </label>
            <input
              id="edit-pay-from"
              type="date"
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="edit-pay-through">
              Through
            </label>
            <input
              id="edit-pay-through"
              type="date"
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Amount</label>
          <input
            required
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Status</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as "paid" | "pending" | "failed")}
          >
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Method (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Bank, mobile money, cash…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted" htmlFor="edit-pay-reason">
            Reason for change
            {user?.role && user.role !== "owner" ? (
              <span className="font-normal text-red-600"> (required)</span>
            ) : (
              <span className="font-normal text-muted"> (optional for owners)</span>
            )}
          </label>
          <textarea
            id="edit-pay-reason"
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="e.g. Tenant paid late fees separately; corrected period end date."
          />
        </div>
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="edit-payment-proof">
              Attach additional proof
            </label>
            <input
              id="edit-payment-proof"
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/30 focus:ring-2 file:mr-3 file:rounded-md file:border-0 file:bg-main-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-[11px] text-muted">PDF, JPG, PNG only (max 5 MB).</p>
            {proofFile ? (
              <p className="mt-2 text-xs text-muted">
                Selected: {proofFile.name} ({formatFileSize(proofFile.size)}). This file will upload when you click{" "}
                <span className="font-medium text-foreground">Save changes</span>.
              </p>
            ) : null}
          </div>
          <div className="space-y-2 pt-1">
            <label className="text-xs font-medium text-muted">Existing proofs</label>
            {(proofs ?? []).length === 0 ? (
              <p className="text-xs text-muted">No proof file uploaded for this payment yet.</p>
            ) : (
              <div className="space-y-2">
                {(proofs ?? []).map((proof) => (
                  <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted-bg/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{proof.fileName}</p>
                      <p className="text-[11px] text-muted">
                        {formatFileSize(proof.fileSizeBytes)} · {new Date(proof.uploadedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition hover:bg-muted-bg hover:text-foreground"
                        onClick={() => {
                          void api
                            .downloadPaymentProof(payment!.id, proof.id, proof.fileName)
                            .catch((e) => setError(getErrorMessage(e)));
                        }}
                      >
                        Download
                      </button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={deleteProofMutation.isPending}
                        onClick={() => deleteProofMutation.mutate(proof.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <textarea
                  rows={2}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none ring-main-blue/30 focus:ring-2"
                  value={proofDeleteReason}
                  onChange={(e) => setProofDeleteReason(e.target.value)}
                  placeholder="Optional reason when removing a proof (saved in audit)."
                />
              </div>
            )}
          </div>
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

/* ─────────────────────────────────────────────────────────────────
   EditLeaseModal
───────────────────────────────────────────────────────────────── */
export function EditLeaseModal({
  lease,
  onClose,
}: {
  lease: Lease | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tenantId, setTenantId] = useState<string>("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: tenants } = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.listTenants(),
    enabled: !!lease,
  });

  useEffect(() => {
    if (!lease) return;
    setTenantId(lease.tenantId ?? "");
    setEndDate(lease.endDate ? lease.endDate.slice(0, 10) : "");
    setError(null);
  }, [lease]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateLease(lease!.id, {
        tenantId: tenantId || null,
        endDate: endDate || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(currentMonth()) });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      toast.success("Lease updated");
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  return (
    <Modal open={!!lease} onClose={onClose} title="Edit lease" description="Update tenant assignment or close this contract.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="grid gap-3 rounded-xl border border-border bg-muted-bg/50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Unit</p>
            <p className="mt-0.5 text-sm text-foreground">
              {lease?.unit?.asset.name}{lease?.unit?.name ? ` · ${lease.unit.name}` : ""}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Start date</p>
            <p className="mt-0.5 text-sm text-foreground">{lease?.startDate.slice(0, 10)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Contract rent</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {lease ? formatMoney(lease.rentAmountAtTime) : "—"}
              <span className="ml-1 text-xs font-normal text-muted">/ period</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</p>
            <p className="mt-0.5 text-sm capitalize text-foreground">{lease?.status ?? "—"}</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Tenant</label>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {(tenants ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">Reassign or remove the tenant linked to this contract.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">End date (leave blank for open-ended)</label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-muted">Setting an end date marks the lease as ended.</p>
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

/* ─────────────────────────────────────────────────────────────────
   EditAssetModal
───────────────────────────────────────────────────────────────── */
export function EditAssetModal({
  asset,
  onClose,
}: {
  asset: Asset | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<"property" | "land">("property");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) return;
    setType(asset.type);
    setName(asset.name);
    setLocation(asset.location ?? "");
    setPurchasePrice(asset.purchasePrice ?? "");
    setPurchaseDate(asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "");
    setNotes(asset.notes ?? "");
    setError(null);
  }, [asset]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateAsset(asset!.id, {
        type,
        name: name.trim(),
        location: location.trim() || undefined,
        purchasePrice: purchasePrice.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.assets });
      await qc.invalidateQueries({ queryKey: ["analytics"] });
      await qc.invalidateQueries({ queryKey: queryKeys.onboardingRoot });
      toast.success("Asset updated");
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  return (
    <Modal
      open={!!asset}
      onClose={onClose}
      title="Edit asset"
      description="Update details for this property or land."
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={type}
              onChange={(e) => setType(e.target.value as "property" | "land")}
            >
              <option value="property">Property</option>
              <option value="land">Land</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Name</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kimihurura apartments"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Location</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, district, or landmark"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Purchase price (optional)</label>
            <input
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Purchase date (optional)</label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Notes (optional)</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capex history, lender covenants, tenant notes…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Asset ID (readonly)</label>
          <input
            readOnly
            className="mt-1 w-full rounded-lg border border-border bg-muted-bg px-3 py-2.5 text-xs text-muted outline-none"
            value={asset?.id ?? ""}
          />
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
