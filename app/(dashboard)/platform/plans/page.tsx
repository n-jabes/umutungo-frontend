"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformAdminGuard } from "@/components/platform/platform-admin-guard";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const FEATURE_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export default function PlatformPlansListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();

  const plans = useQuery({
    queryKey: queryKeys.platformPlans,
    queryFn: () => api.listPlatformPlans(),
    enabled: isAdmin,
  });

  const features = useQuery({
    queryKey: queryKeys.platformFeatures,
    queryFn: () => api.listPlatformFeatures(),
    enabled: isAdmin,
  });

  const [featKey, setFeatKey] = useState("");
  const [featName, setFeatName] = useState("");
  const [featDesc, setFeatDesc] = useState("");
  const [featType, setFeatType] = useState<"boolean" | "number" | "string">("number");
  const [featEnum, setFeatEnum] = useState("");

  const keySyntaxOk = useMemo(() => {
    const k = featKey.trim();
    if (!k) return true;
    return FEATURE_KEY_PATTERN.test(k);
  }, [featKey]);

  const createFeature = useMutation({
    mutationFn: () =>
      api.createPlatformFeature({
        key: featKey.trim(),
        name: featName.trim(),
        valueType: featType,
        description: featDesc.trim() === "" ? null : featDesc.trim(),
        enumOptions:
          featType === "string" && featEnum.trim()
            ? featEnum.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
      }),
    onSuccess: async () => {
      toast.success("Feature created");
      setFeatKey("");
      setFeatName("");
      setFeatDesc("");
      setFeatEnum("");
      await qc.invalidateQueries({ queryKey: queryKeys.platformFeatures });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <PlatformAccessGuard>
      <PlatformAdminGuard>
      <PlatformPageShell
        title="Plans"
        description="Published plan matrices are frozen. Operators edit a draft, then publish. Features live in a global catalog—each plan draft gets one row per feature."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform/plans/compare" className={buttonClassName({ variant: "secondary" })}>
              Compare Starter · Growth · Pro
            </Link>
          </div>
        }
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Plan catalog APIs require an admin account.">
            <p className="text-sm text-muted">Sign in as a platform admin to manage plans.</p>
          </PlatformSectionCard>
        ) : (
          <>
            <PlatformSectionCard
              title="How editing works"
              description="Short mental model so you are never stuck on a read-only screen."
            >
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
                <li>
                  <span className="font-medium text-foreground">Catalog features</span> (table below) define which keys
                  exist—like <span className="font-mono text-xs">units.max</span> or{" "}
                  <span className="font-mono text-xs">agents.max</span>.
                </li>
                <li>
                  Open a <span className="font-medium text-foreground">plan</span>, then create or select a{" "}
                  <span className="font-medium text-foreground">draft</span> version. Only drafts allow matrix edits.
                </li>
                <li>
                  When a <span className="font-medium text-foreground">new draft</span> is created, the server copies the
                  latest published matrix and adds rows for <span className="font-medium text-foreground">every</span>{" "}
                  catalog feature—including ones you add after that plan existed. Older drafts are not auto-updated.
                </li>
                <li>
                  <span className="font-medium text-foreground">Publish</span> when the diff looks right; subscribers
                  then resolve against the new published snapshot.
                </li>
              </ol>
            </PlatformSectionCard>

            {plans.isError ? (
              <PlatformSectionCard title="Could not load plans" description={getErrorMessage(plans.error)} />
            ) : plans.isLoading ? (
              <PlatformSectionCard title="Plan catalog" description="Loading…" />
            ) : (
              <PlatformSectionCard title="Plan catalog" description="Latest published version and optional draft per plan. Open a plan to edit matrices on a draft.">
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
                            <Link
                              href={`/platform/plans/${encodeURIComponent(p.key)}`}
                              className={buttonClassName({ variant: "ghost", size: "sm" })}
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PlatformSectionCard>
            )}

            <PlatformSectionCard
              title="Feature catalog"
              description="These keys appear as rows in every new plan draft. Boolean toggles, integers for limits, or string / single-select when enum options are set."
            >
              {features.isLoading ? (
                <p className="text-sm text-muted">Loading features…</p>
              ) : features.isError ? (
                <p className="text-sm text-destructive">{getErrorMessage(features.error)}</p>
              ) : (
                <div className="lg:hidden">
                  <div className="space-y-2">
                    {(features.data ?? []).map((f) => (
                      <div key={f.id} className="rounded-lg border border-border bg-muted-bg/30 px-3 py-2 text-sm">
                        <p className="font-mono text-xs font-semibold text-foreground">{f.key}</p>
                        <p className="text-foreground">{f.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          Type: <span className="font-medium capitalize">{f.valueType}</span>
                          {f.enumOptions?.length ? ` · Options: ${f.enumOptions.join(", ")}` : null}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!features.isLoading && !features.isError ? (
                <div className="hidden lg:block">
                  <DataTableShell ariaLabel="Feature catalog" showScrollHint={false}>
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted">
                          <th className="px-3 py-2 font-medium">Key</th>
                          <th className="px-3 py-2 font-medium">Label</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Enum / notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(features.data ?? []).map((f) => (
                          <tr key={f.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2 font-mono text-xs text-foreground">{f.key}</td>
                            <td className="px-3 py-2 text-foreground">{f.name}</td>
                            <td className="px-3 py-2 capitalize text-muted">{f.valueType}</td>
                            <td className="px-3 py-2 text-xs text-muted">
                              {f.enumOptions?.length ? f.enumOptions.join(", ") : (f.description ?? "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DataTableShell>
                </div>
              ) : null}
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Add a catalog feature"
              description="Keys must be stable forever—they are what entitlements and matrices reference. Prefer dotted groups: limits.units.max, not sentence-like names."
            >
              <div className="rounded-lg border border-border bg-muted-bg/40 px-3 py-2 text-xs text-muted">
                <p className="font-medium text-foreground">Expected formats</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li>
                    <span className="font-medium text-foreground">Key:</span> lowercase letters and numbers, segments
                    separated by a single <span className="font-mono">.</span>, <span className="font-mono">_</span>, or{" "}
                    <span className="font-mono">-</span>. Examples:{" "}
                    <span className="font-mono">units.max</span>, <span className="font-mono">billing.invoice_export</span>
                    .
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Boolean:</span> true / false / unset in the plan matrix.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Number:</span> whole integers (e.g. max seats).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">String + enum:</span> comma-separated allowed values
                    below; the matrix becomes a dropdown.
                  </li>
                </ul>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-muted">
                  Key (machine id)
                  <input
                    className={cn(
                      "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground",
                      featKey.trim() && !keySyntaxOk ? "border-red-500/60" : "border-border",
                    )}
                    value={featKey}
                    onChange={(e) => setFeatKey(e.target.value)}
                    placeholder="e.g. units.max"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {featKey.trim() && !keySyntaxOk ? (
                    <p className="mt-1 text-[11px] text-red-600">
                      Invalid pattern. Use lowercase segments like <span className="font-mono">my.feature_name</span>.
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted">Never rename after shipping—create a new key instead.</p>
                  )}
                </label>
                <label className="block text-xs font-medium text-muted">
                  Label (human name)
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={featName}
                    onChange={(e) => setFeatName(e.target.value)}
                    placeholder="e.g. Maximum units"
                  />
                </label>
                <label className="block text-xs font-medium text-muted sm:col-span-2">
                  Description (optional, shown to operators)
                  <textarea
                    className="mt-1 min-h-[56px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    value={featDesc}
                    onChange={(e) => setFeatDesc(e.target.value)}
                    placeholder="What this flag controls and when to turn it on."
                  />
                </label>
                <label className="block text-xs font-medium text-muted">
                  Value type
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={featType}
                    onChange={(e) => setFeatType(e.target.value as typeof featType)}
                  >
                    <option value="boolean">Boolean — on/off capability</option>
                    <option value="number">Number — integer limits or counts</option>
                    <option value="string">String — free text or enum list below</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-muted">
                  Enum options (string type only)
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={featEnum}
                    onChange={(e) => setFeatEnum(e.target.value)}
                    placeholder="starter, growth, pro"
                    disabled={featType !== "string"}
                  />
                  {featType === "string" ? (
                    <p className="mt-1 text-[11px] text-muted">Comma-separated. Leave empty for free-text string.</p>
                  ) : null}
                </label>
              </div>
              <Button
                className="mt-4"
                variant="secondary"
                disabled={
                  !featKey.trim() ||
                  !featName.trim() ||
                  !keySyntaxOk ||
                  createFeature.isPending
                }
                onClick={() => createFeature.mutate()}
              >
                Create feature
              </Button>
            </PlatformSectionCard>
          </>
        )}
      </PlatformPageShell>
      </PlatformAdminGuard>
    </PlatformAccessGuard>
  );
}
