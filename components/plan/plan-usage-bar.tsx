"use client";

import { cn } from "@/lib/utils";
import type { QuotaBarModel } from "@/lib/plan-usage";

export function PlanUsageBar({ model }: { model: QuotaBarModel }) {
  const displayPct = model.max === null ? Math.min(100, model.fillPct) : Math.min(100, (model.current / model.max) * 100);
  const barColor = model.overLimit
    ? "bg-red-500"
    : model.atOrOverLimit
      ? "bg-amber-500"
      : "bg-main-blue";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{model.title}</p>
        <p className="text-xs tabular-nums text-muted">{model.label}</p>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted-bg"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={model.max ?? undefined}
        aria-valuenow={model.current}
        aria-label={`${model.title} usage`}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", barColor)}
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  );
}
