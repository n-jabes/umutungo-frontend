"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { hasAnyAtLimit, hasAnyOverLimit } from "@/lib/plan-usage";
import { cn } from "@/lib/utils";

/**
 * Sticky context for owners/agents when usage exceeds or sits on plan caps.
 * Shown in the rental workspace shell above page content.
 */
export function PlanUsageBanner() {
  const q = useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: () => api.getMeEntitlements(),
    staleTime: 60_000,
  });

  if (!q.data) return null;

  const over = hasAnyOverLimit(q.data);
  const at = hasAnyAtLimit(q.data);
  if (!over && !at) return null;

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border px-4 py-3 text-sm shadow-sm",
        over ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100" : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-50",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <div>
            <p className="font-semibold leading-snug">
              {over
                ? "You are above your current plan limits."
                : "You have reached a plan limit."}
            </p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {over
                ? "Your data stays intact. Remove units or agents you no longer need, or move to a higher plan so you can grow again."
                : "New assets, units, or agents may be blocked until you free capacity or upgrade. Open Plan & usage for details."}
            </p>
          </div>
        </div>
        <Link
          href="/settings?tab=plan"
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition",
            over
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-amber-700 text-white hover:bg-amber-800",
          )}
        >
          Plan & usage
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
