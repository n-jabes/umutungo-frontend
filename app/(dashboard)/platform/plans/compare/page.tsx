"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { buttonClassName } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const DEFAULT_KEYS = ["starter", "growth", "pro"] as const;

function fmt(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export default function PlatformPlansComparePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const keysCsv = DEFAULT_KEYS.join(",");

  const compare = useQuery({
    queryKey: queryKeys.platformPlanCompare(keysCsv),
    queryFn: () => api.comparePlatformPlans([...DEFAULT_KEYS]),
    enabled: isAdmin,
  });

  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Compare plans"
        description="Side-by-side view of the latest published version for each plan. Useful before publishing a draft or when tuning the matrix."
        actions={
          <Link href="/platform/plans" className={buttonClassName({ variant: "secondary" })}>
            Back to plans
          </Link>
        }
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Comparison uses admin catalog endpoints.">
            <p className="text-sm text-muted">Sign in as a platform admin.</p>
          </PlatformSectionCard>
        ) : compare.isError ? (
          <PlatformSectionCard title="Could not compare" description={getErrorMessage(compare.error)} />
        ) : (
          <PlatformSectionCard title="Latest published matrices">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="sticky left-0 z-10 bg-muted-bg/95 px-3 py-2">Feature</th>
                    {compare.data?.plans.map((p) => (
                      <th key={p.planKey} className="px-3 py-2">
                        <span className="block text-foreground">{p.planName}</span>
                        <span className="mt-0.5 block font-normal normal-case text-muted">
                          {p.version != null ? `v${p.version}` : "No published"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(compare.data?.featureKeys ?? []).map((fk) => (
                    <tr key={fk} className="border-b border-border/80 last:border-0">
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 font-mono text-xs text-foreground">{fk}</td>
                      {compare.data?.plans.map((p) => (
                        <td key={`${p.planKey}-${fk}`} className="px-3 py-2 text-muted">
                          {fmt(p.features[fk])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PlatformSectionCard>
        )}
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
