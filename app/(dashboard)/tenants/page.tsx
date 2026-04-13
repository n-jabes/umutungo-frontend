"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Phone, User, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddTenantModal } from "@/components/dashboard/quick-dialogs";
import { RowActions } from "@/components/ui/row-actions";
import { Card } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";
import { currentMonth } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export default function TenantsPage() {
  const qc = useQueryClient();
  const month = currentMonth();
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateTenant(id, { name }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      toast.success("Tenant updated successfully");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTenant(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.tenants });
      await qc.invalidateQueries({ queryKey: queryKeys.leases });
      await qc.invalidateQueries({ queryKey: queryKeys.leasesActive });
      await qc.invalidateQueries({ queryKey: queryKeys.outstanding(month) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <AddTenantModal open={addOpen} onClose={() => setAddOpen(false)} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">People</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tenants</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Everyone on your rent roll, with active lease context and current-month collection status.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-main-blue px-3 py-2 text-sm font-medium text-white"
        >
          Add tenant
        </button>
        {(["all", "active", "inactive"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setStatus(item);
              setPage(1);
            }}
            className={status === item ? "rounded-lg bg-blue-soft px-3 py-2 text-xs font-medium text-main-blue" : "rounded-lg px-3 py-2 text-xs font-medium text-muted"}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading tenants…</p>
      ) : !tenants?.length ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted">
          No tenants yet. Add people you lease to from the dashboard.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-3">Tenant</th>
                <th className="hidden px-6 py-3 sm:table-cell">Phone</th>
                <th className="px-6 py-3">Active lease</th>
                <th className="px-6 py-3">Payment status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => {
                const lease = leaseByTenant.get(t.id);
                const hasBalance = lease ? dueLeaseIds.has(lease.id) : false;
                return (
                  <tr key={t.id} className="transition hover:bg-muted-bg/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-soft">
                          <User className="h-4 w-4 text-main-blue" strokeWidth={1.75} />
                        </div>
                        <span className="font-medium text-foreground">{t.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-6 py-4 text-muted sm:table-cell">
                      {t.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {t.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {lease ? (
                        <span>
                          {lease.unit?.asset.name}
                          {lease.unit?.name ? ` · ${lease.unit.name}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted">No active lease</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {lease ? (
                          <Link
                            href={`/payments?lease=${lease.id}`}
                            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted-bg"
                          >
                            <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Mark payment
                          </Link>
                        ) : null}
                        <RowActions
                          onView={() => (window.location.href = lease ? `/leases#${lease.id}` : "/tenants")}
                          onEdit={() => {
                            const nextName = window.prompt("Edit tenant name", t.name);
                            if (nextName && nextName.trim()) {
                              updateMutation.mutate({ id: t.id, name: nextName.trim() });
                            }
                          }}
                          onDelete={() =>
                            toast.promise(deleteMutation.mutateAsync(t.id), {
                              loading: "Deleting tenant...",
                              success: "Tenant deleted",
                              error: "Failed to delete tenant",
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-muted">
        <p>
          Showing {rows.length} of {filtered.length} tenants
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
    </div>
  );
}
