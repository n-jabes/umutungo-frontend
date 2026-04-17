import type { EntitlementsPayload } from "./types";

/** Parsed numeric cap from entitlements `features`, or `null` when unlimited / missing. */
export function finiteFeatureLimit(features: Record<string, unknown>, key: string): number | null {
  const v = features[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export type QuotaBarModel = {
  key: string;
  title: string;
  current: number;
  max: number | null;
  /** 0–100 when capped; can exceed 100 when over limit (caller may clip visually). */
  fillPct: number;
  atOrOverLimit: boolean;
  overLimit: boolean;
  label: string;
};

export function quotaBarFromUsage(
  title: string,
  featureKey: string,
  current: number,
  features: Record<string, unknown>,
): QuotaBarModel {
  const max = finiteFeatureLimit(features, featureKey);
  const overLimit = max !== null && current > max;
  const atOrOverLimit = max !== null && current >= max;
  const fillPct =
    max === null
      ? current > 0
        ? 100
        : 0
      : max <= 0
        ? 100
        : Math.min(100, Math.max(0, (current / max) * 100));
  const label =
    max === null ? `${current} (no cap on this plan)` : overLimit ? `${current} / ${max} — over plan` : `${current} / ${max}`;
  return {
    key: featureKey,
    title,
    current,
    max,
    fillPct,
    atOrOverLimit,
    overLimit,
    label,
  };
}

export function entitlementsToQuotaBars(payload: EntitlementsPayload): {
  units: QuotaBarModel;
  agents: QuotaBarModel;
} {
  const { features, usage } = payload;
  return {
    units: quotaBarFromUsage("Units", "units.max", usage.units.current, features),
    agents: quotaBarFromUsage("Agents", "agents.max", usage.agents.current, features),
  };
}

/** New asset adds one default unit — block when that would exceed a finite cap. */
export function cannotCreateAssetDueToUnits(payload: EntitlementsPayload): boolean {
  const max = finiteFeatureLimit(payload.features, "units.max");
  if (max === null) return false;
  return payload.usage.units.current + 1 > max;
}

export function cannotCreateAgentDueToAgents(payload: EntitlementsPayload): boolean {
  const max = finiteFeatureLimit(payload.features, "agents.max");
  if (max === null) return false;
  return payload.usage.agents.current + 1 > max;
}

export function hasAnyOverLimit(payload: EntitlementsPayload): boolean {
  const { units, agents } = entitlementsToQuotaBars(payload);
  return units.overLimit || agents.overLimit;
}

export function hasAnyAtLimit(payload: EntitlementsPayload): boolean {
  const { units, agents } = entitlementsToQuotaBars(payload);
  return (
    (units.atOrOverLimit && !units.overLimit) || (agents.atOrOverLimit && !agents.overLimit)
  );
}
