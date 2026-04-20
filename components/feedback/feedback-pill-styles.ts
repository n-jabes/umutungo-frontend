import type { FeedbackSeverity } from "@/lib/types";

/** High-contrast pills for type / severity (WCAG-friendly on light UI). */
export const feedbackTypePillClass =
  "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-900";

const severityMap: Record<FeedbackSeverity, string> = {
  low: "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-900",
  medium:
    "rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium capitalize text-amber-950",
  high: "rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-medium capitalize text-red-950",
};

export function feedbackSeverityPillClass(severity: FeedbackSeverity): string {
  return severityMap[severity] ?? severityMap.medium;
}
