"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { openPlatformCommandPalette } from "@/components/platform/platform-command-palette";
import {
  PlatformPageShell,
  PlatformSectionCard,
} from "@/components/platform/platform-page-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { AuditLogEntry, PlatformDashboardSummary } from "@/lib/types";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

function formatDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

function AdminAuditLine({ entry }: { entry: AuditLogEntry }) {
  const actor = entry.user?.name ?? "Unknown";
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold text-foreground">{entry.action}</p>
        <p className="text-xs text-muted">
          <span className="font-medium text-foreground/90">{actor}</span>
          <span className="mx-1">·</span>
          <span>{entry.entityType}</span>
        </p>
      </div>
      <p className="shrink-0 text-[11px] tabular-nums text-muted">{formatWhen(entry.createdAt)}</p>
    </div>
  );
}

export default function PlatformOverviewPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";
  const qc = useQueryClient();

  const summary = useQuery({
    queryKey: queryKeys.platformDashboard,
    queryFn: () => api.getPlatformDashboardSummary(),
    enabled: isAdmin,
    staleTime: 45_000,
  });
  const platformSettings = useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: () => api.getPlatformSettings(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const updatePlatformSettings = useMutation({
    mutationFn: (selfRegistrationEnabled: boolean) => api.updatePlatformSettings({ selfRegistrationEnabled }),
    onSuccess: async () => {
      toast.success("Platform access setting updated");
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.platformSettings }),
        qc.invalidateQueries({ queryKey: queryKeys.publicPlatformSettings }),
      ]);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const adminAudit = useQuery({
    queryKey: [...queryKeys.auditLogs, "platform-overview", 1, 10] as const,
    queryFn: () => api.listAuditLogs({ page: 1, pageSize: 10, actorRole: "admin" }),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const dash: PlatformDashboardSummary | undefined = summary.data;
  const refreshing = summary.isFetching || adminAudit.isFetching || platformSettings.isFetching;

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.platformDashboard }),
      qc.invalidateQueries({ queryKey: queryKeys.auditLogs, exact: false }),
    ]);
  }

  return (
    <PlatformAccessGuard>
      {isAdmin ? (
        <PlatformPageShell
          title="Operations overview"
          description="High-signal subscription health, trial runway, quota pressure, and recent admin activity. Press Ctrl K (⌘K on Mac) for quick navigation anywhere in the platform workspace."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full justify-center gap-2 sm:w-auto"
                onClick={() => openPlatformCommandPalette()}
              >
                Quick actions
              </Button>
              <div className="flex flex-wrap gap-2">
                <Link href="/platform/plans" className={buttonClassName({ variant: "secondary", className: "flex-1 sm:flex-none" })}>
                  Plans
                </Link>
                <Link
                  href="/platform/plans/compare"
                  className={buttonClassName({ variant: "secondary", className: "flex-1 sm:flex-none" })}
                >
                  Compare
                </Link>
                <Link
                  href="/platform/subscriptions"
                  className={buttonClassName({ variant: "secondary", className: "flex-1 sm:flex-none" })}
                >
                  Subscriptions
                </Link>
                <Link href="/platform/audit" className={buttonClassName({ variant: "secondary", className: "flex-1 sm:flex-none" })}>
                  Audit
                </Link>
                <Link href="/admin/feedback" className={buttonClassName({ variant: "secondary", className: "flex-1 sm:flex-none" })}>
                  Feedback
                </Link>
              </div>
            </div>
          }
        >
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {dash?.generatedAt ? (
                  <>
                    Snapshot{" "}
                    <span className="font-medium text-foreground/80">{formatWhen(dash.generatedAt)}</span>
                  </>
                ) : summary.isLoading ? (
                  "Loading snapshot…"
                ) : null}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted hover:text-foreground"
                disabled={refreshing}
                onClick={() => void refresh()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} strokeWidth={1.75} aria-hidden />
                Refresh
              </Button>
            </div>

            {summary.isError ? (
              <PlatformSectionCard title="Could not load snapshot" description={getErrorMessage(summary.error)}>
                <Button type="button" variant="secondary" size="sm" onClick={() => void summary.refetch()}>
                  Try again
                </Button>
              </PlatformSectionCard>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Active subscriptions" value={dash?.subscriptions.active ?? "—"} />
                <StatCard label="Trialing" value={dash?.subscriptions.trialing ?? "—"} hint="Includes trials not ending in the next 14 days" />
                <StatCard label="Total rows" value={dash?.subscriptions.total ?? "—"} hint="All subscription records" />
              </div>
            )}

            <PlatformSectionCard
              title="Trials ending soon"
              description="Trialing subscriptions with trial end within the next 14 days (up to 30 accounts, soonest first)."
            >
              {summary.isLoading ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : !dash ? null : dash.trialsEndingSoon.length === 0 ? (
                <p className="text-sm text-muted">No trials in this window.</p>
              ) : (
                <>
                  <div className="space-y-2 lg:hidden">
                    {dash.trialsEndingSoon.map((row) => (
                      <Link
                        key={row.ownerId}
                        href={`/platform/subscriptions/${row.ownerId}`}
                        className="block rounded-xl border border-border bg-muted-bg/30 px-3 py-3 transition hover:border-main-blue/25 hover:bg-muted-bg/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{row.ownerName}</p>
                          <span className="shrink-0 rounded-full border border-accent-gold/35 bg-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-main-green">
                            {row.daysRemaining}d
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {row.planName} · ends {formatDay(row.trialEndsAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <DataTableShell ariaLabel="Trials ending soon" showScrollHint={false}>
                      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
                            <th className="px-3 py-2 font-medium">Owner</th>
                            <th className="px-3 py-2 font-medium">Plan</th>
                            <th className="px-3 py-2 font-medium">Trial ends</th>
                            <th className="px-3 py-2 font-medium text-right">Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dash.trialsEndingSoon.map((row) => (
                            <tr key={row.ownerId} className="border-b border-border last:border-b-0">
                              <td className="px-3 py-2">
                                <Link
                                  href={`/platform/subscriptions/${row.ownerId}`}
                                  className="font-medium text-main-blue hover:underline"
                                >
                                  {row.ownerName}
                                </Link>
                                <p className="text-xs text-muted">{row.ownerEmail ?? row.ownerPhone ?? "—"}</p>
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {row.planName}
                                <span className="ml-1 font-mono text-[11px]">({row.planKey})</span>
                              </td>
                              <td className="px-3 py-2 tabular-nums text-muted">{formatDay(row.trialEndsAt)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">{row.daysRemaining}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DataTableShell>
                  </div>
                </>
              )}
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Over-limit accounts (sample)"
              description={`Owners over units.max or agents.max among the ${dash?.overLimitSampleSize ?? "—"} most recently created accounts — not a full portfolio scan.`}
            >
              {summary.isLoading ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : !dash ? null : dash.overLimitAccounts.length === 0 ? (
                <p className="text-sm text-muted">No over-limit accounts in this sample.</p>
              ) : (
                <>
                  <div className="space-y-2 lg:hidden">
                    {dash.overLimitAccounts.map((row) => (
                      <Link
                        key={row.ownerId}
                        href={`/platform/subscriptions/${row.ownerId}`}
                        className="block rounded-xl border border-border bg-muted-bg/30 px-3 py-3 transition hover:border-main-blue/25 hover:bg-muted-bg/50"
                      >
                        <p className="text-sm font-semibold text-foreground">{row.name}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          Units {row.unitsCurrent}/{row.unitsMax ?? "—"}
                          <span className="mx-1.5">·</span>
                          Agents {row.agentsCurrent}/{row.agentsMax ?? "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {(row.overUnits ? "Over unit cap" : "") +
                            (row.overUnits && row.overAgents ? " · " : "") +
                            (row.overAgents ? "Over agent cap" : "")}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <DataTableShell ariaLabel="Over-limit sample" showScrollHint={false}>
                      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
                            <th className="px-3 py-2 font-medium">Owner</th>
                            <th className="px-3 py-2 font-medium">Units</th>
                            <th className="px-3 py-2 font-medium">Agents</th>
                            <th className="px-3 py-2 font-medium">Flags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dash.overLimitAccounts.map((row) => (
                            <tr key={row.ownerId} className="border-b border-border last:border-b-0">
                              <td className="px-3 py-2">
                                <Link
                                  href={`/platform/subscriptions/${row.ownerId}`}
                                  className="font-medium text-main-blue hover:underline"
                                >
                                  {row.name}
                                </Link>
                                <p className="text-xs text-muted">{row.email ?? "—"}</p>
                              </td>
                              <td className="px-3 py-2 tabular-nums text-muted">
                                {row.unitsCurrent} / {row.unitsMax ?? "—"}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-muted">
                                {row.agentsCurrent} / {row.agentsMax ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted">
                                {row.overUnits ? <span className="mr-2 rounded bg-red-500/10 px-1.5 py-0.5 text-red-700">Units</span> : null}
                                {row.overAgents ? <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-700">Agents</span> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DataTableShell>
                  </div>
                </>
              )}
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Platform management"
              description="Control who can create new owner accounts before billing automation is enabled."
            >
              {platformSettings.isLoading ? (
                <p className="text-sm text-muted">Loading setting…</p>
              ) : platformSettings.isError ? (
                <p className="text-sm text-muted">{getErrorMessage(platformSettings.error)}</p>
              ) : (
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted-bg/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Self-registration is{" "}
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          platformSettings.data?.selfRegistrationEnabled
                            ? "bg-main-green/15 text-main-green"
                            : "bg-red-500/10 text-red-700",
                        )}
                      >
                        {platformSettings.data?.selfRegistrationEnabled ? "enabled" : "disabled"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Disable this to require admin-created users only from the dashboard.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={updatePlatformSettings.isPending || !platformSettings.data}
                    onClick={() =>
                      updatePlatformSettings.mutate(!Boolean(platformSettings.data?.selfRegistrationEnabled))
                    }
                  >
                    {platformSettings.data?.selfRegistrationEnabled
                      ? "Disable self-registration"
                      : "Enable self-registration"}
                  </Button>
                </div>
              )}
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Recent admin actions"
              description="Latest audit entries where the actor role is admin (this workspace)."
            >
              {adminAudit.isLoading ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : adminAudit.isError ? (
                <p className="text-sm text-muted">{getErrorMessage(adminAudit.error)}</p>
              ) : !adminAudit.data?.items.length ? (
                <p className="text-sm text-muted">No admin audit entries yet.</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border bg-muted-bg/20 px-3">
                  {adminAudit.data.items.map((entry) => (
                    <AdminAuditLine key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </PlatformSectionCard>
          </>
        </PlatformPageShell>
      ) : (
        <PlatformPageShell
          title="Your plan & billing"
          description={
            isAgent
              ? "You are linked to an owner portfolio. Review the active plan, limits, and usage here; billing changes are handled by the owner or an administrator."
              : "Manage how your subscription maps to limits and usage. Payment method history and invoices will live here in a future update—for day-to-day rent collection, use the Rental workspace."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/settings?tab=plan" className={buttonClassName({ variant: "secondary" })}>
                Open plan & usage
              </Link>
              <Link href="/payments" className={buttonClassName({ variant: "secondary" })}>
                Rental payments
              </Link>
            </div>
          }
        >
          <PlatformSectionCard
            title="Subscription & limits"
            description="See your current plan, feature flags, and usage against limits (same data as Settings → Plan & usage)."
          >
            <p className="text-sm text-muted">
              We keep detailed controls in Settings so they stay consistent across workspaces.
            </p>
            <Link href="/settings?tab=plan" className={cn(buttonClassName({ variant: "primary" }), "mt-4 inline-flex")}>
              Go to plan & usage
            </Link>
          </PlatformSectionCard>

          <PlatformSectionCard
            title="Payment methods & history"
            description="Reserved for a future release: saved payment methods, invoices, and payout history in one place."
          >
            <p className="text-sm text-muted">Not available yet — you will see it here when billing self-serve ships.</p>
          </PlatformSectionCard>
        </PlatformPageShell>
      )}
    </PlatformAccessGuard>
  );
}
