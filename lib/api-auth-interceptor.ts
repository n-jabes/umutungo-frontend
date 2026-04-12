"use client";

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { api, clearSessionTokens, rawApi, setSessionTokens } from "./api";
import * as authStorage from "./api-session-keys";

type RetryConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

let installed = false;

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
}

installAuthRefreshInterceptor();
