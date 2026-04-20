"use client";

import { cn } from "@/lib/utils";
import type { FeedbackStatus } from "@/lib/types";

const statusLabel: Record<FeedbackStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In progress",
  closed: "Closed",
};

/** Dark text on solid pastel backgrounds — readable in light and dark themes. */
const statusTone: Record<FeedbackStatus, string> = {
  new: "border border-sky-300 bg-sky-100 text-sky-950",
  triaged: "border border-amber-300 bg-amber-100 text-amber-950",
  in_progress: "border border-violet-300 bg-violet-100 text-violet-950",
  closed: "border border-emerald-300 bg-emerald-100 text-emerald-950",
};

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusTone[status])}>
      {statusLabel[status]}
    </span>
  );
}
