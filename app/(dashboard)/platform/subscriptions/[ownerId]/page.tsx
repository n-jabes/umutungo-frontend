"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformAdminGuard } from "@/components/platform/platform-admin-guard";
import { PlatformSafetyDialog } from "@/components/platform/platform-safety-dialog";
import { usePlatformTwoStepPreference } from "@/components/platform/use-platform-two-step-preference";
import { PlatformPageShell, PlatformSectionCard } from "@/components/platform/platform-page-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

function ReasonField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-medium text-muted">
      Operator reason (required, min 3 characters)
      <textarea
        className="mt-1 min-h-[64px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Explain why this change is being made for support and audit."
      />
    </label>
  );
}

export default function PlatformSubscriptionDetailPage() {
  const params = useParams();
  const ownerId = typeof params.ownerId === "string" ? params.ownerId : "";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const { twoStepRequired } = usePlatformTwoStepPreference();

  const [safety, setSafety] = useState<{
    id: "grant" | "schedule" | "extend" | "downgrade" | "cancel" | "expire";
    title: string;
    description: string;
    detail?: string;
    variant: "caution" | "danger";
    phrase: string;
  } | null>(null);

  const detail = useQuery({
    queryKey: queryKeys.platformSubscriptionDetail(ownerId),
    queryFn: () => api.getPlatformSubscriptionDetail(ownerId),
    enabled: isAdmin && !!ownerId,
  });

  const plans = useQuery({
    queryKey: queryKeys.platformPlans,
    queryFn: () => api.listPlatformPlans(),
    enabled: isAdmin,
  });

  const planKeys = useMemo(() => (plans.data ?? []).map((p) => p.key), [plans.data]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.platformSubscriptionDetail(ownerId) });
    await qc.invalidateQueries({ queryKey: ["platform", "subscriptions"] });
    await qc.invalidateQueries({ queryKey: ["platform", "subscription-accounts"] });
  };

  const [grantReason, setGrantReason] = useState("");
  const [grantPlanKey, setGrantPlanKey] = useState("starter");
  const [grantStatus, setGrantStatus] = useState<"active" | "trialing">("active");
  const [grantTrial, setGrantTrial] = useState("");
  const [grantStart, setGrantStart] = useState("");
  const [grantEnd, setGrantEnd] = useState("");

  const [schedReason, setSchedReason] = useState("");
  const [schedClearTrial, setSchedClearTrial] = useState(false);
  const [schedTrial, setSchedTrial] = useState("");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");

  const [extReason, setExtReason] = useState("");
  const [extMode, setExtMode] = useState<"days" | "until">("days");
  const [extDays, setExtDays] = useState(30);
  const [extUntil, setExtUntil] = useState("");

  const [downReason, setDownReason] = useState("");
  const [downPlanKey, setDownPlanKey] = useState("starter");

  const [cancelReason, setCancelReason] = useState("");
  const [cancelMode, setCancelMode] = useState<"immediate" | "end_of_period">("immediate");

  const [expireReason, setExpireReason] = useState("");

  const grantMut = useMutation({
    mutationFn: () =>
      api.grantPlatformSubscription(ownerId, {
        reason: grantReason.trim(),
        planKey: grantPlanKey.trim(),
        status: grantStatus,
        ...(grantTrial.trim() ? { trialEndsAt: new Date(grantTrial).toISOString() } : {}),
        ...(grantStart.trim() ? { currentPeriodStart: grantStart.trim() } : {}),
        ...(grantEnd.trim() ? { currentPeriodEnd: grantEnd.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Subscription updated");
      setGrantReason("");
      await invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const schedMut = useMutation({
    mutationFn: () =>
      api.setPlatformSubscriptionSchedule(ownerId, {
        reason: schedReason.trim(),
        ...(schedClearTrial
          ? { trialEndsAt: null }
          : schedTrial.trim()
            ? { trialEndsAt: new Date(schedTrial).toISOString() }
            : {}),
        ...(schedStart.trim() ? { currentPeriodStart: schedStart.trim() } : {}),
        ...(schedEnd.trim() ? { currentPeriodEnd: schedEnd.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Schedule saved");
      setSchedReason("");
      setSchedClearTrial(false);
      await invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const extMut = useMutation({
    mutationFn: () =>
      api.extendPlatformSubscription(ownerId, {
        reason: extReason.trim(),
        mode: extMode,
        ...(extMode === "days" ? { days: extDays } : { currentPeriodEnd: extUntil.trim() }),
      }),
    onSuccess: async () => {
      toast.success("Billing period extended");
      setExtReason("");
      await invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const downMut = useMutation({
    mutationFn: () =>
      api.downgradePlatformSubscription(ownerId, {
        reason: downReason.trim(),
        planKey: downPlanKey.trim(),
      }),
    onSuccess: async () => {
      toast.success("Plan version changed");
      setDownReason("");
      await invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cancelMut = useMutation({
    mutationFn: () =>
      api.cancelPlatformSubscription(ownerId, {
        reason: cancelReason.trim(),
        mode: cancelMode,
      }),
    onSuccess: async () => {
      toast.success("Cancellation applied");
      setCancelReason("");
      await invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const expireMut = useMutation({
    mutationFn: () => api.expirePlatformSubscriptionNow(ownerId, { reason: expireReason.trim() }),
    onSuccess: async () => {
      toast.success("Subscription expired");
      setExpireReason("");
      await invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function runConfirmedAction() {
    if (!safety) return;
    const id = safety.id;
    setSafety(null);
    if (id === "grant") grantMut.mutate();
    else if (id === "schedule") schedMut.mutate();
    else if (id === "extend") extMut.mutate();
    else if (id === "downgrade") downMut.mutate();
    else if (id === "cancel") cancelMut.mutate();
    else if (id === "expire") expireMut.mutate();
  }

  function requireReasonThenOpen(
    reason: string,
    minLen: number,
    cfg: NonNullable<typeof safety>,
  ) {
    if (reason.trim().length < minLen) {
      toast.error("Operator reason must be at least 3 characters.");
      return;
    }
    setSafety(cfg);
  }

  if (!ownerId) {
    return (
      <PlatformAccessGuard>
        <PlatformAdminGuard>
          <PlatformPageShell title="Subscription" description="Missing owner id.">
            <p className="text-sm text-muted">Check the URL or open an owner from the subscriptions list.</p>
          </PlatformPageShell>
        </PlatformAdminGuard>
      </PlatformAccessGuard>
    );
  }

  const sub = detail.data?.subscription;

  return (
    <PlatformAccessGuard>
      <PlatformAdminGuard>
      <PlatformPageShell
        title={detail.data ? detail.data.owner.name : "Subscription"}
        description="Operator console for one owner account. All actions below require a written reason and append to the immutable subscription event log."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/platform/subscriptions" className={buttonClassName({ variant: "secondary" })}>
              Back to list
            </Link>
            <Link href="/platform/audit" className={buttonClassName({ variant: "secondary" })}>
              Audit log
            </Link>
          </div>
        }
      >
        {!isAdmin ? (
          <PlatformSectionCard title="Admin only" description="Sign in as a platform admin." />
        ) : detail.isError ? (
          <PlatformSectionCard title="Error" description={getErrorMessage(detail.error)} />
        ) : detail.isLoading || !detail.data ? (
          <PlatformSectionCard title="Loading" description="…" />
        ) : (
          <>
            <PlatformSectionCard title="Owner" description={detail.data.owner.email ?? detail.data.owner.phone ?? undefined}>
              <p className="text-sm font-medium text-foreground">{detail.data.owner.name}</p>
              <p className="mt-1 font-mono text-xs text-muted">{detail.data.owner.id}</p>
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Current subscription"
              description={sub ? `${sub.planName} (${sub.planKey} v${sub.planVersion})` : "No subscription row yet — grant a published plan version."}
            >
              {sub ? (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted">Status</dt>
                    <dd className="font-medium">{sub.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Trial ends</dt>
                    <dd>{sub.trialEndsAt ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Period</dt>
                    <dd className="text-muted">
                      {sub.currentPeriodStart ?? "—"} → {sub.currentPeriodEnd ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Canceled at</dt>
                    <dd>{sub.canceledAt ?? "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted">This owner falls back to the default starter entitlements until you grant a plan.</p>
              )}
            </PlatformSectionCard>

            <PlatformSectionCard title="Grant or change plan" description="Targets the latest published version for the selected plan key.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-muted">
                  Plan
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={grantPlanKey}
                    onChange={(e) => setGrantPlanKey(e.target.value)}
                  >
                    {(planKeys.length ? planKeys : ["starter", "growth", "pro"]).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-muted">
                  Status
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={grantStatus}
                    onChange={(e) => setGrantStatus(e.target.value as typeof grantStatus)}
                  >
                    <option value="active">active</option>
                    <option value="trialing">trialing</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-muted sm:col-span-2">
                  Trial ends (optional, ISO local)
                  <input
                    type="datetime-local"
                    className="mt-1 h-10 w-full max-w-md rounded-lg border border-border bg-card px-3 text-sm"
                    value={grantTrial}
                    onChange={(e) => setGrantTrial(e.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  Period start (YYYY-MM-DD)
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={grantStart}
                    onChange={(e) => setGrantStart(e.target.value)}
                    placeholder="2026-04-01"
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  Period end (YYYY-MM-DD)
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={grantEnd}
                    onChange={(e) => setGrantEnd(e.target.value)}
                    placeholder="2026-04-30"
                  />
                </label>
              </div>
              <div className="mt-3">
                <ReasonField value={grantReason} onChange={setGrantReason} />
              </div>
              <Button
                className="mt-3"
                disabled={grantMut.isPending || grantReason.trim().length < 3}
                onClick={() =>
                  requireReasonThenOpen(grantReason, 3, {
                    id: "grant",
                    title: "Grant or switch plan",
                    description: "Applies the latest published matrix for the selected plan key to this owner.",
                    detail: detail.data?.owner.name,
                    variant: "caution",
                    phrase: "GRANT",
                  })
                }
              >
                Grant / switch plan
              </Button>
            </PlatformSectionCard>

            <PlatformSectionCard
              title="Set trial & billing period"
              description="Updates only the fields you supply. Use “Clear trial” or set a new trial end datetime."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={schedClearTrial} onChange={(e) => setSchedClearTrial(e.target.checked)} />
                  Clear trial end
                </label>
                <label className="text-xs font-medium text-muted sm:col-span-2">
                  Trial ends (datetime local)
                  <input
                    type="datetime-local"
                    className="mt-1 h-10 w-full max-w-md rounded-lg border border-border bg-card px-3 text-sm"
                    value={schedTrial}
                    onChange={(e) => setSchedTrial(e.target.value)}
                    disabled={schedClearTrial}
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  Period start
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={schedStart}
                    onChange={(e) => setSchedStart(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  Period end
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={schedEnd}
                    onChange={(e) => setSchedEnd(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              </div>
              <div className="mt-3">
                <ReasonField value={schedReason} onChange={setSchedReason} />
              </div>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={
                  schedMut.isPending ||
                  schedReason.trim().length < 3 ||
                  (!schedClearTrial && !schedTrial.trim() && !schedStart.trim() && !schedEnd.trim())
                }
                onClick={() =>
                  requireReasonThenOpen(schedReason, 3, {
                    id: "schedule",
                    title: "Apply billing schedule",
                    description: "Updates trial and/or billing window fields you supplied.",
                    variant: "caution",
                    phrase: "SCHEDULE",
                  })
                }
              >
                Apply schedule
              </Button>
              {!sub ? <p className="mt-2 text-xs text-muted">Grant a plan before setting a schedule.</p> : null}
            </PlatformSectionCard>

            <PlatformSectionCard title="Extend current period" description="Add days from the current end date, or set an explicit end date.">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={extMode === "days"} onChange={() => setExtMode("days")} />
                  Add days
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={extMode === "until"} onChange={() => setExtMode("until")} />
                  Set end date
                </label>
              </div>
              {extMode === "days" ? (
                <label className="mt-3 block max-w-[200px] text-xs font-medium text-muted">
                  Days
                  <input
                    type="number"
                    min={1}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={extDays}
                    onChange={(e) => setExtDays(parseInt(e.target.value, 10) || 1)}
                  />
                </label>
              ) : (
                <label className="mt-3 block max-w-[220px] text-xs font-medium text-muted">
                  New period end
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                    value={extUntil}
                    onChange={(e) => setExtUntil(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              )}
              <div className="mt-3">
                <ReasonField value={extReason} onChange={setExtReason} />
              </div>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={extMut.isPending || extReason.trim().length < 3 || !sub}
                onClick={() =>
                  requireReasonThenOpen(extReason, 3, {
                    id: "extend",
                    title: "Extend billing period",
                    description: "Shifts the current billing end according to your inputs.",
                    variant: "caution",
                    phrase: "EXTEND",
                  })
                }
              >
                Extend
              </Button>
            </PlatformSectionCard>

            <PlatformSectionCard title="Downgrade (change published snapshot)" description="Moves the subscription to the latest published version of the chosen plan.">
              <label className="block max-w-xs text-xs font-medium text-muted">
                Target plan
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  value={downPlanKey}
                  onChange={(e) => setDownPlanKey(e.target.value)}
                >
                  {(planKeys.length ? planKeys : ["starter", "growth", "pro"]).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3">
                <ReasonField value={downReason} onChange={setDownReason} />
              </div>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={downMut.isPending || downReason.trim().length < 3 || !sub}
                onClick={() =>
                  requireReasonThenOpen(downReason, 3, {
                    id: "downgrade",
                    title: "Change published plan snapshot",
                    description: "Moves this subscription to the latest published version of the selected plan key.",
                    variant: "caution",
                    phrase: "DOWNGRADE",
                  })
                }
              >
                Downgrade / change tier
              </Button>
            </PlatformSectionCard>

            <PlatformSectionCard title="Cancel" description="Immediate access ends now unless you keep an end-of-period window (requires a future period end).">
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={cancelMode === "immediate"} onChange={() => setCancelMode("immediate")} />
                  Immediate
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={cancelMode === "end_of_period"} onChange={() => setCancelMode("end_of_period")} />
                  End of current period
                </label>
              </div>
              <div className="mt-3">
                <ReasonField value={cancelReason} onChange={setCancelReason} />
              </div>
              <Button
                className="mt-3"
                variant="danger"
                disabled={cancelMut.isPending || cancelReason.trim().length < 3 || !sub}
                onClick={() =>
                  requireReasonThenOpen(cancelReason, 3, {
                    id: "cancel",
                    title: "Cancel subscription",
                    description:
                      cancelMode === "immediate"
                        ? "Immediate cancellation ends access now."
                        : "Cancellation will apply at the end of the current billing period.",
                    variant: "danger",
                    phrase: "CANCEL",
                  })
                }
              >
                Cancel subscription
              </Button>
            </PlatformSectionCard>

            <PlatformSectionCard title="Expire now" description="Marks the subscription expired and closes the trial. Use for compliance or manual churn.">
              <ReasonField value={expireReason} onChange={setExpireReason} />
              <Button
                className="mt-3"
                variant="danger"
                disabled={expireMut.isPending || expireReason.trim().length < 3 || !sub}
                onClick={() =>
                  requireReasonThenOpen(expireReason, 3, {
                    id: "expire",
                    title: "Expire subscription now",
                    description: "Marks the subscription expired and clears trial. Use only when you are certain.",
                    variant: "danger",
                    phrase: "EXPIRE",
                  })
                }
              >
                Expire immediately
              </Button>
            </PlatformSectionCard>

            <PlatformSectionCard title="Event timeline" description="Newest first. Payload includes the operator reason and before/after snapshots where applicable.">
              {detail.data.timeline.length === 0 ? (
                <p className="text-sm text-muted">No events yet.</p>
              ) : (
                <div className="max-h-[480px] space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {detail.data.timeline.map((ev) => (
                    <div key={ev.id} className="rounded-md border border-border/60 bg-muted-bg/30 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">{ev.eventType}</span>
                        <span className="text-xs text-muted">{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {ev.actor ? `${ev.actor.name} (${ev.actor.role})` : "System / unknown actor"}
                      </p>
                      {ev.payload && typeof ev.payload === "object" && "reason" in ev.payload ? (
                        <p className="mt-2 text-xs text-foreground">
                          <span className="font-semibold text-muted">Reason:</span> {String((ev.payload as { reason?: string }).reason)}
                        </p>
                      ) : null}
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-card p-2 font-mono text-[10px] leading-relaxed text-muted">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </PlatformSectionCard>
          </>
        )}
      </PlatformPageShell>

      <PlatformSafetyDialog
        open={safety != null}
        onClose={() => setSafety(null)}
        onConfirm={runConfirmedAction}
        title={safety?.title ?? ""}
        description={safety?.description ?? ""}
        detail={safety?.detail}
        confirmLabel="Run action"
        variant={safety?.variant ?? "caution"}
        isPending={
          grantMut.isPending ||
          schedMut.isPending ||
          extMut.isPending ||
          downMut.isPending ||
          cancelMut.isPending ||
          expireMut.isPending
        }
        twoStepRequired={twoStepRequired}
        typedPhraseLabel={`Type ${safety?.phrase ?? ""} to confirm`}
        typedPhraseExpected={safety?.phrase ?? ""}
      />
      </PlatformAdminGuard>
    </PlatformAccessGuard>
  );
}
