"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { currentMonth, formatMoney } from "@/lib/format";
import type { Asset, Lease, Payment, Tenant } from "@/lib/types";

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
    mutationFn: () =>
      api.createAsset({
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
      setName("");
      setLocation("");
      setPurchasePrice("");
      setPurchaseDate("");
      setNotes("");
      setError(null);
      toast.success("Asset created successfully");
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
      title="Add asset"
      description="Land or income-producing property in your portfolio."
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
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.createTenant({
        name: name.trim(),
        phone: phone.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      setName("");
      setPhone("");
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
  const [month, setMonth] = useState(currentMonth());
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: leases } = useQuery({
    queryKey: queryKeys.leasesActive,
    queryFn: () => api.listActiveLeases(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setLeaseId(initialLeaseId ?? "");
  }, [open, initialLeaseId]);

  const mutation = useMutation({
    mutationFn: () =>
      api.recordPayment({
        leaseId,
        amount: amount.trim(),
        month,
        method: method.trim() || undefined,
        status: "paid",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: ["analytics"] });
      setAmount("");
      setMethod("");
      setError(null);
      toast.success("Payment recorded");
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
      title="Record payment"
      description="Log rent received against an active lease."
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted">Amount</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Billing month</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="YYYY-MM"
            />
          </div>
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setPhone(tenant.phone ?? "");
    setError(null);
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updateTenant(tenant!.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
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
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"paid" | "pending" | "failed">("paid");
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payment) return;
    setAmount(String(payment.amount));
    setStatus((payment.status ?? "paid") as "paid" | "pending" | "failed");
    setMethod(payment.method ?? "");
    setError(null);
  }, [payment]);

  const mutation = useMutation({
    mutationFn: () =>
      api.updatePayment(payment!.id, {
        amount: amount.trim(),
        status,
        method: method.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(currentMonth()) });
      toast.success("Payment updated");
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  return (
    <Modal open={!!payment} onClose={onClose} title="Edit payment" description="Adjust amount, status, or payment method.">
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Lease</p>
            <p className="mt-0.5 truncate text-sm text-foreground">{payment?.leaseLabel ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Billing month</p>
            <p className="mt-0.5 text-sm text-foreground">{payment?.month ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Recorded at</p>
            <p className="mt-0.5 text-sm text-foreground">
              {payment ? new Date(payment.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
            </p>
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
