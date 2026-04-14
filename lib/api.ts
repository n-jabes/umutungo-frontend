import axios, { isAxiosError } from "axios";
import { normalizeApiBaseUrl } from "./api-base-url";
import { REFRESH_KEY, TOKEN_KEY } from "./api-session-keys";
import type {
  Asset,
  AssetValuation,
  AssetPerformance,
  IncomeAnalytics,
  IncomeSeriesAnalytics,
  Lease,
  MonthlyPaymentSummary,
  OccupancyAnalytics,
  OutstandingRent,
  Payment,
  PaymentRangeSummary,
  Tenant,
  Unit,
  UserPublic,
} from "./types";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionTokens(access: string, refresh?: string) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearSessionTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Prefer `window.__UMUTUNGO_API_BASE__` set by the root layout (server env each dev session).
 * Falls back to NEXT_PUBLIC_API_URL (inlined at compile time).
 * Host-only values are normalized with https:// so axios does not treat them as paths on the current origin.
 */
function baseURL(): string {
  if (typeof window !== "undefined") {
    const injected = window.__UMUTUNGO_API_BASE__;
    if (typeof injected === "string" && injected.trim()) {
      return normalizeApiBaseUrl(injected);
    }
  }
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim();
  if (!raw) return "http://localhost:4000";
  return normalizeApiBaseUrl(raw);
}

export const rawApi = axios.create({
  withCredentials: true,
});

rawApi.interceptors.request.use((config) => {
  const root = baseURL().replace(/\/+$/, "");
  const requestPath = config.url;
  // Always send absolute URLs so axios never resolves a host-only base against the current page
  // (e.g. /umutungo-backend…/auth/login on localhost:3000).
  if (requestPath && !/^https?:\/\//i.test(requestPath)) {
    const path = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
    config.baseURL = "";
    config.url = `${root}${path}`;
  } else if (requestPath) {
    config.baseURL = "";
  } else {
    config.baseURL = root;
  }
  const t = getAccessToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

type Ok<T> = { success: true; data: T };
type Err = { error: true; message: string };

function unwrap<T>(body: Ok<T> | Err): T {
  if ("error" in body && body.error) throw new Error(body.message);
  if ("success" in body && body.success) return body.data;
  throw new Error("Unexpected API response");
}

export function getErrorMessage(err: unknown): string {
  if (isAxiosError<Err>(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string" && msg) return msg;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export const api = {
  async login(body: { email?: string; phone?: string; password: string }) {
    const { data } = await rawApi.post<Ok<{ user: UserPublic; accessToken: string; refreshToken: string }>>(
      "/auth/login",
      body,
    );
    return unwrap(data);
  },

  async register(body: {
    name: string;
    password: string;
    email?: string;
    phone?: string;
  }) {
    const { data } = await rawApi.post<Ok<{ user: UserPublic; accessToken: string; refreshToken: string }>>(
      "/auth/register",
      body,
    );
    return unwrap(data);
  },

  async refresh(refreshToken: string) {
    const { data } = await rawApi.post<Ok<{ user: UserPublic; accessToken: string; refreshToken: string }>>(
      "/auth/refresh",
      { refreshToken },
    );
    return unwrap(data);
  },

  async logout() {
    const rt = typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
    try {
      await rawApi.post("/auth/logout", rt ? { refreshToken: rt } : {});
    } finally {
      clearSessionTokens();
    }
  },

  async me() {
    const { data } = await rawApi.get<Ok<UserPublic>>("/auth/me");
    return unwrap(data);
  },

  async listAssets() {
    const { data } = await rawApi.get<Ok<Asset[]>>("/assets");
    return unwrap(data);
  },

  async createAsset(body: {
    type: "property" | "land";
    name: string;
    location?: string;
    purchasePrice?: string;
    purchaseDate?: string;
    notes?: string;
  }) {
    const { data } = await rawApi.post<Ok<Asset>>("/assets", body);
    return unwrap(data);
  },

  async updateAsset(
    id: string,
    body: Partial<{
      type: "property" | "land";
      name: string;
      location: string;
      purchasePrice: string;
      purchaseDate: string;
      notes: string;
    }>,
  ) {
    const { data } = await rawApi.patch<Ok<Asset>>(`/assets/${id}`, body);
    return unwrap(data);
  },

  async deleteAsset(id: string) {
    const { data } = await rawApi.delete<Ok<{ id: string }>>(`/assets/${id}`);
    return unwrap(data);
  },

  async listAssetValuations(assetId: string) {
    const { data } = await rawApi.get<Ok<AssetValuation[]>>(`/assets/${assetId}/valuations`);
    return unwrap(data);
  },

  async createAssetValuation(assetId: string, body: { value: string; valuationDate: string }) {
    const { data } = await rawApi.post<Ok<AssetValuation>>(`/assets/${assetId}/valuations`, body);
    return unwrap(data);
  },

  async listUnits(assetId?: string) {
    const { data } = await rawApi.get<Ok<Unit[]>>("/units", {
      params: assetId ? { assetId } : undefined,
    });
    return unwrap(data);
  },

  async createUnit(body: {
    assetId: string;
    name?: string;
    type?: Unit["type"];
    rentAmount?: string;
    status?: Unit["status"];
  }) {
    const { data } = await rawApi.post<Ok<Unit>>("/units", body);
    return unwrap(data);
  },

  async updateUnit(
    id: string,
    body: Partial<{ name: string; type: Unit["type"]; rentAmount: string; status: Unit["status"] }>,
  ) {
    const { data } = await rawApi.patch<Ok<Unit>>(`/units/${id}`, body);
    return unwrap(data);
  },

  async deleteUnit(id: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/units/${id}`);
    return unwrap(data);
  },

  async listTenants() {
    const { data } = await rawApi.get<Ok<Tenant[]>>("/tenants");
    return unwrap(data);
  },

  async createTenant(body: { name: string; phone?: string; idNumber?: string }) {
    const { data } = await rawApi.post<Ok<Tenant>>("/tenants", body);
    return unwrap(data);
  },

  async updateTenant(id: string, body: Partial<{ name: string; phone: string; idNumber: string }>) {
    const { data } = await rawApi.patch<Ok<Tenant>>(`/tenants/${id}`, body);
    return unwrap(data);
  },

  async deleteTenant(id: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/tenants/${id}`);
    return unwrap(data);
  },

  async listLeases() {
    const { data } = await rawApi.get<Ok<Lease[]>>("/leases");
    return unwrap(data);
  },

  async listActiveLeases() {
    const { data } = await rawApi.get<Ok<Lease[]>>("/leases/active");
    return unwrap(data);
  },

  async getLease(id: string) {
    const { data } = await rawApi.get<Ok<Lease & { payments: Payment[] }>>(`/leases/${id}`);
    return unwrap(data);
  },

  async createLease(body: {
    unitId: string;
    tenantId?: string | null;
    startDate: string;
    endDate?: string | null;
    rentAmountAtTime: string;
    deposit?: string;
  }) {
    const { data } = await rawApi.post<Ok<Lease>>("/leases", body);
    return unwrap(data);
  },

  async updateLease(
    id: string,
    body: Partial<{ startDate: string; endDate: string | null; rentAmountAtTime: string; tenantId: string | null }>,
  ) {
    const { data } = await rawApi.patch<Ok<Lease>>(`/leases/${id}`, body);
    return unwrap(data);
  },

  async endLease(id: string, endDate: string) {
    const { data } = await rawApi.post<Ok<Lease>>(`/leases/${id}/end`, { endDate });
    return unwrap(data);
  },

  async recordPayment(body: {
    leaseId: string;
    amount: string;
    month: string;
    method?: string;
    status?: "paid" | "pending" | "failed";
  }) {
    const { data } = await rawApi.post<Ok<Payment>>("/payments", body);
    return unwrap(data);
  },

  async updatePayment(
    id: string,
    body: Partial<{ amount: string; month: string; method: string | null; status: "paid" | "pending" | "failed" }>,
  ) {
    const { data } = await rawApi.patch<Ok<Payment>>(`/payments/${id}`, body);
    return unwrap(data);
  },

  async deletePayment(id: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/payments/${id}`);
    return unwrap(data);
  },

  async paymentSummary(month: string) {
    const { data } = await rawApi.get<Ok<MonthlyPaymentSummary>>("/payments/summary", {
      params: { month },
    });
    return unwrap(data);
  },

  async paymentSummaryRange(from: string, to: string) {
    const { data } = await rawApi.get<Ok<PaymentRangeSummary>>("/payments/summary", {
      params: { from, to },
    });
    return unwrap(data);
  },

  async paymentsByLease(leaseId: string) {
    const { data } = await rawApi.get<Ok<Payment[]>>(`/payments/lease/${leaseId}`);
    return unwrap(data);
  },

  async income(month: string) {
    const { data } = await rawApi.get<Ok<IncomeAnalytics>>("/analytics/income", {
      params: { month },
    });
    return unwrap(data);
  },

  async incomeSeries(from: string, to: string, assetId?: string) {
    const { data } = await rawApi.get<Ok<IncomeSeriesAnalytics>>("/analytics/income-series", {
      params: assetId ? { from, to, assetId } : { from, to },
    });
    return unwrap(data);
  },

  async outstandingRent(month: string) {
    const { data } = await rawApi.get<Ok<OutstandingRent>>("/analytics/outstanding-rent", {
      params: { month },
    });
    return unwrap(data);
  },

  async occupancy() {
    const { data } = await rawApi.get<Ok<OccupancyAnalytics>>("/analytics/occupancy");
    return unwrap(data);
  },

  async assetPerformance(month: string) {
    const { data } = await rawApi.get<Ok<AssetPerformance>>("/analytics/asset-performance", {
      params: { month },
    });
    return unwrap(data);
  },
};
