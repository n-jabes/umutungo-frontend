"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "owner" | "admin" | "agent">("");

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
    enabled: user?.role === "owner" || user?.role === "admin",
  });
  const users = useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.listUsers(),
    enabled: user?.role === "admin",
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
    enabled: user?.role === "owner" || user?.role === "admin",
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

  const removeAgent = useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.agents });
      await qc.invalidateQueries({ queryKey: queryKeys.auditLogs });
      toast.success("Agent removed");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (user?.role === "agent") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Settings restricted</h1>
        <p className="mt-2 text-sm text-muted">Agent accounts cannot manage users or audit settings.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted">Manage agents, users, and activity history.</p>
      </div>

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Agent management</CardTitle>
          <CardDescription>Create and manage agents linked to your account scope.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 space-y-4 p-0">
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Name is required");
                return;
              }
              createAgent.mutate();
            }}
          >
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="md:col-span-4">
              <Button type="submit" disabled={createAgent.isPending}>{createAgent.isPending ? "Creating..." : "Create agent"}</Button>
            </div>
          </form>
          {setupLink ? (
            <div className="rounded-lg border border-main-blue/30 bg-blue-soft/40 px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">One-time setup link</p>
                <Button type="button" variant="secondary" className="h-8 gap-1 px-2.5" onClick={() => void copySetupLink()}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <p className="mt-1 break-all text-xs text-muted">{setupLink}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-border">
            <ul className="divide-y divide-border">
              {(agents.data ?? []).map((agent) => (
                <li key={agent.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted">{agent.email ?? agent.phone ?? "No contact set"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => reissueSetup.mutate(agent.id)} disabled={reissueSetup.isPending}>
                      Reissue setup
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => removeAgent.mutate(agent.id)} disabled={removeAgent.isPending}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
              {!agents.isLoading && (agents.data?.length ?? 0) === 0 ? (
                <li className="px-4 py-3 text-sm text-muted">No agents yet.</li>
              ) : null}
            </ul>
          </div>
        </CardContent>
      </Card>

      {user?.role === "admin" ? (
        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>User directory</CardTitle>
            <CardDescription>Admin-only overview of all platform users.</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <ul className="divide-y divide-border rounded-xl border border-border">
              {(users.data ?? []).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted">{entry.role} · {entry.email ?? entry.phone ?? "No contact"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="p-6">
        <CardHeader className="p-0">
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>Recent actions by your team and linked agents.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 p-0">
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Filter action..."
              value={actionFilter}
              onChange={(e) => {
                setAuditPage(1);
                setActionFilter(e.target.value);
              }}
            />
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Filter entity type..."
              value={entityTypeFilter}
              onChange={(e) => {
                setAuditPage(1);
                setEntityTypeFilter(e.target.value);
              }}
            />
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => {
                setAuditPage(1);
                setRoleFilter(e.target.value as "" | "owner" | "admin" | "agent");
              }}
            >
              <option value="">All roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(audit.data?.items ?? []).map((entry) => (
              <li key={entry.id} className="px-4 py-3">
                <p className="text-sm font-medium">{entry.action}</p>
                <p className="text-xs text-muted">
                  {entry.user?.name ?? "Unknown user"} · {entry.user?.role ?? "unknown"} · {entry.createdAt.slice(0, 19).replace("T", " ")}
                </p>
              </li>
            ))}
            {!audit.isLoading && (audit.data?.items.length ?? 0) === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">No audit entries yet.</li>
            ) : null}
          </ul>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <p>
              Page {audit.data?.page ?? 1} of{" "}
              {Math.max(1, Math.ceil((audit.data?.total ?? 0) / (audit.data?.pageSize ?? 20)))}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={(audit.data?.page ?? 1) <= 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAuditPage((p) => p + 1)}
                disabled={(audit.data?.page ?? 1) >= Math.ceil((audit.data?.total ?? 0) / (audit.data?.pageSize ?? 20))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
