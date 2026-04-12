export const queryKeys = {
  me: ["me"] as const,
  assets: ["assets"] as const,
  units: (assetId?: string) => ["units", assetId ?? "all"] as const,
  tenants: ["tenants"] as const,
  leases: ["leases"] as const,
  leasesActive: ["leases", "active"] as const,
  lease: (id: string) => ["lease", id] as const,
  income: (month: string) => ["analytics", "income", month] as const,
  incomeSeries: (from: string, to: string, assetId?: string) =>
    ["analytics", "income-series", from, to, assetId ?? "portfolio"] as const,
  outstanding: (month: string) => ["analytics", "outstanding", month] as const,
  occupancy: ["analytics", "occupancy"] as const,
  assetPerformance: (month: string) => ["analytics", "asset-performance", month] as const,
  paymentSummary: (month: string) => ["payments", "summary", month] as const,
  paymentSummaryRange: (from: string, to: string) =>
    ["payments", "summary-range", from, to] as const,
  paymentsLease: (leaseId: string) => ["payments", "lease", leaseId] as const,
};
