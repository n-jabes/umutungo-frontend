"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformSafetyDialog } from "@/components/platform/platform-safety-dialog";
import { usePlatformTwoStepPreference } from "@/components/platform/use-platform-two-step-preference";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PlanVersionMatrixRow } from "@/lib/types";

function matrixToDraft(rows: PlanVersionMatrixRow[]) {
  const m: Record<string, unknown> = {};
  for (const r of rows) {
    m[r.feature.key] = r.value;
  }
  return m;
}

export default function PlatformPlanDetailPage() {
  const params = useParams();
  const planKey = typeof params.planKey === "string" ? params.planKey : "";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const { twoStepRequired } = usePlatformTwoStepPreference();

  const plan = useQuery({
    queryKey: queryKeys.platformPlan(planKey),
    queryFn: () => api.getPlatformPlan(planKey),
    enabled: isAdmin && !!planKey,
  });

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [matrixDraft, setMatrixDraft] = useState<Record<string, unknown>>({});
  const [publishOpen, setPublishOpen] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.previewPublishPlatformPlanVersion>> | null>(
    null,
  );
  const [publishReason, setPublishReason] = useState("");
  const [publishPhrase, setPublishPhrase] = useState("");
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackFromVersion, setRollbackFromVersion] = useState<number | null>(null);
  const [rollbackSafetyOpen, setRollbackSafetyOpen] = useState(false);

  useEffect(() => {
    if (!plan.data) return;
    setMetaName(plan.data.name);
    setMetaDesc(plan.data.description ?? "");
  }, [plan.data]);

  const defaultVersionId = useMemo(() => {
    const p = plan.data;
    if (!p?.versions?.length) return null;
    const draft = p.versions.find((v) => v.status === "draft");
    if (draft) return draft.id;
    const published = p.versions.filter((v) => v.status === "published");
    if (!published.length) return p.versions[0]?.id ?? null;
    return published.reduce((a, b) => (a.version >= b.version ? a : b)).id;
  }, [plan.data]);

  useEffect(() => {
    if (defaultVersionId && !selectedVersionId) setSelectedVersionId(defaultVersionId);
  }, [defaultVersionId, selectedVersionId]);

  const versionDetail = useQuery({
    queryKey: queryKeys.platformPlanVersion(selectedVersionId ?? ""),
    queryFn: () => api.getPlatformPlanVersion(selectedVersionId!),
    enabled: isAdmin && !!selectedVersionId,
  });

  useEffect(() => {
    if (!versionDetail.data?.matrix) return;
    setMatrixDraft(matrixToDraft(versionDetail.data.matrix));
    // Re-seed matrix draft only when switching version (id), not on every matrix refetch while editing.
  }, [versionDetail.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- omit matrix to avoid wiping edits

  const selectedBrief = plan.data?.versions.find((v) => v.id === selectedVersionId);
  const isDraftSelected = selectedBrief?.status === "draft";

  const publishedSorted = useMemo(() => {
    return (plan.data?.versions ?? [])
      .filter((v) => v.status === "published")
      .sort((a, b) => b.version - a.version);
  }, [plan.data?.versions]);

  useEffect(() => {
    if (!publishOpen) {
      setPublishReason("");
      setPublishPhrase("");
    }
  }, [publishOpen]);

  useEffect(() => {
    setRollbackFromVersion(null);
  }, [planKey]);

  useEffect(() => {
    if (!plan.data || rollbackFromVersion !== null) return;
    if (!publishedSorted.length) return;
    setRollbackFromVersion(publishedSorted.length >= 2 ? publishedSorted[1].version : publishedSorted[0].version);
  }, [plan.data, publishedSorted, rollbackFromVersion]);

  const saveMeta = useMutation({
    mutationFn: () =>
      api.patchPlatformPlan(planKey, {
        name: metaName.trim(),
        description: metaDesc.trim() === "" ? null : metaDesc.trim(),
      }),
    onSuccess: async () => {
      toast.success("Plan updated");
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlan(planKey) });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlans });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createDraft = useMutation({
    mutationFn: () => api.createPlatformPlanDraft(planKey, {}),
    onSuccess: async (v) => {
      toast.success(`Draft v${v.version} created`);
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlan(planKey) });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlans });
      setSelectedVersionId(v.id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const saveMatrix = useMutation({
    mutationFn: () => api.patchPlatformPlanVersionMatrix(selectedVersionId!, matrixDraft),
    onSuccess: async () => {
      toast.success("Matrix saved");
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlanVersion(selectedVersionId!) });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlan(planKey) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteDraft = useMutation({
    mutationFn: () => api.deletePlatformPlanDraft(selectedVersionId!),
    onSuccess: async () => {
      toast.success("Draft deleted");
      setSelectedVersionId(null);
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlan(planKey) });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlans });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const runPreview = useMutation({
    mutationFn: () => api.previewPublishPlatformPlanVersion(selectedVersionId!),
    onSuccess: (p) => {
      setPreview(p);
      setPublishOpen(true);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const confirmPublish = useMutation({
    mutationFn: (reason: string) => api.publishPlatformPlanVersion(selectedVersionId!, { reason }),
    onSuccess: async () => {
      toast.success("Version published");
      setPublishOpen(false);
      setPreview(null);
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlan(planKey) });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlans });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlanCompare("starter,growth,pro") });
      if (selectedVersionId) await qc.invalidateQueries({ queryKey: queryKeys.platformPlanVersion(selectedVersionId) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rollbackMut = useMutation({
    mutationFn: () =>
      api.rollbackPlatformPlan(planKey, {
        cloneFromVersion: rollbackFromVersion!,
        reason: rollbackReason.trim(),
      }),
    onSuccess: async (v) => {
      toast.success(`Rollback draft v${v.version} created`);
      setRollbackSafetyOpen(false);
      setRollbackReason("");
      setSelectedVersionId(v.id);
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlan(planKey) });
      await qc.invalidateQueries({ queryKey: queryKeys.platformPlans });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!planKey) {
    return (
      <PlatformAccessGuard>
        <PlatformPageShell title="Plan" description="Missing plan key.">
          <p className="text-sm text-muted">Check the URL or return to the plan list.</p>
        </PlatformPageShell>
      </PlatformAccessGuard>
    );
  }

  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title={plan.data ? plan.data.name : "Plan"}
        description="You can edit plan name and description anytime. The feature matrix only unlocks when the version dropdown shows a draft: use New draft from latest published (or Rollback). Published versions stay read-only so tenants always see a fixed snapshot until you publish again."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform/plans" className={buttonClassName({ variant: "secondary" })}>
              All plans
            </Link>
            <Link href="/platform/plans/compare" className={buttonClassName({ variant: "secondary" })}>
              Compare plans
            </Link>
            <Link href="/platform/audit" className={buttonClassName({ variant: "secondary" })}>
              Audit log
            </Link>
          </div>
        }
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Plan editing requires an admin account.">
            <p className="text-sm text-muted">Sign in as a platform admin.</p>
          </PlatformSectionCard>
        ) : plan.isError ? (
          <PlatformSectionCard title="Could not load plan" description={getErrorMessage(plan.error)} />
        ) : (
          <>
            <PlatformSectionCard title="Metadata" description="Display name and description (plan key stays fixed).">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-muted">
                  Name
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={metaName}
                    onChange={(e) => setMetaName(e.target.value)}
                  />
                </label>
                <label className="block text-xs font-medium text-muted sm:col-span-2">
                  Description
                  <textarea
                    className="mt-1 min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                  />
                </label>
              </div>
              <Button
                className="mt-3"
                disabled={saveMeta.isPending || !plan.data}
                onClick={() => saveMeta.mutate()}
              >
                Save metadata
              </Button>
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Versions"
              description="Pick which snapshot you are looking at. Matrix cells are editable only when status is draft — if you only see published rows, create a draft first, then re-select it here."
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="flex flex-col text-xs font-medium text-muted sm:min-w-[220px]">
                  Active version
                  <select
                    className="mt-1 h-10 rounded-lg border border-border bg-card px-3 text-sm"
                    value={selectedVersionId ?? ""}
                    onChange={(e) => setSelectedVersionId(e.target.value || null)}
                  >
                    {(plan.data?.versions ?? []).map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version} · {v.status}
                        {v.publishedAt ? ` · ${v.publishedAt.slice(0, 10)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="secondary"
                  disabled={createDraft.isPending || !plan.data?.versions || !!plan.data.versions.find((x) => x.status === "draft")}
                  onClick={() => createDraft.mutate()}
                >
                  New draft from latest published
                </Button>
                {isDraftSelected ? (
                  <Button variant="danger" disabled={deleteDraft.isPending} onClick={() => setDeleteDraftOpen(true)}>
                    Delete draft
                  </Button>
                ) : null}
              </div>
            </PlatformSectionCard>

            {plan.data && !isDraftSelected ? (
              <div className="rounded-xl border border-accent-gold/35 bg-gold-soft px-4 py-3 text-sm text-main-green shadow-sm">
                <p className="font-semibold tracking-tight">Why the matrix looks locked</p>
                <p className="mt-1.5 text-xs leading-relaxed opacity-90">
                  This version is published, so values are read-only. Use{" "}
                  <span className="font-medium text-foreground">New draft from latest published</span> (or the rollback
                  helper below) to create a draft, then choose that draft in &quot;Active version&quot; above. Any new
                  feature you add under Plans is included automatically the next time a draft is created—it is not
                  retrofitted into old drafts.
                </p>
              </div>
            ) : null}

            <PlatformSectionCard
              title="Rollback helper"
              description="When a published matrix misbehaves, start a new draft cloned from an older published snapshot. No draft may exist yet; then preview and publish with a separate publish reason."
            >
              {publishedSorted.length === 0 ? (
                <p className="text-sm text-muted">No published versions yet — publish a first version before rollback is meaningful.</p>
              ) : plan.data?.versions.some((v) => v.status === "draft") ? (
                <p className="text-sm text-muted">Finish or delete the current draft before creating a rollback draft.</p>
              ) : (
                <div className="flex flex-col gap-3 sm:max-w-lg">
                  <label className="text-xs font-medium text-muted">
                    Clone published version
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                      value={rollbackFromVersion ?? ""}
                      onChange={(e) => setRollbackFromVersion(Number(e.target.value))}
                    >
                      {publishedSorted.map((v) => (
                        <option key={v.id} value={v.version}>
                          v{v.version}
                          {v.publishedAt ? ` · ${v.publishedAt.slice(0, 10)}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Operator reason (min 3 characters)
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      value={rollbackReason}
                      onChange={(e) => setRollbackReason(e.target.value)}
                      placeholder="Explain the misconfiguration and why you are restoring this snapshot."
                    />
                  </label>
                  <Button
                    variant="secondary"
                    disabled={rollbackMut.isPending || rollbackReason.trim().length < 3 || rollbackFromVersion == null}
                    onClick={() => {
                      if (rollbackReason.trim().length < 3) {
                        toast.error("Add a rollback reason (min 3 characters).");
                        return;
                      }
                      setRollbackSafetyOpen(true);
                    }}
                  >
                    Create rollback draft
                  </Button>
                </div>
              )}
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Feature matrix"
              description={
                isDraftSelected
                  ? "Each row is one catalog feature key. Save sends only the values you see here to this draft; use Preview publish to diff against the previous published version before going live."
                  : "Shown for reference on published snapshots. Switch to a draft to change values."
              }
            >
              {versionDetail.isLoading ? (
                <p className="text-sm text-muted">Loading matrix…</p>
              ) : versionDetail.isError ? (
                <p className="text-sm text-destructive">{getErrorMessage(versionDetail.error)}</p>
              ) : (
                <div className="space-y-3">
                  {(versionDetail.data?.matrix ?? []).map((row) => (
                    <MatrixRowEditor
                      key={row.featureId}
                      row={row}
                      disabled={!isDraftSelected}
                      value={matrixDraft[row.feature.key] ?? row.value}
                      onChange={(v) => setMatrixDraft((prev) => ({ ...prev, [row.feature.key]: v }))}
                    />
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      disabled={!isDraftSelected || saveMatrix.isPending || !selectedVersionId}
                      onClick={() => saveMatrix.mutate()}
                    >
                      Save matrix
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!isDraftSelected || runPreview.isPending || !selectedVersionId}
                      onClick={() => runPreview.mutate()}
                    >
                      Preview publish
                    </Button>
                  </div>
                </div>
              )}
            </PlatformSectionCard>
          </>
        )}
      </PlatformPageShell>

      <Modal
        open={publishOpen}
        onClose={() => {
          setPublishOpen(false);
          setPreview(null);
        }}
        title="Publish version"
        description="Review changes against the previous latest published snapshot, then confirm."
        size="lg"
      >
        {preview ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Plan <span className="font-medium text-foreground">{preview.planKey}</span> — draft v
              {preview.draftVersion}
              {preview.previousPublished
                ? ` · was v${preview.previousPublished.version} published`
                : " · first publish"}
            </p>
            <label className="block text-xs font-medium text-muted">
              Publish reason (required, min 3 characters — stored on the audit record)
              <textarea
                className="mt-1 min-h-[64px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={publishReason}
                onChange={(e) => setPublishReason(e.target.value)}
                placeholder="e.g. Verified matrix against pricing committee sign-off."
              />
            </label>
            {twoStepRequired ? (
              <label className="block text-xs font-medium text-muted">
                Type <span className="font-mono font-semibold text-foreground">PUBLISH</span> to enable confirmation
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm"
                  value={publishPhrase}
                  onChange={(e) => setPublishPhrase(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            ) : null}
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted-bg/95 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Feature</th>
                    <th className="px-3 py-2">Before</th>
                    <th className="px-3 py-2">After</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.diff.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-muted">
                        No differences vs previous published (still publishing locks this snapshot).
                      </td>
                    </tr>
                  ) : (
                    preview.diff.map((d) => (
                      <tr key={d.featureKey} className="border-t border-border/80">
                        <td className="px-3 py-2 font-mono text-xs">{d.featureKey}</td>
                        <td className="px-3 py-2 text-muted">{String(d.before)}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{String(d.after)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPublishOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  confirmPublish.isPending ||
                  publishReason.trim().length < 3 ||
                  (twoStepRequired && publishPhrase.trim() !== "PUBLISH")
                }
                onClick={() => confirmPublish.mutate(publishReason.trim())}
              >
                Confirm publish
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Loading preview…</p>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDraftOpen}
        onClose={() => setDeleteDraftOpen(false)}
        onConfirm={() => {
          deleteDraft.mutate(undefined, {
            onSettled: () => {
              setDeleteDraftOpen(false);
            },
          });
        }}
        title="Delete draft plan version"
        description="This permanently removes the draft and all unsaved matrix work for this version."
        confirmLabel="Delete draft"
        isPending={deleteDraft.isPending}
      />

      <PlatformSafetyDialog
        open={rollbackSafetyOpen}
        onClose={() => setRollbackSafetyOpen(false)}
        onConfirm={() => rollbackMut.mutate()}
        title="Create rollback draft"
        description="A new draft will be created from the selected published snapshot. Review the matrix and use Preview publish before applying to subscribers."
        detail={
          rollbackFromVersion != null
            ? `Plan ${planKey} · source published v${rollbackFromVersion}`
            : undefined
        }
        confirmLabel="Create rollback draft"
        variant="caution"
        isPending={rollbackMut.isPending}
        twoStepRequired={twoStepRequired}
        typedPhraseLabel="Type ROLLBACK to confirm"
        typedPhraseExpected="ROLLBACK"
      />
    </PlatformAccessGuard>
  );
}

function MatrixRowEditor({
  row,
  value,
  disabled,
  onChange,
}: {
  row: PlanVersionMatrixRow;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  const f = row.feature;
  const opts = f.enumOptions?.length ? f.enumOptions : null;

  if (f.valueType === "boolean") {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{f.name}</p>
          <p className="font-mono text-[11px] text-muted">{f.key}</p>
        </div>
        <select
          className="h-9 max-w-[200px] rounded-lg border border-border bg-card px-2 text-sm"
          disabled={disabled}
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") onChange(null);
            else onChange(v === "true");
          }}
        >
          <option value="">(unset)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  if (f.valueType === "number") {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{f.name}</p>
          <p className="font-mono text-[11px] text-muted">{f.key}</p>
        </div>
        <input
          type="number"
          className="h-9 w-full max-w-[200px] rounded-lg border border-border bg-card px-2 text-sm sm:text-right"
          disabled={disabled}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") onChange(null);
            else {
              const n = parseInt(raw, 10);
              onChange(Number.isFinite(n) ? n : null);
            }
          }}
        />
      </div>
    );
  }

  if (opts) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{f.name}</p>
          <p className="font-mono text-[11px] text-muted">{f.key}</p>
        </div>
        <select
          className="h-9 max-w-[220px] rounded-lg border border-border bg-card px-2 text-sm"
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : v);
          }}
        >
          <option value="">(unset)</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{f.name}</p>
        <p className="font-mono text-[11px] text-muted">{f.key}</p>
      </div>
      <input
        type="text"
        className="h-9 w-full max-w-[260px] rounded-lg border border-border bg-card px-2 text-sm"
        disabled={disabled}
        value={value == null ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : v);
        }}
      />
    </div>
  );
}
