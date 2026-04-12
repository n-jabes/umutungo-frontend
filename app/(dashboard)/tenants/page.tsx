"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Phone, User, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { currentMonth } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

export default function TenantsPage() {
  const month = currentMonth();
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">People</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tenants</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Everyone on your rent roll, with active lease context and current-month collection status.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading tenants…</p>
      ) : !tenants?.length ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted">
          No tenants yet. Add people you lease to from the dashboard.
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
              {tenants.map((t) => {
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
                          <>
                            <Link
                              href={`/leases#${lease.id}`}
                              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-main-blue transition hover:bg-blue-soft"
                            >
                              View lease
                            </Link>
                            <Link
                              href={`/payments?lease=${lease.id}`}
                              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted-bg"
                            >
                              <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                              Mark payment
                            </Link>
                          </>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
