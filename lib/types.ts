export type UserPublic = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "owner" | "admin" | "agent";
  managedByOwnerId?: string | null;
  mustSetPassword?: boolean;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: "owner" | "admin" | "agent";
    managedByOwnerId?: string | null;
  } | null;
};

export type PaginatedAuditLogs = {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  total: number;
};

export type AgentCreateResult = {
  agent: UserPublic;
  setupToken: string;
  setupTokenExpiresAt: string;
};

export type Asset = {
  id: string;
  ownerId: string;
  type: "property" | "land";
  name: string;
  location: string | null;
  purchasePrice: string | null;
  purchaseDate: string | null;
  notes: string | null;
  createdAt: string;
  _count?: { units: number };
};

export type AssetValuation = {
  id: string;
  assetId: string;
  value: string;
  valuationDate: string;
};

export type Unit = {
  id: string;
  assetId: string;
  name: string | null;
  type: "room" | "shop" | "apartment" | "whole" | null;
  rentAmount: string | null;
  status: "vacant" | "occupied";
  createdAt: string;
};

export type Tenant = {
  id: string;
  ownerId: string;
  name: string;
  phone: string | null;
  idNumber: string | null;
  createdAt: string;
};

export type Lease = {
  id: string;
  unitId: string;
  tenantId: string | null;
  startDate: string;
  endDate: string | null;
  rentAmountAtTime: string;
  deposit: string;
  status: string;
  createdAt: string;
  unit?: {
    id: string;
    name: string | null;
    assetId: string;
    asset: { id: string; name: string };
  };
  tenant?: Tenant | null;
};

export type Payment = {
  id: string;
  leaseId: string;
  amount: string;
  /** Legacy billing month (YYYY-MM); optional when using interval coverage. */
  month: string | null;
  /** Inclusive rent coverage start (calendar date, ISO). Present after Module 1 migration. */
  periodStartDate?: string | null;
  /** Inclusive rent coverage end (calendar date, ISO). */
  periodEndDate?: string | null;
  paidAt: string;
  method: string | null;
  status: string;
  recordedByUserId?: string | null;
  recordedAt?: string | null;
  lastEditedByUserId?: string | null;
  lastEditedAt?: string | null;
  editReason?: string | null;
  lease?: Lease & {
    unit?: { name: string | null; asset: { id: string; name: string } };
  };
};

/** `GET /leases/:id/coverage` — anniversary billing from lease start (Module 2). */
export type LeaseRentCoverageGap = { start: string; end: string };

export type LeaseRentCoveragePeriod = {
  index: number;
  periodStart: string;
  periodEnd: string;
  obligationStart: string;
  obligationEnd: string;
  isFullyCovered: boolean;
  gaps: LeaseRentCoverageGap[];
  intersectingPaymentIds: string[];
};

export type LeaseRentCoverage = {
  leaseId: string;
  unitId: string;
  leaseStatus: string;
  rentAmountAtTime: string;
  paymentRowCount: number;
  engineVersion: number;
  billingStrategy: string;
  asOf: string;
  leaseStart: string;
  leaseEnd: string | null;
  horizon: string;
  expectedPeriods: LeaseRentCoveragePeriod[];
  paidMergedIntervals: { start: string; end: string; paymentIds: string[] }[];
  summary: {
    hasPaymentOverlaps: boolean;
    latestFullyCoveredObligationEnd: string | null;
    nextUnpaidObligationStart: string | null;
    overdueDays: number;
    monthsEquivalentOverdue: number;
  };
};

/** Module 3 — rent visibility (coverage + overdue thresholds). */
export type RentStatusCode = "VACANT" | "PAID" | "LATE" | "CRITICAL";

export type RentStatusPolicyApplied = {
  policyVersion: number;
  criticalOverdueDays: number;
};

export type RentStatusCounts = {
  vacant: number;
  paid: number;
  late: number;
  critical: number;
};

export type RentStatusUnitRow = {
  unitId: string;
  unitName: string | null;
  unitOccupancyFlag: string;
  leaseId: string | null;
  coverageEngineVersion: number | null;
  billingStrategy: string | null;
  hasPaymentOverlaps: boolean;
  rentStatus: RentStatusCode;
  statusReason: string;
  overdueDays: number;
  latestCoveredDate: string | null;
  nextUnpaidStartDate: string | null;
};

/** `GET /units/:id/rent-status` */
export type UnitRentStatusResponse = {
  scope: "unit";
  unitId: string;
  unitName: string | null;
  unitOccupancyFlag: string;
  assetId: string;
  assetName: string;
  asOf: string;
  policy: RentStatusPolicyApplied;
  leaseId: string | null;
  coverageEngineVersion: number | null;
  billingStrategy: string | null;
  hasPaymentOverlaps: boolean;
  rentStatus: RentStatusCode;
  statusReason: string;
  overdueDays: number;
  latestCoveredDate: string | null;
  nextUnpaidStartDate: string | null;
};

/** `GET /assets/:id/rent-status` */
export type AssetRentStatusResponse = {
  scope: "asset";
  assetId: string;
  assetName: string;
  asOf: string;
  policy: RentStatusPolicyApplied;
  counts: RentStatusCounts;
  units: RentStatusUnitRow[];
};

/** `GET /analytics/rent-status` */
export type PortfolioRentStatusResponse = {
  scope: "portfolio";
  asOf: string;
  assetIdFilter: string | null;
  policy: RentStatusPolicyApplied;
  counts: RentStatusCounts;
  assetTotals: { assetId: string; assetName: string; counts: RentStatusCounts }[];
  units: Array<
    RentStatusUnitRow & {
      assetId: string;
      assetName: string;
    }
  >;
};

export type IncomeAnalytics = { month: string; totalIncome: number };

export type IncomeSeriesPoint = { month: string; totalIncome: number };

/** `GET /analytics/income-series` — portfolio or one asset. */
export type IncomeSeriesAnalytics = {
  from: string;
  to: string;
  assetId: string | null;
  series: IncomeSeriesPoint[];
};

export type OutstandingRent = {
  month: string;
  outstanding: number;
  leasesWithBalance: {
    leaseId: string;
    expected: number;
    paid: number;
    due: number;
    unitName: string | null;
    assetName: string;
  }[];
};

export type OccupancyAnalytics = {
  totalUnits: number;
  occupied: number;
  vacant: number;
  rate: number;
};

export type AssetPerformance = {
  month: string;
  assets: {
    assetId: string;
    name: string;
    type: string;
    incomeForMonth: number;
  }[];
};

export type MonthlyPaymentSummary = {
  month: string;
  totalAmount: number;
  count: number;
  payments: Payment[];
};

/** Response from `GET /payments/summary?from=&to=` */
export type PaymentRangeSummary = {
  from: string;
  to: string;
  totalAmount: number;
  count: number;
  payments: Payment[];
};
