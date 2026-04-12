import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };
import type {
  Asset,
  AssetPerformance,
  IncomeAnalytics,
  Lease,
  MonthlyPaymentSummary,
  OccupancyAnalytics,
  OutstandingRent,
  Payment,
  Tenant,
  Unit,
  UserPublic,
} from "./types";

const TOKEN_KEY = "umutungo_access";
const REFRESH_KEY = "umutungo_refresh";

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

function baseURL() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export const rawApi = axios.create({
  baseURL: baseURL(),
  withCredentials: true,
});

rawApi.interceptors.request.use((config) => {
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
  const ax = err as AxiosError<Err>;
  if (ax.response?.data?.message) return ax.response.data.message;
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

  async listTenants() {
    const { data } = await rawApi.get<Ok<Tenant[]>>("/tenants");
    return unwrap(data);
  },

  async createTenant(body: { name: string; phone?: string; idNumber?: string }) {
    const { data } = await rawApi.post<Ok<Tenant>>("/tenants", body);
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

  async paymentSummary(month: string) {
    const { data } = await rawApi.get<Ok<MonthlyPaymentSummary>>("/payments/summary", {
      params: { month },
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

rawApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as RetryConfig | undefined;
    if (!original || original._authRetry) throw error;
    if (error.response?.status !== 401) throw error;
    if (original.url?.includes("/auth/refresh")) throw error;

    const rt =
      typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
    if (!rt) throw error;

    original._authRetry = true;
    try {
      const next = await api.refresh(rt);
      setSessionTokens(next.accessToken, next.refreshToken);
      original.headers.Authorization = `Bearer ${next.accessToken}`;
      return rawApi(original);
    } catch {
      clearSessionTokens();
      throw error;
    }
  },
);
