"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AuditTrailPanel } from "@/components/settings/audit-trail-panel";
import { PlanUsagePanel } from "@/components/settings/plan-usage-panel";
import { SettingsTabs, type SettingsTabItem } from "@/components/settings/settings-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { cannotCreateAgentDueToAgents } from "@/lib/plan-usage";
import { queryKeys } from "@/lib/query-keys";

type SettingsTab = "plan" | "agents" | "audit" | "users";

export function SettingsPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>("agents");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "owner" | "admin" | "agent">("");

  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "owner" || isAdmin;
  const showPlanTab = user?.role === "owner" || user?.role === "agent";

  const tabItems = useMemo((): SettingsTabItem[] => {
    const items: SettingsTabItem[] = [];
    if (showPlanTab) items.push({ id: "plan", label: "Plan & usage" });
    items.push({ id: "agents", label: "Agents" }, { id: "audit", label: "Audit trail" });
    if (isAdmin) items.push({ id: "users", label: "Users" });
    return items;
  }, [isAdmin, showPlanTab]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "plan" && showPlanTab) setTab("plan");
    else if (t === "audit") setTab("audit");
    else if (t === "users" && isAdmin) setTab("users");
    else if (t === "agents") setTab("agents");
  }, [searchParams, isAdmin, showPlanTab]);

  useEffect(() => {
    if (tab === "users" && !isAdmin) setTab("agents");
    if (tab === "plan" && !showPlanTab) setTab("agents");
  }, [tab, isAdmin, showPlanTab]);

  function setTabAndRoute(next: SettingsTab) {
    setTab(next);
    const path = next === "agents" ? "/settings" : `/settings?tab=${encodeURIComponent(next)}`;
    router.replace(path, { scroll: false });
  }

  async function copySetupLink() {
    if (!setupLink) return;
    try {
      await navigator.clipboard.writeText(setupLink);
      toast.success("Setup link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  const agents = useQuery({
    queryKey: queryKeys.agents,
    queryFn: () => api.listAgents(),
    enabled: canManage,
  });
  const users = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.listUsers(),
    enabled: isAdmin,
  });
  const entitlements = useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: () => api.getMeEntitlements(),
    enabled: user?.role === "owner" || user?.role === "agent",
    staleTime: 60_000,
  });

  const audit = useQuery({
    queryKey: [queryKeys.auditLogs, auditPage, actionFilter, entityTypeFilter, roleFilter],
    queryFn: () =>
      api.listAuditLogs({
        page: auditPage,
        pageSize: 20,
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        actorRole: roleFilter || undefined,
      }),
    enabled: canManage,
  });

  const createAgent = useMutation({
    mutationFn: () =>
      api.createAgent({
        name,
        email: email || undefined,
        phone: phone || undefined,
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: queryKeys.agents });
      await qc.invalidateQueries({ queryKey: queryKeys.entitlements });
      toast.success("Agent created");
      setName("");
      setEmail("");
      setPhone("");
      setSetupLink(`${window.location.origin}/setup-account?token=${res.setupToken}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reissueSetup = useMutation({
    mutationFn: (id: string) => api.reissueAgentSetupToken(id),
    onSuccess: (res) => {
      setSetupLink(`${window.location.origin}/setup-account?token=${res.setupToken}`);
      toast.success("New setup link issued");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const agentLimitReached =
    entitlements.data != null && cannotCreateAgentDueToAgents(entitlements.data);

  const removeAgent = useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.agents });
      await qc.invalidateQueries({ queryKey: queryKeys.entitlements });
      await qc.invalidateQueries({ queryKey: queryKeys.auditLogs });
      toast.success("Agent removed");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const legalSummary =
    user?.termsAcceptedAt != null ? (
      <p className="mt-2 text-sm text-muted">
        You accepted the{" "}
        <Link href="/terms" className="font-medium text-main-blue underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-main-blue underline underline-offset-2">
          Privacy Policy
        </Link>{" "}
        on{" "}
        <time dateTime={user.termsAcceptedAt}>
          {new Date(user.termsAcceptedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        {user.termsVersion ? (
          <>
            {" "}
            (legal bundle <span className="font-mono text-xs">{user.termsVersion}</span>).
          </>
        ) : (
          "."
        )}
      </p>
    ) : (
      <p className="mt-2 text-sm text-muted">
        No Terms and Privacy acceptance is recorded for this account. View the current documents:{" "}
        <Link href="/terms" className="font-medium text-main-blue underline underline-offset-2">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="font-medium text-main-blue underline underline-offset-2">
          Privacy
        </Link>
        .
      </p>
    );

  if (user?.role === "agent") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Plan limits for your organization and what you can manage from an agent account.
          </p>
        </header>
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="border-b border-border bg-card px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Plan & usage</h2>
            <p className="mt-0.5 text-xs text-muted">Read-only — your owner manages billing and team seats.</p>
          </div>
          <div className="bg-card px-6 py-8">
            <PlanUsagePanel variant="agent" />
          </div>
        </Card>
        <Card className="p-8 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Other settings</h2>
          <p className="mt-2 text-sm text-muted">
            Agent accounts cannot manage users, agents, or the audit trail. Ask your owner if you need changes.
          </p>
        </Card>
        <Card className="border-border p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Legal</h2>
          {legalSummary}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Configure team access, review platform users, and inspect the audit trail. Changes that affect security or
          billing are recorded with request context where the API supports it.
        </p>
      </header>

      <Card className="border-border p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Legal</h2>
        {legalSummary}
      </Card>

      <Card className="overflow-hidden border-border shadow-sm">
        <SettingsTabs
          tabs={tabItems}
          value={tab}
          onChange={(id) => setTabAndRoute(id as SettingsTab)}
        />
        <div className="border-t border-border bg-card px-6 py-8">
          {tab === "plan" && showPlanTab ? (
            <div id="settings-panel-plan" role="tabpanel" aria-labelledby="settings-tab-plan">
              <PlanUsagePanel variant="owner" />
            </div>
          ) : null}

          {tab === "agents" ? (
            <div className="space-y-8" id="settings-panel-agents" role="tabpanel" aria-labelledby="settings-tab-agents">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Agents</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Invite agents to operate within your owner scope. Each new account receives a one-time setup link to
                  set a password.
                </p>
              </div>

              <form
                className="grid gap-4 md:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) {
                    toast.error("Name is required");
                    return;
                  }
                  createAgent.mutate();
                }}
              >
                <div className="space-y-1.5 md:col-span-1">
                  <label htmlFor="agent-name" className="text-xs font-medium text-muted">
                    Full name
                  </label>
                  <input
                    id="agent-name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 focus:ring-2"
                    placeholder="e.g. Jane Mukamana"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label htmlFor="agent-email" className="text-xs font-medium text-muted">
                    Email <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    id="agent-email"
                    type="email"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 focus:ring-2"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label htmlFor="agent-phone" className="text-xs font-medium text-muted">
                    Phone <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    id="agent-phone"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-main-blue/20 focus:ring-2"
                    placeholder="+250 …"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Button type="submit" disabled={createAgent.isPending || agentLimitReached}>
                    {createAgent.isPending ? "Creating…" : "Create agent"}
                  </Button>
                  {agentLimitReached ? (
                    <p className="text-sm text-muted">
                      Agent limit reached for your plan. Remove an agent or open{" "}
                      <button
                        type="button"
                        className="font-medium text-main-blue underline underline-offset-2"
                        onClick={() => setTabAndRoute("plan")}
                      >
                        Plan & usage
                      </button>{" "}
                      to review limits.
                    </p>
                  ) : null}
                </div>
              </form>

              {setupLink ? (
                <div className="rounded-xl border border-main-blue/25 bg-blue-soft/50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">One-time setup link</p>
                    <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => void copySetupLink()}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </Button>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-muted">{setupLink}</p>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold text-foreground">Team roster</h3>
                <p className="mt-0.5 text-xs text-muted">Agents linked to your organization.</p>
                <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                  {(agents.data ?? []).map((agent) => (
                    <li key={agent.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{agent.name}</p>
                        <p className="text-sm text-muted">{agent.email ?? agent.phone ?? "No contact on file"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => reissueSetup.mutate(agent.id)}
                          disabled={reissueSetup.isPending}
                        >
                          Reissue setup
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => removeAgent.mutate(agent.id)}
                          disabled={removeAgent.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                  {!agents.isLoading && (agents.data?.length ?? 0) === 0 ? (
                    <li className="px-4 py-10 text-center text-sm text-muted">No agents yet. Create one above.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          ) : null}

          {tab === "audit" ? (
            <div id="settings-panel-audit" role="tabpanel" aria-labelledby="settings-tab-audit">
              <AuditTrailPanel
                items={audit.data?.items ?? []}
                total={audit.data?.total ?? 0}
                page={audit.data?.page ?? auditPage}
                pageSize={audit.data?.pageSize ?? 20}
                isLoading={audit.isLoading}
                actionFilter={actionFilter}
                entityTypeFilter={entityTypeFilter}
                roleFilter={roleFilter}
                onActionFilter={(v) => {
                  setAuditPage(1);
                  setActionFilter(v);
                }}
                onEntityTypeFilter={(v) => {
                  setAuditPage(1);
                  setEntityTypeFilter(v);
                }}
                onRoleFilter={(v) => {
                  setAuditPage(1);
                  setRoleFilter(v);
                }}
                onPageChange={setAuditPage}
              />
            </div>
          ) : null}

          {tab === "users" && isAdmin ? (
            <div className="space-y-6" id="settings-panel-users" role="tabpanel" aria-labelledby="settings-tab-users">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">User directory</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Platform-wide directory of registered accounts. Use this for governance and support coordination.
                </p>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                {(users.data ?? []).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{entry.name}</p>
                      <p className="text-sm text-muted">
                        <span className="capitalize">{entry.role}</span>
                        <span className="mx-1.5 text-border">·</span>
                        {entry.email ?? entry.phone ?? "No contact"}
                      </p>
                    </div>
                  </li>
                ))}
                {!users.isLoading && (users.data?.length ?? 0) === 0 ? (
                  <li className="px-4 py-10 text-center text-sm text-muted">No users returned.</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
