"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type Tab = "subscribed" | "owners";

export default function PlatformSubscriptionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<Tab>("subscribed");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "trialing" | "canceled" | "expired">("");
  const [planKey, setPlanKey] = useState("");

  const [accPage, setAccPage] = useState(1);
  const [accQ, setAccQ] = useState("");

  const listParams = useMemo(
    () => ({
      page,
      pageSize: 25,
      search: search.trim(),
      ...(status ? { status } : {}),
      ...(planKey.trim() ? { planKey: planKey.trim() } : {}),
    }),
    [page, search, status, planKey],
  );

  const subs = useQuery({
    queryKey: queryKeys.platformSubscriptions(listParams),
    queryFn: () => api.listPlatformSubscriptions(listParams),
    enabled: isAdmin && tab === "subscribed",
  });

  const accounts = useQuery({
    queryKey: queryKeys.platformSubscriptionAccounts({ page: accPage, pageSize: 25, q: accQ.trim() }),
    queryFn: () => api.listPlatformSubscriptionAccounts({ page: accPage, pageSize: 25, q: accQ.trim() }),
    enabled: isAdmin && tab === "owners",
  });

  const totalPages = subs.data ? Math.max(1, Math.ceil(subs.data.total / subs.data.pageSize)) : 1;
  const accTotalPages = accounts.data ? Math.max(1, Math.ceil(accounts.data.total / accounts.data.pageSize)) : 1;

  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Subscriptions"
        description="Manual lifecycle: grant plans, set billing windows and trials, extend, downgrade, cancel, or expire immediately. Every sensitive change requires an operator reason and is written to the subscription event log."
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Subscription administration requires an admin account.">
            <p className="text-sm text-muted">Sign in as a platform admin.</p>
          </PlatformSectionCard>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              <Button variant={tab === "subscribed" ? "primary" : "secondary"} size="sm" onClick={() => setTab("subscribed")}>
                Subscribed owners
              </Button>
              <Button variant={tab === "owners" ? "primary" : "secondary"} size="sm" onClick={() => setTab("owners")}>
                Owner directory
              </Button>
            </div>

            {tab === "subscribed" ? (
              <PlatformSectionCard title="Active subscriptions" description="Filter by owner name or email, status, or plan key.">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                  <label className="block min-w-[200px] flex-1 text-xs font-medium text-muted">
                    Search
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Name or email"
                    />
                  </label>
                  <label className="block w-full max-w-[180px] text-xs font-medium text-muted">
                    Status
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as typeof status);
                        setPage(1);
                      }}
                    >
                      <option value="">Any</option>
                      <option value="active">active</option>
                      <option value="trialing">trialing</option>
                      <option value="canceled">canceled</option>
                      <option value="expired">expired</option>
                    </select>
                  </label>
                  <label className="block w-full max-w-[180px] text-xs font-medium text-muted">
                    Plan key
                    <input
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                      value={planKey}
                      onChange={(e) => {
                        setPlanKey(e.target.value);
                        setPage(1);
                      }}
                      placeholder="starter"
                    />
                  </label>
                </div>

                {subs.isError ? (
                  <p className="text-sm text-destructive">{getErrorMessage(subs.error)}</p>
                ) : subs.isLoading ? (
                  <p className="text-sm text-muted">Loading…</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
                          <tr>
                            <th className="px-3 py-2">Owner</th>
                            <th className="px-3 py-2">Plan</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Period end</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.data?.items.map((row) => (
                            <tr key={row.id} className="border-b border-border/80 last:border-0">
                              <td className="px-3 py-2">
                                <p className="font-medium text-foreground">{row.owner.name}</p>
                                <p className="text-xs text-muted">{row.owner.email ?? row.owner.phone ?? "—"}</p>
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {row.planName} <span className="text-xs">({row.planKey} v{row.planVersion})</span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="rounded-md bg-muted-bg px-2 py-0.5 text-xs font-medium">{row.status}</span>
                              </td>
                              <td className="px-3 py-2 text-muted">{row.currentPeriodEnd ?? "—"}</td>
                              <td className="px-3 py-2 text-right">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/platform/subscriptions/${encodeURIComponent(row.ownerId)}`}>Manage</Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted">
                      <span>
                        Page {subs.data?.page} of {totalPages} · {subs.data?.total} total
                      </span>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                          Previous
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </PlatformSectionCard>
            ) : (
              <PlatformSectionCard title="Owner directory" description="Find owner accounts to open the subscription console (grant if they have no row yet).">
                <label className="mb-4 block max-w-md text-xs font-medium text-muted">
                  Search
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={accQ}
                    onChange={(e) => {
                      setAccQ(e.target.value);
                      setAccPage(1);
                    }}
                    placeholder="Name, email, or phone"
                  />
                </label>
                {accounts.isError ? (
                  <p className="text-sm text-destructive">{getErrorMessage(accounts.error)}</p>
                ) : accounts.isLoading ? (
                  <p className="text-sm text-muted">Loading…</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
                          <tr>
                            <th className="px-3 py-2">Owner</th>
                            <th className="px-3 py-2">Subscription</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.data?.items.map((o) => (
                            <tr key={o.id} className="border-b border-border/80 last:border-0">
                              <td className="px-3 py-2">
                                <p className="font-medium text-foreground">{o.name}</p>
                                <p className="text-xs text-muted">{o.email ?? o.phone ?? "—"}</p>
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {o.hasSubscription ? (
                                  <span className="rounded-md bg-muted-bg px-2 py-0.5 text-xs">{o.subscriptionStatus}</span>
                                ) : (
                                  <span className="text-xs">None (use grant)</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/platform/subscriptions/${encodeURIComponent(o.id)}`}>Open</Link>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted">
                      <span>
                        Page {accounts.data?.page} of {accTotalPages} · {accounts.data?.total} total
                      </span>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={accPage <= 1} onClick={() => setAccPage((p) => p - 1)}>
                          Previous
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={accPage >= accTotalPages}
                          onClick={() => setAccPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </PlatformSectionCard>
            )}
          </>
        )}
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
