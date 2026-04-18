"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describePricingPlansLoadFailure, pricingPlansSupportDetail } from "@/lib/pricing-plans-error";
import { cn } from "@/lib/utils";

type Props = {
  error: unknown;
  onRetry?: () => void | Promise<unknown>;
  retrying?: boolean;
  /** `start` fits full-width forms (e.g. register); `center` fits marketing sections. */
  align?: "center" | "start";
  className?: string;
};

export function PricingPlansLoadError({ error, onRetry, retrying, align = "center", className }: Props) {
  const { title, body } = describePricingPlansLoadFailure(error);
  const support = pricingPlansSupportDetail(error);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card px-5 py-6 shadow-sm",
        align === "center" && "mx-auto max-w-lg text-center",
        align === "start" && "max-w-none text-left",
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{body}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn("mt-5 gap-2", align === "center" && "mx-auto")}
          onClick={() => void onRetry()}
          disabled={retrying}
        >
          <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} strokeWidth={1.75} />
          {retrying ? "Trying again…" : "Try again"}
        </Button>
      ) : null}
      <details className="mt-5 text-left">
        <summary className="cursor-pointer select-none text-xs font-medium text-muted hover:text-foreground">
          Technical details
        </summary>
        <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted">{support}</p>
      </details>
    </div>
  );
}
