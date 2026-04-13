"use client";

import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DataTableShellProps = {
  children: React.ReactNode;
  /** Screen-reader label for the scroll region */
  ariaLabel?: string;
  className?: string;
  /** Hint under the table on small screens */
  showScrollHint?: boolean;
};

/**
 * Reliable horizontal scrolling for wide tables on narrow viewports.
 *
 * - Outer scroll region uses `overflow-x-auto` + `max-w-full` so flex parents
 *   cannot expand past the viewport.
 * - Inner shim uses `w-max` + `min-w-[max(100%,38rem)]` so the scrollable width
 *   is always at least ~608px OR the full container (whichever is larger), which
 *   guarantees a horizontal scroll gesture on phones while still growing with content.
 * - Do not put `overflow-x-hidden` on ancestors of this component (breaks iOS nested scroll).
 */
export function DataTableShell({
  children,
  ariaLabel = "Data table",
  className,
  showScrollHint = true,
}: DataTableShellProps) {
  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      <div
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className={cn(
          "max-w-full rounded-xl border border-border bg-card shadow-sm outline-none",
          "overflow-x-auto overflow-y-visible overscroll-x-contain",
          "touch-pan-x [-webkit-overflow-scrolling:touch]",
          "focus-visible:ring-2 focus-visible:ring-main-blue/30",
        )}
      >
        <div className="w-max min-w-[max(100%,38rem)] max-w-none">{children}</div>
      </div>
      {showScrollHint ? (
        <p className="mt-2 flex items-center gap-2 text-[11px] leading-snug text-muted sm:hidden">
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-main-blue" strokeWidth={1.75} />
          <span>Swipe or drag horizontally to see all columns.</span>
        </p>
      ) : null}
    </div>
  );
}
