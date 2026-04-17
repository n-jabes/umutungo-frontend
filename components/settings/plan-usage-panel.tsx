"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Mail } from "lucide-react";
import { useState } from "react";
import { PlanUsageBar } from "@/components/plan/plan-usage-bar";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { entitlementsToQuotaBars, hasAnyOverLimit } from "@/lib/plan-usage";
import { cn } from "@/lib/utils";

function DowngradeHelper() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-muted-bg/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>What changes if my plan is downgraded?</span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
      </button>
      {open ? (
        <div className="border-t border-border px-4 pb-4 pt-0">
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-muted">
            <li>
              <span className="font-medium text-foreground">Your data is not deleted.</span> Existing assets, units,
              leases, and agents remain in the system.
            </li>
            <li>
              Lower numeric caps (such as units or agents) apply immediately for{" "}
              <span className="font-medium text-foreground">new</span> creates. If you already exceed a new cap, remove
              or consolidate items until you are within the limit, or upgrade again.
            </li>
            <li>
              Other feature flags from your plan matrix may also tighten. Temporary entitlement grants can still raise
              specific limits when your administrator configures them.
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PlanUsagePanel({ variant = "owner" }: { variant?: "owner" | "agent" }) {
  const q = useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: () => api.getMeEntitlements(),
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return <p className="text-sm text-muted">Loading plan…</p>;
  }
  if (q.isError || !q.data) {
    return <p className="text-sm text-red-600">Could not load plan information.</p>;
  }
  const data = q.data;
  const { units, agents } = entitlementsToQuotaBars(data);
  const over = hasAnyOverLimit(data);
  const sourceLabel = data.source === "subscription" ? "Paid subscription" : "Default plan (starter)";
  const sub = data.subscription;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Plan & usage</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Your workspace follows the{" "}
          <span className="font-medium text-foreground">{data.plan.name}</span> plan ({data.plan.key}). {sourceLabel}
          {sub?.effective === false ? (
            <span className="font-medium text-amber-700"> — subscription is not currently effective; defaults apply.</span>
          ) : null}
        </p>
      </div>

      {over ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-50">
          <p className="font-semibold">Over current plan limits</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">
            You have more units or agents than this plan allows. Nothing was removed automatically — reduce usage when
            you are ready, or contact us to upgrade.
          </p>
        </div>
      ) : null}

      <div className="space-y-5 rounded-xl border border-border bg-background p-5 shadow-sm">
        <PlanUsageBar model={units} />
        <PlanUsageBar model={agents} />
      </div>

      <DowngradeHelper />

      {variant === "owner" ? (
        <div className="rounded-xl border border-main-blue/20 bg-blue-soft/40 px-4 py-4">
          <p className="text-sm font-medium text-foreground">Need a higher limit or a different plan?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Subscription changes are handled by your administrator or our team. Send a short note with your organization
            name and what you need.
          </p>
          {typeof process.env.NEXT_PUBLIC_SUPPORT_EMAIL === "string" &&
          process.env.NEXT_PUBLIC_SUPPORT_EMAIL.trim() !== "" ? (
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL.trim()}?subject=${encodeURIComponent("Plan change request")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-main-blue px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              <Mail className="h-3.5 w-3.5" strokeWidth={2} />
              Email support
            </a>
          ) : (
            <p className="mt-3 text-xs font-medium text-foreground">
              Contact your administrator or product support using the channel you were given at onboarding.
            </p>
          )}
        </div>
      ) : (
        <p className={cn("text-xs text-muted")}>
          Plan changes are managed by the owner of your organization. Ask them if you need more units or agent seats.
        </p>
      )}
    </div>
  );
}
