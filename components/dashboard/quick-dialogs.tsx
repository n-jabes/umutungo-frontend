"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { currentMonth } from "@/lib/format";

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
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.createAsset({
        type,
        name: name.trim(),
        location: location.trim() || undefined,
        purchasePrice: purchasePrice.trim() || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.assets });
      await qc.invalidateQueries({ queryKey: ["analytics"] });
      setName("");
      setLocation("");
      setPurchasePrice("");
      setError(null);
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add asset"
      description="Land or income-producing property in your portfolio."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
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
        <div>
          <label className="text-xs font-medium text-muted">Location</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, district, or landmark"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Purchase price (optional)</label>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="0"
            inputMode="decimal"
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
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
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
      onClose();
    },
    onError: (e: unknown) => setError(getErrorMessage(e)),
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
