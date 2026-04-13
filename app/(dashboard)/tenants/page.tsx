"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Phone, User, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddTenantModal, EditTenantModal } from "@/components/dashboard/quick-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { Card } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";
import { currentMonth } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type { Tenant } from "@/lib/types";

export default function TenantsPage() {
  const qc = useQueryClient();
  const month = currentMonth();
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.listTenants(),
  });
  const { data: active } = useQuery({
    queryKey: queryKeys.leasesActive,
    queryFn: () => api.listActiveLeases(),
  });
  const { data: outstanding } = useQuery({
    queryKey: queryKeys.outstanding(month),
    queryFn: () => api.outstandingRent(month),
  });

  const leaseByTenant = useMemo(() => {
    const m = new Map<string, (typeof active extends (infer L)[] | undefined ? L : never)>();
    for (const l of active ?? []) {
      if (l.tenantId) m.set(l.tenantId, l);
    }
    return m;
  }, [active]);

  const dueLeaseIds = useMemo(
    () => new Set((outstanding?.leasesWithBalance ?? []).map((r) => r.leaseId)),
    [outstanding],
  );
  const filtered = useMemo(
    () =>
      (tenants ?? []).filter((t) => {
        const hasLease = leaseByTenant.has(t.id);
        if (status === "active") return hasLease;
        if (status === "inactive") return !hasLease;
        return true;
      }),
    [tenants, leaseByTenant, status],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTenant(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(month) });
      toast.success("Tenant deleted");
      setDeleteTenant(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 sm:space-y-8">
      <AddTenantModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} />
      <ConfirmDialog
        open={!!deleteTenant}
        onClose={() => setDeleteTenant(null)}
        onConfirm={() => deleteTenant && deleteMutation.mutate(deleteTenant.id)}
        title="Delete tenant"
        description={`Delete "${deleteTenant?.name}"? This permanently removes the tenant and any associated leases and payment history.`}
        isPending={deleteMutation.isPending}
      />

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">People</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Tenants</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Everyone on your rent roll, with active lease context and current-month collection status.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full rounded-lg bg-main-blue px-3 py-2.5 text-sm font-medium text-white sm:w-auto"
        >
          Add tenant
        </button>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {(["all", "active", "inactive"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setStatus(item);
                setPage(1);
              }}
              className={
                status === item
                  ? "shrink-0 rounded-lg bg-blue-soft px-3 py-2 text-xs font-medium text-main-blue"
                  : "shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted"
              }
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading tenants…</p>
      ) : !tenants?.length ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted">
          No tenants yet. Add people you lease to from the dashboard.
        </Card>
      ) : (
        <>
          {/* ── Card list (< 1280 px — mobile, tablet, small desktop) ── */}
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card shadow-sm xl:hidden">
            {rows.map((t) => {
              const lease = leaseByTenant.get(t.id);
              const hasBalance = lease ? dueLeaseIds.has(lease.id) : false;
              return (
                <div key={t.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-soft">
                      <User className="h-4 w-4 text-main-blue" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{t.name}</p>
                      {t.phone ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <Phone className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                          {t.phone}
                        </p>
                      ) : null}
                      {lease ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {lease.unit?.asset.name}
                          {lease.unit?.name ? ` · ${lease.unit.name}` : ""}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-muted">No active lease</p>
                      )}
                      {lease ? (
                        <span
                          className={
                            hasBalance
                              ? "mt-1.5 inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-main-green ring-1 ring-accent-gold/40"
                              : "mt-1.5 inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-main-green"
                          }
                        >
                          {hasBalance ? "Balance due" : "Current"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {lease ? (
                      <Link
                        href={`/payments?lease=${lease.id}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted-bg"
                      >
                        <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Pay
                      </Link>
                    ) : null}
                    <RowActions
                      onView={() => (window.location.href = lease ? `/leases#${lease.id}` : "/tenants")}
                      onEdit={() => setEditTenant(t)}
                      onDelete={() => setDeleteTenant(t)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Full table (≥ 1280 px — enough room alongside sidebar) ── */}
          <div className="hidden w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm xl:block">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Tenant</th>
                  <th className="whitespace-nowrap px-4 py-3">Phone</th>
                  <th className="whitespace-nowrap px-4 py-3">Active lease</th>
                  <th className="whitespace-nowrap px-4 py-3">Payment status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((t) => {
                  const lease = leaseByTenant.get(t.id);
                  const hasBalance = lease ? dueLeaseIds.has(lease.id) : false;
                  return (
                    <tr key={t.id} className="transition hover:bg-muted-bg/30">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-soft">
                            <User className="h-4 w-4 text-main-blue" strokeWidth={1.75} />
                          </div>
                          <span className="font-medium text-foreground">{t.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                        {t.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                            {t.phone}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                        {lease ? (
                          <span>
                            {lease.unit?.asset.name}
                            {lease.unit?.name ? ` · ${lease.unit.name}` : ""}
                          </span>
                        ) : (
                          <span className="text-muted">No active lease</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {lease ? (
                          <span
                            className={
                              hasBalance
                                ? "inline-flex items-center rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-medium text-main-green ring-1 ring-accent-gold/40"
                                : "inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-main-green"
                            }
                          >
                            {hasBalance ? "Balance due" : "Current"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex flex-nowrap items-center justify-end gap-2">
                          {lease ? (
                            <Link
                              href={`/payments?lease=${lease.id}`}
                              className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted-bg"
                            >
                              <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                              Mark payment
                            </Link>
                          ) : null}
                          <RowActions
                            onView={() => (window.location.href = lease ? `/leases#${lease.id}` : "/tenants")}
                            onEdit={() => setEditTenant(t)}
                            onDelete={() => setDeleteTenant(t)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {rows.length} of {filtered.length} tenants
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
    </div>
  );
}
