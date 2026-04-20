"use client";

import { cn } from "@/lib/utils";
import type { FeedbackStatus } from "@/lib/types";

const statusLabel: Record<FeedbackStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In progress",
  closed: "Closed",
};

const statusTone: Record<FeedbackStatus, string> = {
  new: "bg-main-blue/10 text-main-blue",
  triaged: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  in_progress: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  closed: "bg-main-green/10 text-main-green",
};

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusTone[status])}>
      {statusLabel[status]}
    </span>
  );
}
