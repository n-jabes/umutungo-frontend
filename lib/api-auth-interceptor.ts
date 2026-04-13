"use client";

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { api, clearSessionTokens, rawApi, setSessionTokens } from "./api";
import * as authStorage from "./api-session-keys";

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

type SessionTokens = { accessToken: string; refreshToken: string };

let installed = false;

/**
 * One in-flight refresh for the whole app. The backend rotates refresh tokens
 * (deletes the old row on each successful refresh), so parallel `/auth/refresh`
 * calls revoke each other and losers run `clearSessionTokens()` — wiping good tokens
 * and causing a 401 storm from React Query + dashboard queries.
 */
let refreshInFlight: Promise<SessionTokens> | null = null;

function refreshSessionLocked(refreshToken: string): Promise<SessionTokens> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .refresh(refreshToken)
      .then((r) => ({ accessToken: r.accessToken, refreshToken: r.refreshToken }))
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Registers the 401 → refresh → retry handler once (safe under React Strict Mode). */
export function installAuthRefreshInterceptor() {
  if (installed) return;
  installed = true;

  rawApi.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      if (!original || original._authRetry) throw error;
      if (error.response?.status !== 401) throw error;
      if (original.url?.includes("/auth/refresh")) throw error;

      const rt =
        typeof window !== "undefined" ? localStorage.getItem(authStorage.REFRESH_KEY) : null;
      if (!rt) throw error;

      original._authRetry = true;
      try {
        const next = await refreshSessionLocked(rt);
        setSessionTokens(next.accessToken, next.refreshToken);
        original.headers.Authorization = `Bearer ${next.accessToken}`;
        return rawApi(original);
      } catch {
        clearSessionTokens();
        throw error;
      }
    },
  );
}

installAuthRefreshInterceptor();
