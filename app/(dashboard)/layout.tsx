"use client";

import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user) return;
    /** Agents use Rental + Platform; Portfolio is owner-only. */
    if (user.role === "agent" && workspace === "portfolio") {
      setWorkspace("rental");
      router.replace("/dashboard");
      return;
    }
    if (workspace === "platform" && !["owner", "admin", "agent"].includes(user.role)) {
      setWorkspace("rental");
      router.replace("/dashboard");
    }
  }, [ready, user, workspace, setWorkspace, router]);

  useEffect(() => {
    if (!ready || !user) return;
    if (pathname.startsWith("/platform") || pathname.startsWith("/admin/feedback")) {
      if (workspace !== "platform") setWorkspace("platform");
      return;
    }
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/assets") ||
      pathname.startsWith("/tenants") ||
      pathname.startsWith("/leases") ||
      pathname.startsWith("/payments") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/feedback")
    ) {
      if (workspace !== "rental") setWorkspace("rental");
      return;
    }
    if (pathname.startsWith("/portfolio") && workspace !== "portfolio") {
      setWorkspace("portfolio");
    }
  }, [ready, user, pathname, workspace, setWorkspace]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
