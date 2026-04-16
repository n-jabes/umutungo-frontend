"use client";

import { useId } from "react";

/** Must include every default `*Limit` used on the dashboard (e.g. 6 for asset risk, 8 for aging/quality/drill). */
export const DASHBOARD_TABLE_PAGE_SIZES = [5, 6, 8, 10, 15, 25, 50] as const;

type CursorFooterProps = {
  page: number;
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
};

/**
 * Cursor-based analytics tables: page size changes reset the cursor stack via parent `useCursorPagination` resetKey.
 */
export function DashboardCursorTableFooter({
  page,
  canPrev,
  onPrev,
  onNext,
  nextDisabled,
  pageSize,
  onPageSizeChange,
  isLoading,
}: CursorFooterProps) {
  const selectId = useId();
  return (
    <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">
          {isLoading ? "Loading…" : `Page ${page}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label htmlFor={selectId} className="shrink-0 text-muted">
          Rows per page
        </label>
        <select
          id={selectId}
          value={String(pageSize)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onPageSizeChange(n);
          }}
          className="rounded-lg border border-border bg-background px-2 py-1.5 font-medium text-foreground outline-none ring-main-blue/25 focus:ring-2"
        >
          {DASHBOARD_TABLE_PAGE_SIZES.map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

type OffsetFooterProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
};

/** Client-side slice pagination (e.g. outstanding leases already loaded on the page). */
export function DashboardOffsetTableFooter({
  page,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  pageSize,
  onPageSizeChange,
}: OffsetFooterProps) {
  const selectId = useId();
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>
          Page {page} of {totalPages}
          {totalItems > 0 ? ` · ${totalItems} total` : null}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <label htmlFor={selectId} className="shrink-0 text-muted">
          Rows per page
        </label>
        <select
          id={selectId}
          value={String(pageSize)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onPageSizeChange(n);
          }}
          className="rounded-lg border border-border bg-background px-2 py-1.5 font-medium text-foreground outline-none ring-main-blue/25 focus:ring-2"
        >
          {DASHBOARD_TABLE_PAGE_SIZES.map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
