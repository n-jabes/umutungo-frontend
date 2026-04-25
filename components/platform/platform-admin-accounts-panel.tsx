"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AdminUserSortField, UserPublic } from "@/lib/types";
import { cn } from "@/lib/utils";

function setupUrl(token: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/setup-account?token=${encodeURIComponent(token)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy — copy manually from the field.");
  }
}

function adminPageButtonSequence(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const want = new Set<number>([1, totalPages, current]);
  for (let d = -2; d <= 2; d++) want.add(current + d);
  const nums = [...want].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const seq: (number | "gap")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) seq.push("gap");
    seq.push(n);
    prev = n;
  }
  return seq;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function defaultSortDir(col: AdminUserSortField): "asc" | "desc" {
  if (col === "createdAt" || col === "emailVerifiedAt" || col === "mustSetPassword") return "desc";
  return "asc";
}

function SortTh({
  label,
  sublabel,
  column,
  sort,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  sublabel?: string;
  column: AdminUserSortField;
  sort: AdminUserSortField;
  sortDir: "asc" | "desc";
  onSort: (col: AdminUserSortField) => void;
  className?: string;
}) {
  const active = sort === column;
  return (
    <th scope="col" className={cn("px-3 py-2.5 align-bottom font-medium text-foreground", className)}>
      <button
        type="button"
        className="group flex w-full flex-col items-start gap-0.5 text-left outline-none ring-main-blue/20 focus-visible:ring-2"
        onClick={() => onSort(column)}
      >
        <span className="flex items-center gap-1">
          <span>{label}</span>
          {active ? (
            sortDir === "asc" ? (
              <ChevronUp className="h-3.5 w-3.5 text-main-blue" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-main-blue" aria-hidden />
            )
          ) : (
            <span className="inline-flex h-3.5 w-3.5 flex-col justify-center opacity-0 transition-opacity group-hover:opacity-40" aria-hidden>
              <ChevronUp className="-mb-1 h-2 w-3.5" />
              <ChevronDown className="h-2 w-3.5" />
            </span>
          )}
        </span>
        {sublabel ? <span className="text-[10px] font-normal text-muted">{sublabel}</span> : null}
      </button>
    </th>
  );
}

export function PlatformAdminAccountsPanel() {
  const { user: sessionUser } = useAuth();
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<"" | "owner" | "admin" | "agent">("");
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sort, setSort] = useState<AdminUserSortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"owner" | "admin" | "agent">("owner");
  const [newPlanKey, setNewPlanKey] = useState("starter");
  const [newManagedOwnerId, setNewManagedOwnerId] = useState("");
  const [usePasswordInstead, setUsePasswordInstead] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [lastSetupUrl, setLastSetupUrl] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<UserPublic | null>(null);

  const prevQRef = useRef<string | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setQ(searchDraft.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  useEffect(() => {
    if (prevQRef.current === null) {
      prevQRef.current = q;
      return;
    }
    if (prevQRef.current !== q) {
      prevQRef.current = q;
      setPage(1);
    }
  }, [q]);

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      q,
      role: roleFilter,
      sort,
      sortDir,
    }),
    [page, pageSize, q, roleFilter, sort, sortDir],
  );

  const usersQuery = useQuery({
    queryKey: queryKeys.platformAdminUsers(listParams),
    queryFn: () =>
      api.listUsers({
        page: listParams.page,
        pageSize: listParams.pageSize,
        ...(listParams.q ? { q: listParams.q } : {}),
        ...(listParams.role ? { role: listParams.role } : {}),
        sort: listParams.sort,
        sortDir: listParams.sortDir,
      }),
  });

  const ownersQuery = useQuery({
    queryKey: queryKeys.platformAdminOwnerPicker,
    queryFn: () =>
      api.listUsers({
        page: 1,
        pageSize: 100,
        role: "owner",
        sort: "name",
        sortDir: "asc",
      }),
    staleTime: 60_000,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.platformPlans,
    queryFn: () => api.listPlatformPlans(),
  });

  const owners = useMemo(() => ownersQuery.data?.items ?? [], [ownersQuery.data?.items]);

  const userById = useMemo(() => {
    const m = new Map<string, UserPublic>();
    for (const u of owners) m.set(u.id, u);
    for (const u of usersQuery.data?.items ?? []) m.set(u.id, u);
    return m;
  }, [owners, usersQuery.data?.items]);

  function handleColumnSort(col: AdminUserSortField) {
    if (sort === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setSortDir(defaultSortDir(col));
    }
    setPage(1);
  }

  const createUser = useMutation({
    mutationFn: () => {
      const emailTrim = newEmail.trim();
      const phoneTrim = newPhone.trim();
      const body: Parameters<typeof api.createUser>[0] = {
        name: newName.trim(),
        role: newRole,
        ...(emailTrim ? { email: emailTrim.toLowerCase() } : {}),
        ...(phoneTrim ? { phone: phoneTrim } : {}),
      };
      if (newRole === "owner") body.planKey = newPlanKey;
      if (newRole === "agent") body.managedByOwnerId = newManagedOwnerId;
      if (usePasswordInstead && newPassword.length >= 8) body.password = newPassword;
      return api.createUser(body);
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as string[];
          return k[0] === "platform" && k[1] === "admin" && k[2] === "users";
        },
      });
      await qc.invalidateQueries({ queryKey: queryKeys.platformAdminOwnerPicker });
      await qc.invalidateQueries({ queryKey: queryKeys.auditLogs });
      if (res.setupToken) {
        const url = setupUrl(res.setupToken);
        setLastSetupUrl(url);
        toast.success("User created — copy the setup link below.");
      } else {
        setLastSetupUrl(null);
        toast.success("User created with the password you set.");
      }
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("owner");
      setNewPlanKey("starter");
      setNewManagedOwnerId("");
      setUsePasswordInstead(false);
      setNewPassword("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reissueSetup = useMutation({
    mutationFn: (id: string) => api.reissueUserSetupToken(id),
    onSuccess: async (res) => {
      await qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as string[];
          return k[0] === "platform" && k[1] === "admin" && k[2] === "users";
        },
      });
      const url = setupUrl(res.setupToken);
      setLastSetupUrl(url);
      toast.success("New setup link issued");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: async () => {
      await qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as string[];
          return k[0] === "platform" && k[1] === "admin" && k[2] === "users";
        },
      });
      await qc.invalidateQueries({ queryKey: queryKeys.platformAdminOwnerPicker });
      await qc.invalidateQueries({ queryKey: queryKeys.auditLogs });
      toast.success("User deleted");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function openCreateModal() {
    setLastSetupUrl(null);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("owner");
    const keys = plansQuery.data?.map((p) => p.key) ?? [];
    setNewPlanKey(keys.includes("starter") ? "starter" : keys[0] ?? "starter");
    setNewManagedOwnerId("");
    setUsePasswordInstead(false);
    setNewPassword("");
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (createUser.isPending) return;
    setCreateOpen(false);
    setLastSetupUrl(null);
  }

  const planOptions = plansQuery.data ?? [];
  const rows = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title="Create user"
        description="New accounts are email-verified immediately when an email is provided. Omit the password to get a setup link (same flow as owner-invited agents)."
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted" htmlFor="admin-new-name">
                Full name
              </label>
              <input
                id="admin-new-name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="admin-new-email">
                Email
              </label>
              <input
                id="admin-new-email"
                type="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="admin-new-phone">
                Phone
              </label>
              <input
                id="admin-new-phone"
                type="tel"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted sm:col-span-2">At least one of email or phone is required.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="admin-new-role">
                Role
              </label>
              <select
                id="admin-new-role"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "owner" | "admin" | "agent")}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            {newRole === "owner" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted" htmlFor="admin-new-plan">
                  Initial plan
                </label>
                <select
                  id="admin-new-plan"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                  value={newPlanKey}
                  onChange={(e) => setNewPlanKey(e.target.value)}
                  disabled={planOptions.length === 0}
                >
                  {planOptions.length === 0 ? (
                    <option value="starter">starter</option>
                  ) : (
                    planOptions.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name} ({p.key})
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}
            {newRole === "agent" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted" htmlFor="admin-new-owner">
                  Managed by owner
                </label>
                <select
                  id="admin-new-owner"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                  value={newManagedOwnerId}
                  onChange={(e) => setNewManagedOwnerId(e.target.value)}
                  disabled={ownersQuery.isLoading}
                >
                  <option value="">{ownersQuery.isLoading ? "Loading owners…" : "Select owner…"}</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.email ? `(${o.email})` : o.phone ? `(${o.phone})` : ""}
                    </option>
                  ))}
                </select>
                {!ownersQuery.isLoading && owners.length === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    There are no owner accounts yet. Create an owner first, then add agents linked to that owner.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={usePasswordInstead}
              onChange={(e) => setUsePasswordInstead(e.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">Set password here</span>
              <span className="mt-1 block text-xs text-muted">
                When unchecked, the user receives a one-time link to choose their password (recommended).
              </span>
            </span>
          </label>
          {usePasswordInstead ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted" htmlFor="admin-new-password">
                Initial password (min 8 characters)
              </label>
              <input
                id="admin-new-password"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          ) : null}

          {lastSetupUrl ? (
            <div className="rounded-lg border border-border bg-muted-bg/40 p-3">
              <p className="text-xs font-medium text-foreground">Password setup link</p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted">{lastSetupUrl}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void copyText(lastSetupUrl)}>
                  Copy link
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={createUser.isPending}>
              {lastSetupUrl ? "Close" : "Cancel"}
            </Button>
            {!lastSetupUrl ? (
              <Button
                type="button"
                disabled={
                  createUser.isPending ||
                  !newName.trim() ||
                  (!newEmail.trim() && !newPhone.trim()) ||
                  (newRole === "agent" && !newManagedOwnerId) ||
                  (usePasswordInstead && newPassword.length < 8)
                }
                onClick={() => createUser.mutate()}
              >
                {createUser.isPending ? "Creating…" : "Create user"}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (removeUser.isPending) return;
          setDeleteTarget(null);
        }}
        title="Delete user?"
        description="This permanently removes the account and cannot be undone."
        size="sm"
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Delete <span className="font-medium text-foreground">{deleteTarget.name}</span> (
              {deleteTarget.email ?? deleteTarget.phone ?? deleteTarget.id})?
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={removeUser.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={removeUser.isPending}
                onClick={() => removeUser.mutate(deleteTarget.id)}
              >
                {removeUser.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md">
          <label className="text-xs font-medium text-muted" htmlFor="admin-user-search">
            Search (name, email, phone)
          </label>
          <input
            id="admin-user-search"
            placeholder="Type to filter…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <p className="text-[11px] text-muted">Results update shortly after you stop typing.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted" htmlFor="admin-role-filter">
              Role
            </label>
            <select
              id="admin-role-filter"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as "" | "owner" | "admin" | "agent");
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted" htmlFor="admin-page-size">
              Rows per page
            </label>
            <select
              id="admin-page-size"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={openCreateModal}>
            New user…
          </Button>
        </div>
      </div>

      {usersQuery.isError ? (
        <p className="text-sm text-destructive">{getErrorMessage(usersQuery.error)}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted-bg/50">
                  <SortTh
                    label="Name"
                    column="name"
                    sort={sort}
                    sortDir={sortDir}
                    onSort={handleColumnSort}
                  />
                  <SortTh
                    label="Contact"
                    sublabel="Sort by email"
                    column="email"
                    sort={sort}
                    sortDir={sortDir}
                    onSort={handleColumnSort}
                  />
                  <SortTh label="Role" column="role" sort={sort} sortDir={sortDir} onSort={handleColumnSort} />
                  <SortTh
                    label="Email verified"
                    column="emailVerifiedAt"
                    sort={sort}
                    sortDir={sortDir}
                    onSort={handleColumnSort}
                  />
                  <SortTh
                    label="Password"
                    sublabel="must-set flag"
                    column="mustSetPassword"
                    sort={sort}
                    sortDir={sortDir}
                    onSort={handleColumnSort}
                  />
                  <SortTh label="Created" column="createdAt" sort={sort} sortDir={sortDir} onSort={handleColumnSort} />
                  <th className="px-3 py-2.5 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 align-top font-medium text-foreground">{u.name}</td>
                      <td className="px-3 py-2 align-top text-muted">
                        <div>{u.email ?? "—"}</div>
                        <div className="text-xs">{u.phone ?? ""}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="rounded-md bg-muted-bg px-2 py-0.5 text-xs font-medium capitalize">{u.role}</span>
                        {u.role === "agent" && u.managedByOwnerId ? (
                          <div className="mt-1 text-[11px] text-muted">
                            Owner:{" "}
                            {userById.get(u.managedByOwnerId)?.name ?? u.managedByOwnerId.slice(0, 8) + "…"}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-top text-muted">
                        {!u.email ? (
                          <span className="text-xs">N/A (phone)</span>
                        ) : u.emailVerifiedAt ? (
                          <span className="text-emerald-700 dark:text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-500">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-muted">
                        {u.mustSetPassword ? (
                          <span className="text-xs">Must set via link</span>
                        ) : (
                          <span className="text-xs">Set</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="justify-start text-xs"
                            disabled={reissueSetup.isPending}
                            onClick={() => reissueSetup.mutate(u.id)}
                          >
                            New setup link
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="justify-start text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                            disabled={removeUser.isPending || u.id === sessionUser?.id}
                            onClick={() => setDeleteTarget(u)}
                          >
                            Delete…
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <p className="text-xs text-muted tabular-nums-fin">
              Showing{" "}
              <span className="font-medium text-foreground">
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>
              <span className="mx-1.5">·</span>
              Page <span className="font-medium text-foreground">{page}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page <= 1}>
                First
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                Previous
              </Button>
              {adminPageButtonSequence(page, totalPages).map((entry, idx) =>
                entry === "gap" ? (
                  <span key={`gap-${idx}`} className="px-1 text-xs text-muted">
                    …
                  </span>
                ) : (
                  <Button
                    key={entry}
                    type="button"
                    variant={entry === page ? "primary" : "secondary"}
                    size="sm"
                    className="min-w-9 px-2"
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </>
      )}

      {lastSetupUrl && !createOpen ? (
        <div className="rounded-lg border border-border bg-muted-bg/30 p-4">
          <p className="text-sm font-medium text-foreground">Latest setup link</p>
          <p className="mt-1 break-all font-mono text-xs text-muted">{lastSetupUrl}</p>
          <Button type="button" className="mt-2" size="sm" variant="secondary" onClick={() => void copyText(lastSetupUrl)}>
            Copy link
          </Button>
        </div>
      ) : null}
    </div>
  );
}
