"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, clearSessionTokens, getAccessToken, setSessionTokens } from "@/lib/api";
import type { UserPublic } from "@/lib/types";

type AuthState = {
  user: UserPublic | null;
  ready: boolean;
};

type AuthContextValue = AuthState & {
  login: (emailOrPhone: { email?: string; phone?: string; password: string }) => Promise<void>;
  register: (p: {
    name: string;
    password: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
      clearSessionTokens();
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshUser();
      setReady(true);
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (body: { email?: string; phone?: string; password: string }) => {
      const res = await api.login(body);
      setSessionTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (body: {
      name: string;
      password: string;
      email?: string;
      phone?: string;
    }) => {
      const res = await api.register(body);
      setSessionTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, ready, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
