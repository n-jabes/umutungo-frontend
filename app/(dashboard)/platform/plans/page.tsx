"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function PlatformPlansListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();

  const plans = useQuery({
    queryKey: queryKeys.platformPlans,
    queryFn: () => api.listPlatformPlans(),
    enabled: isAdmin,
  });

  const [featKey, setFeatKey] = useState("");
  const [featName, setFeatName] = useState("");
  const [featType, setFeatType] = useState<"boolean" | "number" | "string">("number");
  const [featEnum, setFeatEnum] = useState("");

  const createFeature = useMutation({
    mutationFn: () =>
      api.createPlatformFeature({
        key: featKey.trim(),
        name: featName.trim(),
        valueType: featType,
        description: null,
        enumOptions:
          featType === "string" && featEnum.trim()
            ? featEnum.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
      }),
    onSuccess: async () => {
      toast.success("Feature created");
      setFeatKey("");
      setFeatName("");
      setFeatEnum("");
      await qc.invalidateQueries({ queryKey: queryKeys.platformFeatures });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Plans"
        description="Versioned plan catalog. Published snapshots are immutable; edits happen on drafts, then publish as a new effective version."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/platform/plans/compare">Compare Starter · Growth · Pro</Link>
            </Button>
          </div>
        }
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Plan catalog APIs require an admin account.">
            <p className="text-sm text-muted">Sign in as a platform admin to manage plans.</p>
          </PlatformSectionCard>
        ) : plans.isError ? (
          <PlatformSectionCard title="Could not load plans" description={getErrorMessage(plans.error)} />
        ) : plans.isLoading ? (
          <PlatformSectionCard title="Catalog" description="Loading…" />
        ) : (
          <PlatformSectionCard title="Catalog" description="Latest published version and optional draft per plan.">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-muted-bg/50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Latest published</th>
                    <th className="px-3 py-2">Draft</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(plans.data ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-border/80 last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted">{p.key}</p>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {p.latestPublished ? (
                          <span>
                            v{p.latestPublished.version}
                            {p.latestPublished.publishedAt
                              ? ` · ${p.latestPublished.publishedAt.slice(0, 10)}`
                              : ""}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {p.draft ? <span>v{p.draft.version} (draft)</span> : <span>None</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/platform/plans/${encodeURIComponent(p.key)}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PlatformSectionCard>
        )}

        {isAdmin ? (
          <PlatformSectionCard
            title="New feature"
            description="Adds a catalog key for future plan matrices (existing plans get nulls until you edit a draft)."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-medium text-muted">
                Key
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                  value={featKey}
                  onChange={(e) => setFeatKey(e.target.value)}
                  placeholder="e.g. exports.api_calls"
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                Label
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                  value={featName}
                  onChange={(e) => setFeatName(e.target.value)}
                  placeholder="Display name"
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                Type
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                  value={featType}
                  onChange={(e) => setFeatType(e.target.value as typeof featType)}
                >
                  <option value="boolean">Boolean</option>
                  <option value="number">Number</option>
                  <option value="string">String / enum</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-muted">
                Enum options (string only)
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                  value={featEnum}
                  onChange={(e) => setFeatEnum(e.target.value)}
                  placeholder="a, b, c"
                  disabled={featType !== "string"}
                />
              </label>
            </div>
            <Button
              className="mt-3"
              variant="secondary"
              disabled={!featKey.trim() || !featName.trim() || createFeature.isPending}
              onClick={() => createFeature.mutate()}
            >
              Create feature
            </Button>
          </PlatformSectionCard>
        ) : null}
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
