"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
          <div className="grid gap-4 lg:grid-cols-2">
            {hasContext ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Request context</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-muted">Client IP</dt>
                    <dd className="mt-1 flex items-center gap-1">
                      <code className="flex-1 break-all rounded-md bg-card px-2 py-1.5 font-mono text-xs ring-1 ring-border">
                        {entry.ipAddress ?? "—"}
                      </code>
                      <CopyIconButton label="IP address" value={entry.ipAddress ?? undefined} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">Correlation ID</dt>
                    <dd className="mt-1 flex items-center gap-1">
                      <code className="flex-1 break-all rounded-md bg-card px-2 py-1.5 font-mono text-xs ring-1 ring-border">
                        {entry.correlationId ?? "—"}
                      </code>
                      <CopyIconButton label="Correlation ID" value={entry.correlationId ?? undefined} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">User-Agent</dt>
                    <dd className="mt-1 flex items-start gap-1">
                      <code
                        className="max-h-24 flex-1 overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-card px-2 py-1.5 font-mono text-[11px] leading-relaxed ring-1 ring-border"
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
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Metadata</p>
                <pre className="max-h-40 overflow-auto rounded-md bg-card p-3 font-mono text-[11px] leading-relaxed ring-1 ring-border">
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
  onActionFilter,
  onEntityTypeFilter,
  onRoleFilter,
  onPageChange,
}: {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  actionFilter: string;
  entityTypeFilter: string;
  roleFilter: "" | "owner" | "admin" | "agent";
  onActionFilter: (v: string) => void;
  onEntityTypeFilter: (v: string) => void;
  onRoleFilter: (v: "" | "owner" | "admin" | "agent") => void;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Audit trail</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Immutable log of actions across your organization. Request context (IP, correlation ID, browser
          hint) is captured when supported by the API for investigations and support.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-action" className="text-xs font-medium text-muted">
            Action contains
          </label>
          <input
            id="audit-filter-action"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            placeholder="e.g. payment"
            value={actionFilter}
            onChange={(e) => onActionFilter(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-entity" className="text-xs font-medium text-muted">
            Entity type
          </label>
          <input
            id="audit-filter-entity"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 transition-shadow focus:ring-2"
            placeholder="e.g. Asset"
            value={entityTypeFilter}
            onChange={(e) => onEntityTypeFilter(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="audit-filter-role" className="text-xs font-medium text-muted">
            Actor role
          </label>
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

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted tabular-nums-fin">
          Showing page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
          <span className="mx-1.5">·</span>
          <span className="font-medium text-foreground">{total}</span> total entries
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
