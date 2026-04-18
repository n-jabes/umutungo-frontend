/** Display order on marketing and signup flows (unknown keys sort last). */
export const PLAN_MARKETING_ORDER = ["starter", "growth", "pro"] as const;

/** Placeholder monthly prices (USD) until billing integration; not charged in-app. */
const MOCK_MONTHLY_USD: Record<string, number> = {
  starter: 29,
  growth: 79,
  pro: 199,
};

export function mockMonthlyUsd(planKey: string): number {
  return MOCK_MONTHLY_USD[planKey] ?? 49;
}

export function sortPlansByMarketingOrder<T extends { planKey: string }>(rows: T[]): T[] {
  const rank = (k: string) => {
    const i = PLAN_MARKETING_ORDER.indexOf(k as (typeof PLAN_MARKETING_ORDER)[number]);
    return i === -1 ? 99 : i;
  };
  return [...rows].sort((a, b) => rank(a.planKey) - rank(b.planKey));
}
