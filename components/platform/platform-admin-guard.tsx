"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

/**
 * Redirects non-admin users to `/platform` (tenant overview). Use on operator-only routes.
 */
export function PlatformAdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/platform");
  }, [user, isAdmin, router]);

  if (!user) return null;
  if (!isAdmin) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted" aria-live="polite">
        Redirecting…
      </p>
    );
  }

  return <>{children}</>;
}
