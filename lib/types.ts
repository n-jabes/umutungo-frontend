export type UserPublic = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "owner" | "admin";
  createdAt: string;
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
  month: string;
  paidAt: string;
  method: string | null;
  status: string;
  lease?: Lease & {
    unit?: { name: string | null; asset: { id: string; name: string } };
  };
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
