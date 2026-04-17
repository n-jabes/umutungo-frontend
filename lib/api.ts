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
  LeaseRentCoverage,
  MonthlyPaymentSummary,
  OccupancyAnalytics,
  OutstandingRent,
  Payment,
  PaymentRangeSummary,
  PortfolioRentStatusResponse,
  Tenant,
  Unit,
  PaginatedUnits,
  UnitRentStatusResponse,
  AssetRentStatusResponse,
  UserPublic,
  OnboardingBootstrap,
  EntitlementsPayload,
  PlanListItem,
  PlanDetail,
  PlanVersionDetail,
  PublishPreview,
  PlanCompareResponse,
  CatalogFeature,
  SubscriptionAdminListResponse,
  SubscriptionOwnerAccountsResponse,
  SubscriptionAdminDetail,
  AgentCreateResult,
  PaginatedAuditLogs,
  PaymentProof,
  PaymentDetail,
  OwnerRiskSummary,
  AssetRiskSummaryPage,
  UnpaidAgingResponse,
  ManagerReportingQualityPage,
  RiskDrillDownPage,
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

  async getOnboarding(params?: { month?: string }) {
    const { data } = await rawApi.get<Ok<OnboardingBootstrap>>("/auth/me/onboarding", {
      params: params?.month ? { month: params.month } : undefined,
    });
    return unwrap(data);
  },

  async getMeEntitlements() {
    const { data } = await rawApi.get<Ok<EntitlementsPayload>>("/me/entitlements");
    return unwrap(data);
  },

  /** Requires JWT with `role: admin`. */
  async getPlatformEntitlements(ownerId: string) {
    const { data } = await rawApi.get<Ok<EntitlementsPayload>>(`/platform/entitlements/${ownerId}`);
    return unwrap(data);
  },

  async listPlatformPlans() {
    const { data } = await rawApi.get<Ok<PlanListItem[]>>("/platform/plans");
    return unwrap(data);
  },

  async getPlatformPlan(planKey: string) {
    const { data } = await rawApi.get<Ok<PlanDetail>>(`/platform/plans/${encodeURIComponent(planKey)}`);
    return unwrap(data);
  },

  async patchPlatformPlan(planKey: string, body: { name?: string; description?: string | null }) {
    const { data } = await rawApi.patch<Ok<Pick<PlanDetail, "id" | "key" | "name" | "description" | "createdAt">>>(
      `/platform/plans/${encodeURIComponent(planKey)}`,
      body,
    );
    return unwrap(data);
  },

  async createPlatformPlanDraft(planKey: string, body?: { cloneFromVersion?: number | null }) {
    const { data } = await rawApi.post<Ok<PlanVersionDetail>>(
      `/platform/plans/${encodeURIComponent(planKey)}/versions`,
      body ?? {},
    );
    return unwrap(data);
  },

  async getPlatformPlanVersion(versionId: string) {
    const { data } = await rawApi.get<Ok<PlanVersionDetail>>(`/platform/plan-versions/${versionId}`);
    return unwrap(data);
  },

  async patchPlatformPlanVersionMatrix(versionId: string, matrix: Record<string, unknown>) {
    const { data } = await rawApi.patch<Ok<PlanVersionDetail>>(`/platform/plan-versions/${versionId}/matrix`, {
      matrix,
    });
    return unwrap(data);
  },

  async previewPublishPlatformPlanVersion(versionId: string) {
    const { data } = await rawApi.post<Ok<PublishPreview>>(
      `/platform/plan-versions/${versionId}/preview-publish`,
      {},
    );
    return unwrap(data);
  },

  async publishPlatformPlanVersion(versionId: string) {
    const { data } = await rawApi.post<Ok<{ published: PlanVersionDetail; preview: PublishPreview }>>(
      `/platform/plan-versions/${versionId}/publish`,
      {},
    );
    return unwrap(data);
  },

  async deletePlatformPlanDraft(versionId: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/platform/plan-versions/${versionId}`);
    return unwrap(data);
  },

  async comparePlatformPlans(keys: string[]) {
    const { data } = await rawApi.get<Ok<PlanCompareResponse>>("/platform/plans/compare", {
      params: { keys: keys.join(",") },
    });
    return unwrap(data);
  },

  async listPlatformSubscriptions(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: "active" | "trialing" | "canceled" | "expired";
    planKey?: string;
  }) {
    const { data } = await rawApi.get<Ok<SubscriptionAdminListResponse>>("/platform/subscriptions", {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 25,
        search: params.search ?? "",
        ...(params.status ? { status: params.status } : {}),
        ...(params.planKey ? { planKey: params.planKey } : {}),
      },
    });
    return unwrap(data);
  },

  async listPlatformSubscriptionAccounts(params: { page?: number; pageSize?: number; q?: string }) {
    const { data } = await rawApi.get<Ok<SubscriptionOwnerAccountsResponse>>("/platform/subscription-accounts", {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 25,
        q: params.q ?? "",
      },
    });
    return unwrap(data);
  },

  async getPlatformSubscriptionDetail(ownerId: string) {
    const { data } = await rawApi.get<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}`,
    );
    return unwrap(data);
  },

  async grantPlatformSubscription(
    ownerId: string,
    body: {
      reason: string;
      planKey?: string;
      planVersionId?: string;
      status?: "active" | "trialing";
      trialEndsAt?: string | null;
      currentPeriodStart?: string | null;
      currentPeriodEnd?: string | null;
    },
  ) {
    const { data } = await rawApi.post<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}/grant`,
      body,
    );
    return unwrap(data);
  },

  async setPlatformSubscriptionSchedule(
    ownerId: string,
    body: {
      reason: string;
      trialEndsAt?: string | null;
      currentPeriodStart?: string | null;
      currentPeriodEnd?: string | null;
    },
  ) {
    const { data } = await rawApi.post<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}/set-schedule`,
      body,
    );
    return unwrap(data);
  },

  async extendPlatformSubscription(
    ownerId: string,
    body: { reason: string; mode: "days" | "until"; days?: number; currentPeriodEnd?: string },
  ) {
    const { data } = await rawApi.post<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}/extend`,
      body,
    );
    return unwrap(data);
  },

  async downgradePlatformSubscription(
    ownerId: string,
    body: { reason: string; planKey?: string; planVersionId?: string },
  ) {
    const { data } = await rawApi.post<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}/downgrade`,
      body,
    );
    return unwrap(data);
  },

  async cancelPlatformSubscription(
    ownerId: string,
    body: { reason: string; mode: "immediate" | "end_of_period" },
  ) {
    const { data } = await rawApi.post<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}/cancel`,
      body,
    );
    return unwrap(data);
  },

  async expirePlatformSubscriptionNow(ownerId: string, body: { reason: string }) {
    const { data } = await rawApi.post<Ok<SubscriptionAdminDetail>>(
      `/platform/subscriptions/${encodeURIComponent(ownerId)}/expire-now`,
      body,
    );
    return unwrap(data);
  },

  async listPlatformFeatures() {
    const { data } = await rawApi.get<Ok<CatalogFeature[]>>("/platform/features");
    return unwrap(data);
  },

  async createPlatformFeature(body: {
    key: string;
    name: string;
    description?: string | null;
    valueType: "boolean" | "number" | "string";
    enumOptions?: string[] | null;
  }) {
    const { data } = await rawApi.post<Ok<CatalogFeature>>("/platform/features", body);
    return unwrap(data);
  },

  async patchPlatformFeature(
    id: string,
    body: { name?: string; description?: string | null; enumOptions?: string[] | null },
  ) {
    const { data } = await rawApi.patch<Ok<CatalogFeature>>(`/platform/features/${id}`, body);
    return unwrap(data);
  },

  async listAgents() {
    const { data } = await rawApi.get<Ok<UserPublic[]>>("/users/agents");
    return unwrap(data);
  },

  async createAgent(body: { name: string; email?: string; phone?: string }) {
    const { data } = await rawApi.post<Ok<AgentCreateResult>>("/users/agents", body);
    return unwrap(data);
  },

  async updateAgent(id: string, body: Partial<{ name: string; email: string | null; phone: string | null }>) {
    const { data } = await rawApi.patch<Ok<UserPublic>>(`/users/agents/${id}`, body);
    return unwrap(data);
  },

  async reissueAgentSetupToken(id: string) {
    const { data } = await rawApi.post<Ok<{ setupToken: string; setupTokenExpiresAt: string }>>(`/users/agents/${id}/setup-token`);
    return unwrap(data);
  },

  async deleteAgent(id: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/users/agents/${id}`);
    return unwrap(data);
  },

  async listUsers() {
    const { data } = await rawApi.get<Ok<UserPublic[]>>("/admin/users");
    return unwrap(data);
  },

  async createUser(body: {
    name: string;
    password: string;
    role?: "owner" | "admin" | "agent";
    email?: string;
    phone?: string;
    managedByOwnerId?: string | null;
  }) {
    const { data } = await rawApi.post<Ok<UserPublic>>("/admin/users", body);
    return unwrap(data);
  },

  async updateUser(
    id: string,
    body: Partial<{
      name: string;
      password: string;
      role: "owner" | "admin" | "agent";
      email: string | null;
      phone: string | null;
      managedByOwnerId: string | null;
    }>,
  ) {
    const { data } = await rawApi.patch<Ok<UserPublic>>(`/admin/users/${id}`, body);
    return unwrap(data);
  },

  async deleteUser(id: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/admin/users/${id}`);
    return unwrap(data);
  },

  async listAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    entityType?: string;
    actorRole?: "owner" | "admin" | "agent";
  }) {
    const { data } = await rawApi.get<Ok<PaginatedAuditLogs>>("/audit/logs", { params });
    return unwrap(data);
  },

  async setupPassword(body: { token: string; password: string }) {
    const { data } = await rawApi.post<Ok<{ user: UserPublic; accessToken: string; refreshToken: string }>>(
      "/auth/setup-password",
      body,
    );
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

  async listUnitsPaged(params?: {
    assetId?: string;
    page?: number;
    pageSize?: number;
    status?: "vacant" | "occupied";
    search?: string;
  }) {
    const { data } = await rawApi.get<Ok<PaginatedUnits>>("/units/paged", { params });
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

  async createTenant(body: { name: string; phone?: string; email?: string | null; idNumber?: string }) {
    const { data } = await rawApi.post<Ok<Tenant>>("/tenants", body);
    return unwrap(data);
  },

  async updateTenant(
    id: string,
    body: Partial<{ name: string; phone: string; email: string | null; idNumber: string }>,
  ) {
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

  async getLeaseRentCoverage(leaseId: string, params?: { asOf?: string }) {
    const { data } = await rawApi.get<Ok<LeaseRentCoverage>>(`/leases/${leaseId}/coverage`, { params });
    return unwrap(data);
  },

  async getUnitRentStatus(unitId: string, params?: { asOf?: string }) {
    const { data } = await rawApi.get<Ok<UnitRentStatusResponse>>(`/units/${unitId}/rent-status`, { params });
    return unwrap(data);
  },

  async getAssetRentStatus(assetId: string, params?: { asOf?: string }) {
    const { data } = await rawApi.get<Ok<AssetRentStatusResponse>>(`/assets/${assetId}/rent-status`, { params });
    return unwrap(data);
  },

  async getPortfolioRentStatus(params?: { asOf?: string; assetId?: string }) {
    const { data } = await rawApi.get<Ok<PortfolioRentStatusResponse>>("/analytics/rent-status", { params });
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
    /** Use with `periodStartDate` / `periodEndDate` for flexible coverage; omit if sending `month` only. */
    month?: string;
    periodStartDate?: string;
    periodEndDate?: string;
    method?: string;
    status?: "paid" | "pending" | "failed";
  }) {
    const { data } = await rawApi.post<Ok<Payment>>("/payments", body);
    return unwrap(data);
  },

  async updatePayment(
    id: string,
    body: Partial<{
      amount: string;
      month: string;
      periodStartDate: string;
      periodEndDate: string;
      method: string | null;
      status: "paid" | "pending" | "failed";
      /** Required for admin/agent edits on the API (owners may omit). */
      editReason: string;
    }>,
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

  async getPayment(id: string) {
    const { data } = await rawApi.get<Ok<PaymentDetail>>(`/payments/${id}`);
    return unwrap(data);
  },

  async listPaymentProofs(paymentId: string) {
    const { data } = await rawApi.get<Ok<PaymentProof[]>>(`/payments/${paymentId}/proofs`);
    return unwrap(data);
  },

  async uploadPaymentProof(paymentId: string, file: File) {
    const form = new FormData();
    form.append("proof", file);
    const { data } = await rawApi.post<Ok<PaymentProof>>(`/payments/${paymentId}/proofs/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(data);
  },

  async deletePaymentProof(paymentId: string, proofId: string, reason?: string) {
    const { data } = await rawApi.delete<Ok<{ deleted: boolean }>>(`/payments/${paymentId}/proofs/${proofId}`, {
      data: reason?.trim() ? { reason: reason.trim() } : {},
    });
    return unwrap(data);
  },

  async downloadPaymentProof(paymentId: string, proofId: string, fallbackFileName?: string) {
    const response = await rawApi.get(`/payments/${paymentId}/proofs/${proofId}/download`, {
      responseType: "blob",
    });
    const blob = response.data as Blob;
    const disposition = String(response.headers["content-disposition"] ?? "");
    const headerName = disposition.match(/filename="?([^"]+)"?$/i)?.[1];
    const fileName = decodeURIComponent(headerName ?? fallbackFileName ?? `payment-proof-${proofId}`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getPaymentProofBlob(paymentId: string, proofId: string) {
    const response = await rawApi.get(`/payments/${paymentId}/proofs/${proofId}/download`, {
      responseType: "blob",
    });
    return response.data as Blob;
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

  async ownerRiskSummary(params?: { asOf?: string }) {
    const { data } = await rawApi.get<Ok<OwnerRiskSummary>>("/analytics/risk-summary/owner", { params });
    return unwrap(data);
  },

  async assetRiskSummary(params?: { asOf?: string; cursor?: string; limit?: number }) {
    const { data } = await rawApi.get<Ok<AssetRiskSummaryPage>>("/analytics/risk-summary/assets", { params });
    return unwrap(data);
  },

  async unpaidAging(params?: { asOf?: string; assetId?: string; cursor?: string; limit?: number }) {
    const { data } = await rawApi.get<Ok<UnpaidAgingResponse>>("/analytics/unpaid-aging", { params });
    return unwrap(data);
  },

  async managerReportingQuality(params: { from: string; to: string; cursor?: string; limit?: number }) {
    const { data } = await rawApi.get<Ok<ManagerReportingQualityPage>>(
      "/analytics/manager-reporting-quality",
      { params },
    );
    return unwrap(data);
  },

  async riskDrillDown(params?: {
    asOf?: string;
    assetId?: string;
    status?: "PAID" | "LATE" | "CRITICAL" | "VACANT";
    cursor?: string;
    limit?: number;
  }) {
    const { data } = await rawApi.get<Ok<RiskDrillDownPage>>("/analytics/risk-drill-down", { params });
    return unwrap(data);
  },
};
