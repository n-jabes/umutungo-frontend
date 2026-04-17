/** Prefix: invalidate all months after portfolio mutations */
const onboardingRoot = ["auth", "me", "onboarding"] as const;

export const queryKeys = {
  me: ["me"] as const,
  onboardingRoot,
  onboarding: (month: string) => [...onboardingRoot, month] as const,
  agents: ["users", "agents"] as const,
  users: ["users"] as const,
  auditLogs: ["audit", "logs"] as const,
  assets: ["assets"] as const,
  assetValuations: (assetId: string) => ["assets", assetId, "valuations"] as const,
  units: (assetId?: string) => ["units", assetId ?? "all"] as const,
  unitsPaged: (params: {
    assetId?: string;
    page: number;
    pageSize: number;
    status?: "vacant" | "occupied";
    search?: string;
  }) =>
    [
      "units",
      "paged",
      params.assetId ?? "all",
      params.page,
      params.pageSize,
      params.status ?? "all",
      params.search ?? "",
    ] as const,
  tenants: ["tenants"] as const,
  leases: ["leases"] as const,
  leasesActive: ["leases", "active"] as const,
  lease: (id: string) => ["lease", id] as const,
  income: (month: string) => ["analytics", "income", month] as const,
  incomeSeries: (from: string, to: string, assetId?: string) =>
    ["analytics", "income-series", from, to, assetId ?? "portfolio"] as const,
  outstanding: (month: string) => ["analytics", "outstanding", month] as const,
  occupancy: ["analytics", "occupancy"] as const,
  portfolioRentStatus: (asOf: string, assetId?: string) =>
    ["analytics", "rent-status", "portfolio", asOf, assetId ?? "all"] as const,
  assetRentStatus: (assetId: string, asOf: string) =>
    ["analytics", "rent-status", "asset", assetId, asOf] as const,
  assetPerformance: (month: string) => ["analytics", "asset-performance", month] as const,
  paymentSummary: (month: string) => ["payments", "summary", month] as const,
  paymentSummaryRange: (from: string, to: string) =>
    ["payments", "summary-range", from, to] as const,
  paymentsLease: (leaseId: string) => ["payments", "lease", leaseId] as const,
  paymentProofs: (paymentId: string) => ["payments", paymentId, "proofs"] as const,
  platformPlans: ["platform", "plans"] as const,
  platformPlan: (planKey: string) => ["platform", "plans", planKey] as const,
  platformPlanVersion: (versionId: string) => ["platform", "plan-versions", versionId] as const,
  platformPlanCompare: (keysCsv: string) => ["platform", "plans", "compare", keysCsv] as const,
  platformFeatures: ["platform", "features"] as const,
};
