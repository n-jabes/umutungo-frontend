"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_SUGGESTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  AUDIT_ENTITY_TYPE_VALUES,
} from "@/lib/audit-filter-reference";
import type { AuditLogEntry } from "@/lib/types";

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso.slice(0, 19).replace("T", " ");
  }
}

function truncateMiddle(s: string, head = 8, tail = 4) {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function truncateUa(ua: string, max = 96) {
  if (ua.length <= max) return ua;
  return `${ua.slice(0, max)}…`;
}

function auditReasonLine(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const r = metadata.reason;
  if (typeof r === "string" && r.trim()) return r.trim();
  const p = metadata.publishReason;
  if (typeof p === "string" && p.trim()) return p.trim();
  return null;
}

async function copyText(label: string, text: string | null | undefined) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy");
  }
}

function CopyIconButton({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 shrink-0 gap-1 px-2 text-xs text-muted hover:text-foreground", className)}
      onClick={() => void copyText(label, value)}
      aria-label={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

function auditPageButtonSequence(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const want = new Set<number>([1, totalPages, current]);
  for (let d = -2; d <= 2; d++) want.add(current + d);
  const nums = [...want].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const seq: (number | "gap")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) seq.push("gap");
    seq.push(n);
    prev = n;
  }
  return seq;
}

function AuditEntryRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasContext =
    Boolean(entry.ipAddress) || Boolean(entry.userAgent) || Boolean(entry.correlationId);
  const hasMeta = entry.metadata != null && Object.keys(entry.metadata).length > 0;
  const expandable = hasContext || hasMeta;

  const actor = entry.user?.name ?? "Unknown user";
  const role = entry.user?.role ?? "—";
  const entityLine =
    entry.entityId != null
      ? `${entry.entityType} · ${truncateMiddle(entry.entityId)}`
      : entry.entityType;

  const reasonText = auditReasonLine(entry.metadata as Record<string, unknown> | null | undefined);

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="font-mono text-sm font-semibold tracking-tight text-foreground">{entry.action}</p>
            <span className="text-xs text-muted tabular-nums-fin">{formatWhen(entry.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground">
            <span className="font-medium">{actor}</span>
            <span className="text-muted"> · </span>
            <span className="capitalize text-muted">{role}</span>
          </p>
          <p className="text-xs text-muted">
            <span className="font-medium text-foreground/80">Entity</span>
            <span className="mx-1.5 text-border">|</span>
            <span className="font-mono">{entityLine}</span>
          </p>
          {reasonText ? (
            <p className="text-xs text-foreground/90">
              <span className="font-semibold text-muted">Reason</span>: {reasonText}
            </p>
          ) : null}
        </div>
        {expandable ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 shrink-0 self-start gap-1.5 border-dashed"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Technical details
          </Button>
        ) : (
          <p className="shrink-0 self-start rounded-md border border-dashed border-border bg-muted-bg/50 px-3 py-2 text-xs text-muted">
            No request metadata for this entry.
          </p>
        )}
      </div>
      {open && expandable ? (
        <div className="border-t border-border bg-muted-bg/40 px-4 py-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {hasContext ? (
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Request context</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-muted">Client IP</dt>
                    <dd className="mt-1 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                      <code className="min-w-0 w-full flex-1 break-all rounded-md bg-card px-2 py-1.5 font-mono text-xs ring-1 ring-border">
                        {entry.ipAddress ?? "—"}
                      </code>
                      <CopyIconButton label="IP address" value={entry.ipAddress ?? undefined} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">Correlation ID</dt>
                    <dd className="mt-1 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                      <code className="min-w-0 w-full flex-1 break-all rounded-md bg-card px-2 py-1.5 font-mono text-xs ring-1 ring-border">
                        {entry.correlationId ?? "—"}
                      </code>
                      <CopyIconButton label="Correlation ID" value={entry.correlationId ?? undefined} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">User-Agent</dt>
                    <dd className="mt-1 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start">
                      <code
                        className="min-w-0 w-full max-h-24 flex-1 overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-card px-2 py-1.5 font-mono text-[11px] leading-relaxed ring-1 ring-border"
                        title={entry.userAgent ?? undefined}
                      >
                        {entry.userAgent ? truncateUa(entry.userAgent) : "—"}
                      </code>
                      <CopyIconButton label="User-Agent" value={entry.userAgent ?? undefined} />
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
            {hasMeta ? (
              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Metadata</p>
                <pre className="min-w-0 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-card p-3 font-mono text-[11px] leading-relaxed ring-1 ring-border">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function AuditTrailPanel({
  items,
  total,
  page,
  pageSize,
  isLoading,
  actionFilter,
  entityTypeFilter,
  roleFilter,
  dateFrom,
  dateTo,
  onActionFilter,
  onEntityTypeFilter,
  onRoleFilter,
  onDateFromChange,
  onDateToChange,
  onPageChange,
  title = "Audit trail",
  intro = "Immutable log of actions across your organization. Request context (IP, correlation ID, browser hint) is captured when supported by the API for investigations and support.",
}: {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  actionFilter: string;
  entityTypeFilter: string;
  roleFilter: "" | "owner" | "admin" | "agent";
  /** `YYYY-MM-DD` or empty when not filtering. */
  dateFrom: string;
  dateTo: string;
  onActionFilter: (v: string) => void;
  onEntityTypeFilter: (v: string) => void;
  onRoleFilter: (v: "" | "owner" | "admin" | "agent") => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onPageChange: (p: number) => void;
  title?: string;
  intro?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-action" className="text-xs font-medium text-foreground">
            Action
          </label>
          <p className="text-[11px] leading-snug text-muted">
            Partial match, case-insensitive. Type a fragment (e.g. <span className="font-mono">payment</span>,{" "}
            <span className="font-mono">auth</span>, <span className="font-mono">platform.subscription</span>) or pick a
            full name from suggestions.
          </p>
          <input
            id="audit-filter-action"
            list="audit-datalist-actions"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            placeholder="e.g. payment or auth.login"
            value={actionFilter}
            onChange={(e) => onActionFilter(e.target.value)}
            autoComplete="off"
          />
          <datalist id="audit-datalist-actions">
            {AUDIT_ACTION_SUGGESTIONS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-entity" className="text-xs font-medium text-foreground">
            Entity type
          </label>
          <p className="text-[11px] leading-snug text-muted">
            Must match the catalog name stored on the row (whole value, case-insensitive). Use the list or the table’s
            Entity line as a guide — e.g. <span className="font-mono">Payment</span>, not “payments”.
          </p>
          <input
            id="audit-filter-entity"
            list="audit-datalist-entity-types"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            placeholder="e.g. Lease"
            value={entityTypeFilter}
            onChange={(e) => onEntityTypeFilter(e.target.value)}
            autoComplete="off"
          />
          <datalist id="audit-datalist-entity-types">
            {AUDIT_ENTITY_TYPE_VALUES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-role" className="text-xs font-medium text-foreground">
            Actor role
          </label>
          <p className="text-[11px] leading-snug text-muted">
            Restrict to entries where the acting user had this role when the event was recorded.
          </p>
          <select
            id="audit-filter-role"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            value={roleFilter}
            onChange={(e) => onRoleFilter(e.target.value as "" | "owner" | "admin" | "agent")}
          >
            <option value="">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-from" className="text-xs font-medium text-foreground">
            From date
          </label>
          <p className="text-[11px] leading-snug text-muted">Inclusive start (UTC calendar day).</p>
          <input
            id="audit-filter-from"
            type="date"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-to" className="text-xs font-medium text-foreground">
            To date
          </label>
          <p className="text-[11px] leading-snug text-muted">Inclusive end (UTC calendar day).</p>
          <input
            id="audit-filter-to"
            type="date"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col justify-end gap-1 sm:col-span-2 lg:col-span-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-fit"
            disabled={!dateFrom && !dateTo}
            onClick={() => {
              onDateFromChange("");
              onDateToChange("");
            }}
          >
            Clear date range
          </Button>
          <p className="text-[11px] text-muted">
            Leave both empty to search all time. Use with other filters to narrow long histories.
          </p>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-muted-bg/30 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-foreground outline-none ring-main-blue/20 focus-visible:ring-2">
          Browse typical action names
        </summary>
        <p className="mt-2 text-xs text-muted">
          These are the main strings written by the API today. Your project may log more over time — use the action
          column in the table as the source of truth for new values.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {AUDIT_ACTION_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-foreground">{group.title}</p>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] leading-relaxed text-muted">
                {group.actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-lg border border-border bg-muted-bg/30 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-foreground outline-none ring-main-blue/20 focus-visible:ring-2">
          Entity types (what “Entity” in each row refers to)
        </summary>
        <ul className="mt-3 space-y-2 text-xs text-muted">
          {AUDIT_ENTITY_TYPE_OPTIONS.map((row) => (
            <li key={row.type}>
              <span className="font-mono font-medium text-foreground">{row.type}</span>
              <span className="mx-1.5 text-border">—</span>
              {row.about}
            </li>
          ))}
        </ul>
      </details>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-muted-bg/60 px-4 py-4" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No audit entries match your filters</p>
            <p className="mt-2 text-sm text-muted">Try broadening filters or check back after team activity.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <p className="text-xs text-muted tabular-nums-fin">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
          <span className="mx-1.5">·</span>
          <span className="font-medium text-foreground">{total}</span> matching entries
          <span className="mx-1.5">·</span>
          {pageSize} per page
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={() => onPageChange(1)} disabled={page <= 1}>
            First
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          {auditPageButtonSequence(page, totalPages).map((entry, idx) =>
            entry === "gap" ? (
              <span key={`gap-${idx}`} className="px-1 text-xs text-muted">
                …
              </span>
            ) : (
              <Button
                key={entry}
                type="button"
                variant={entry === page ? "primary" : "secondary"}
                size="sm"
                className="min-w-9 px-2"
                onClick={() => onPageChange(entry)}
              >
                {entry}
              </Button>
            ),
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
