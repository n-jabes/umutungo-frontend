"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Toaster } from "sonner";
import { useState } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import "@/lib/api-auth-interceptor";

function isUnauthorized(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: true,
        retry: (failureCount: number, error: unknown) => {
          if (isUnauthorized(error)) return false;
          return failureCount < 3;
        },
      },
      mutations: {
        retry: (failureCount: number, error: unknown) => {
          if (isUnauthorized(error)) return false;
          return failureCount < 3;
        },
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          {children}
          <Toaster richColors position="top-right" />
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
