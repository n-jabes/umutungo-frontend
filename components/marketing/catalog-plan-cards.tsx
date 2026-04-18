"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { PublicPricingPlanRow } from "@/lib/types";
import { mockMonthlyUsd, sortPlansByMarketingOrder } from "@/lib/plan-marketing";
import { cn } from "@/lib/utils";

function capLine(features: PublicPricingPlanRow["features"]) {
  const u = features["units.max"];
  const a = features["agents.max"];
  const units = typeof u === "number" ? `${u} units` : "Units from catalog";
  const agents = typeof a === "number" ? `${a} agents` : "Agents from catalog";
  return `${units} · ${agents}`;
}

function reportsLine(features: PublicPricingPlanRow["features"]) {
  const adv = features["reports.advanced"];
  if (adv === true) return "Advanced reporting";
  if (adv === false) return "Standard reporting";
  return "Reporting per catalog";
}

type Props = {
  plans: PublicPricingPlanRow[];
  mode: "cta" | "picker";
  selectedPlanKey?: string | null;
  onSelectPlan?: (planKey: string) => void;
};

export function CatalogPlanCards({ plans, mode, selectedPlanKey, onSelectPlan }: Props) {
  const ordered = sortPlansByMarketingOrder(plans);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {ordered.map((p, idx) => {
        const selected = selectedPlanKey === p.planKey;
        const popular = p.planKey === "growth";
        const inner = (
          <>
            {popular ? (
              <span className="absolute right-4 top-4 rounded-full bg-main-blue px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Popular
              </span>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.name}</p>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-foreground">${mockMonthlyUsd(p.planKey)}</span>
              <span className="text-sm text-muted">/mo</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Indicative pricing — checkout confirms your region and tax. Card processing connects here next.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-main-green" strokeWidth={2.2} aria-hidden />
                {capLine(p.features)}
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-main-green" strokeWidth={2.2} aria-hidden />
                {reportsLine(p.features)}
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-main-green" strokeWidth={2.2} aria-hidden />
                Portfolio, leases & rent tracking
              </li>
            </ul>
            {p.description ? <p className="mt-4 text-xs leading-relaxed text-muted">{p.description}</p> : null}
            {mode === "cta" ? (
              <Link
                href={`/register?plan=${encodeURIComponent(p.planKey)}`}
                className={cn(
                  "mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                  popular
                    ? "bg-main-blue text-white hover:opacity-95"
                    : "border border-border bg-background text-foreground hover:bg-muted-bg",
                )}
              >
                Start with {p.name}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onSelectPlan?.(p.planKey)}
                className={cn(
                  "mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                  selected
                    ? "bg-main-blue text-white ring-2 ring-main-blue ring-offset-2 ring-offset-background"
                    : popular
                      ? "border border-main-blue/40 bg-blue-soft text-main-blue hover:bg-blue-soft/80"
                      : "border border-border bg-background hover:bg-muted-bg",
                )}
              >
                {selected ? "Selected" : "Choose plan"}
              </button>
            )}
          </>
        );

        return (
          <div
            key={p.planKey}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition",
              popular && mode === "cta" ? "border-main-blue/30 shadow-md lg:scale-[1.02]" : "border-border",
              mode === "picker" && selected ? "border-main-blue shadow-md" : "",
            )}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
