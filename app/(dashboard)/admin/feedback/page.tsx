"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformAdminGuard } from "@/components/platform/platform-admin-guard";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import { feedbackSeverityPillClass, feedbackTypePillClass } from "@/components/feedback/feedback-pill-styles";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { FeedbackAdminItem, FeedbackStatus } from "@/lib/types";
import { toast } from "sonner";

export default function AdminFeedbackPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | FeedbackStatus>("");
  const [selected, setSelected] = useState<FeedbackAdminItem | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      page,
      pageSize: 25,
      status: statusFilter,
    }),
    [page, statusFilter],
  );

  const list = useQuery({
    queryKey: queryKeys.feedbackAdmin({
      page: listParams.page,
      pageSize: listParams.pageSize,
      status: listParams.status || "",
    }),
    queryFn: () =>
      api.listAdminFeedback({
        page: listParams.page,
        pageSize: listParams.pageSize,
        ...(listParams.status ? { status: listParams.status } : {}),
      }),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; status?: FeedbackStatus; internalNotes?: string }) =>
      api.updateAdminFeedback(payload.id, {
        status: payload.status,
        internalNotes: payload.internalNotes,
      }),
    onSuccess: async (updated) => {
      toast.success("Feedback updated");
      await qc.invalidateQueries({ queryKey: queryKeys.feedbackAdmin({ page, pageSize: 25, status: statusFilter || "" }) });
      setSelected((prev) => (prev ? { ...prev, ...updated } : prev));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  async function openScreenshot(feedbackId: string) {
    try {
      const blob = await api.getFeedbackScreenshotBlob(feedbackId);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <PlatformAccessGuard>
      <PlatformAdminGuard>
        <PlatformPageShell
          title="Feedback inbox"
          description="Pilot user feedback queue with fast triage and status updates."
          actions={
            <Link href="/platform" className={buttonClassName({ variant: "secondary" })}>
              Platform overview
            </Link>
          }
        >
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs text-muted">
                Status filter
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "" | FeedbackStatus);
                    setPage(1);
                  }}
                  className="ml-2 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="new">New</option>
                  <option value="triaged">Triaged</option>
                  <option value="in_progress">In progress</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>

            {list.isError ? (
              <p className="text-sm text-red-600">{getErrorMessage(list.error)}</p>
            ) : list.isLoading ? (
              <p className="text-sm text-muted">Loading feedback…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Severity</th>
                      <th className="py-2">Message</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(list.data?.items ?? []).map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer hover:bg-muted-bg/40"
                        onClick={() => {
                          setSelected(item);
                          setInternalNotes(item.internalNotes ?? "");
                          setPreviewUrl(null);
                        }}
                      >
                        <td className="py-2.5 text-xs text-muted">
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-2.5 capitalize">{item.type}</td>
                        <td className="py-2.5 capitalize">{item.severity ?? "—"}</td>
                        <td className="max-w-[320px] truncate py-2.5">{item.message}</td>
                        <td className="py-2.5 capitalize">{item.role}</td>
                        <td className="py-2.5">
                          <FeedbackStatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPage((v) => Math.max(1, v - 1))}>
                Previous
              </Button>
              <span className="text-xs text-muted">{list.data?.page ?? page}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((v) => v + 1)}
                disabled={(list.data?.items?.length ?? 0) < 25}
              >
                Next
              </Button>
            </div>
          </Card>
        </PlatformPageShell>

        <Modal
          open={!!selected}
          onClose={() => {
            setSelected(null);
            setPreviewUrl(null);
          }}
          title="Feedback detail"
          description="Review context and triage status."
          size="lg"
        >
          {selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className={feedbackTypePillClass}>{selected.type}</span>
                {selected.severity ? (
                  <span className={feedbackSeverityPillClass(selected.severity)}>{selected.severity}</span>
                ) : null}
                <FeedbackStatusBadge status={selected.status} />
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{selected.message}</p>
              <div className="rounded-lg border border-border bg-muted-bg/30 p-3 text-xs text-muted">
                <p>Route: {selected.route}</p>
                <p>User: {selected.user?.name ?? selected.userId}</p>
                <p>Browser: {String(selected.metadata?.browser ?? "n/a")}</p>
                <p>Last action: {String(selected.metadata?.lastAction ?? "n/a")}</p>
                <p>Sentry event: {String(selected.metadata?.sentryEventId ?? "n/a")}</p>
              </div>
              {selected.screenshotUrl ? (
                <div className="space-y-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => void openScreenshot(selected.id)}>
                    Load screenshot preview
                  </Button>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Feedback screenshot" className="max-h-80 w-full rounded-lg border border-border object-contain" />
                  ) : null}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-xs font-medium text-muted">Status</span>
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      update.mutate({
                        id: selected.id,
                        status: e.target.value as FeedbackStatus,
                        internalNotes: internalNotes.trim() || undefined,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="new">New</option>
                    <option value="triaged">Triaged</option>
                    <option value="in_progress">In progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>
              <label className="space-y-1.5 text-sm">
                <span className="text-xs font-medium text-muted">Internal notes</span>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() =>
                    update.mutate({
                      id: selected.id,
                      internalNotes: internalNotes.trim() || "",
                    })
                  }
                  disabled={update.isPending}
                >
                  {update.isPending ? "Saving..." : "Save notes"}
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </PlatformAdminGuard>
    </PlatformAccessGuard>
  );
}
