"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformAdminGuard } from "@/components/platform/platform-admin-guard";
import { usePlatformTwoStepPreference } from "@/components/platform/use-platform-two-step-preference";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { AuditTrailPanel } from "@/components/settings/audit-trail-panel";
import { Button, buttonClassName } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function PlatformAuditPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { twoStepRequired, setTwoStepRequiredPersisted } = usePlatformTwoStepPreference();

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "owner" | "admin" | "agent">("admin");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  const listParams = useMemo(
    () => ({
      page,
      pageSize: 25,
      action: actionFilter,
      entityType: entityTypeFilter,
      actorRole: roleFilter,
      from: auditDateFrom,
      to: auditDateTo,
    }),
    [page, actionFilter, entityTypeFilter, roleFilter, auditDateFrom, auditDateTo],
  );

  const audit = useQuery({
    queryKey: queryKeys.platformAdminAudit(listParams),
    queryFn: () =>
      api.listAuditLogs({
        page: listParams.page,
        pageSize: listParams.pageSize,
        ...(listParams.action.trim() ? { action: listParams.action.trim() } : {}),
        ...(listParams.entityType.trim() ? { entityType: listParams.entityType.trim() } : {}),
        ...(listParams.actorRole ? { actorRole: listParams.actorRole } : {}),
        ...(listParams.from ? { from: listParams.from } : {}),
        ...(listParams.to ? { to: listParams.to } : {}),
      }),
    enabled: isAdmin,
  });

  return (
    <PlatformAccessGuard>
      <PlatformAdminGuard>
      <PlatformPageShell
        title="Audit & compliance"
        description="Immutable platform-wide action log. Entries are append-only; use filters to narrow by action, entity, or actor role. Enable two-step typing confirmations on sensitive operations from this page or any operator console."
        actions={
          <Link href="/platform" className={buttonClassName({ variant: "secondary" })}>
            Overview
          </Link>
        }
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Audit search across all tenants requires an admin session.">
            <p className="text-sm text-muted">Sign in as a platform admin.</p>
          </PlatformSectionCard>
        ) : audit.isError ? (
          <PlatformSectionCard title="Could not load audit log" description={getErrorMessage(audit.error)}>
            <Button type="button" variant="secondary" size="sm" onClick={() => void audit.refetch()}>
              Retry
            </Button>
          </PlatformSectionCard>
        ) : (
          <>
            <PlatformSectionCard
              title="Safety preferences"
              description="When enabled, destructive or high-impact platform actions require typing a short confirmation phrase in addition to your written operator reason."
            >
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={twoStepRequired}
                  onChange={(e) => setTwoStepRequiredPersisted(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-foreground">Two-step confirmation</span>
                  <span className="mt-1 block text-xs text-muted">
                    Applies to plan publish, rollback draft, draft delete, and subscription grant / schedule / extend / downgrade / cancel / expire flows. Stored only in this browser.
                  </span>
                </span>
              </label>
            </PlatformSectionCard>

            <AuditTrailPanel
              title="Immutable action log"
              intro="Every row is an append-only record. Expand technical details for IP address, correlation id, browser hint, and full JSON metadata (including operator reasons where the action captured them)."
              items={audit.data?.items ?? []}
              total={audit.data?.total ?? 0}
              page={audit.data?.page ?? page}
              pageSize={audit.data?.pageSize ?? 25}
              isLoading={audit.isLoading}
              actionFilter={actionFilter}
              entityTypeFilter={entityTypeFilter}
              roleFilter={roleFilter}
              dateFrom={auditDateFrom}
              dateTo={auditDateTo}
              onActionFilter={(v) => {
                setActionFilter(v);
                setPage(1);
              }}
              onEntityTypeFilter={(v) => {
                setEntityTypeFilter(v);
                setPage(1);
              }}
              onRoleFilter={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
              onDateFromChange={(v) => {
                setAuditDateFrom(v);
                setPage(1);
              }}
              onDateToChange={(v) => {
                setAuditDateTo(v);
                setPage(1);
              }}
              onPageChange={setPage}
            />
          </>
        )}
      </PlatformPageShell>
      </PlatformAdminGuard>
    </PlatformAccessGuard>
  );
}
