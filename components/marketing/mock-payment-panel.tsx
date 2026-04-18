"use client";

import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicPricingPlanRow } from "@/lib/types";
import { mockMonthlyUsd } from "@/lib/plan-marketing";

type Props = {
  plan: PublicPricingPlanRow;
  pending?: boolean;
  onSimulateSuccess: () => void;
  onBack: () => void;
};

/**
 * Placeholder checkout surface — wire PSP (e.g. Stripe) here later; for now users continue as if payment succeeded.
 */
export function MockPaymentPanel({ plan, pending, onSimulateSuccess, onBack }: Props) {
  const amount = mockMonthlyUsd(plan.planKey);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-50">
        <p className="font-semibold">Payment integration preview</p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">
          This screen reserves the layout for your future card processor. No charge is made — completing the step
          simulates a successful payment so you can test the full signup and subscription lifecycle.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Order summary</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{plan.name}</p>
            <p className="text-xs text-muted">Plan key · {plan.planKey}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Due today (mock)</p>
            <p className="text-xl font-semibold tabular-nums-fin text-foreground">${amount}.00</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">Card number</label>
            <div className="relative mt-1">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                disabled
                readOnly
                value="4242 4242 4242 4242"
                className="w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-muted-bg/50 py-2.5 pl-10 pr-3 text-sm text-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted">Expiry</label>
              <input
                disabled
                readOnly
                value="12 / 28"
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-muted-bg/50 px-3 py-2.5 text-sm text-muted"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">CVC</label>
              <input
                disabled
                readOnly
                value="***"
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-muted-bg/50 px-3 py-2.5 text-sm text-muted"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted-bg/60 px-3 py-2.5 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-main-blue" strokeWidth={1.75} />
          <span>TLS encryption and PCI-compliant tokenization will appear here with your live provider.</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onBack} disabled={pending}>
            Back
          </Button>
          <Button type="button" onClick={onSimulateSuccess} disabled={pending} className="gap-2">
            <Lock className="h-4 w-4" strokeWidth={1.75} />
            {pending ? "Creating account…" : "Complete payment & create account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
