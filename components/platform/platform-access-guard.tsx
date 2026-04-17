"use client";

import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

export function PlatformAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const allowed = user?.role === "owner" || user?.role === "admin";
  if (allowed) return <>{children}</>;

  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold">Platform workspace restricted</h1>
      <p className="mt-2 text-sm text-muted">
        Only owner and admin accounts can access plans, subscriptions, and platform operations.
      </p>
    </Card>
  );
}
