"use client";

import { useAuth } from "@/contexts/auth-context";
import { MarketingHome } from "@/components/marketing/marketing-home";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getDefaultAppRoute } from "@/lib/default-route";

export default function HomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (user) router.replace(getDefaultAppRoute(user.role));
  }, [user, ready, router]);

  if (!ready || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
      </div>
    );
  }

  return <MarketingHome />;
}
