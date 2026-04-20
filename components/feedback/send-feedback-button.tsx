"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { MessageSquarePlus, Paperclip } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { FeedbackSeverity, FeedbackType } from "@/lib/types";

declare global {
  interface Window {
    __umutungoLastAction?: string;
  }
}

function browserInfo() {
  if (typeof window === "undefined") return "unknown";
  return `${window.navigator.userAgent} | ${window.navigator.language}`;
}

function installLastActionTracker() {
  if (typeof window === "undefined") return;
  if (window.__umutungoLastAction) return;
  window.__umutungoLastAction = "session.start";
  window.addEventListener(
    "click",
    (evt) => {
      const target = evt.target as HTMLElement | null;
      const label = target?.closest("button,a,[role='button']")?.textContent?.trim();
      window.__umutungoLastAction = label ? `click:${label.slice(0, 80)}` : "click";
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (evt) => {
      window.__umutungoLastAction = `key:${evt.key}`;
    },
    true,
  );
}

export function SendFeedbackButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("medium");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  useEffect(() => {
    installLastActionTracker();
  }, []);

  const canSubmit = useMemo(() => message.trim().length >= 5, [message]);

  const submitFeedback = useMutation({
    mutationFn: () =>
      api.submitFeedback({
        type,
        severity: type === "bug" ? severity : undefined,
        message: message.trim(),
        route: pathname || "/",
        screenshot,
        metadata: {
          userId: user?.id ?? null,
          userRole: user?.role ?? null,
          browser: browserInfo(),
          timestamp: new Date().toISOString(),
          lastAction: typeof window !== "undefined" ? window.__umutungoLastAction ?? null : null,
          sentryEventId: Sentry.lastEventId() || null,
        },
      }),
    onSuccess: async () => {
      toast.success("Thanks, we received your feedback");
      setOpen(false);
      setType("bug");
      setSeverity("medium");
      setMessage("");
      setScreenshot(null);
      await qc.invalidateQueries({ queryKey: queryKeys.feedbackMine });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <>
      <Button type="button" variant="secondary" className={className} onClick={() => setOpen(true)}>
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        Send feedback
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (submitFeedback.isPending) return;
          setOpen(false);
        }}
        title="Send feedback"
        description="Fast feedback helps us improve Umutungo quickly."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            submitFeedback.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="bug">Bug</option>
                <option value="idea">Idea</option>
                <option value="question">Question</option>
              </select>
            </label>
            {type === "bug" ? (
              <label className="space-y-1.5 text-sm">
                <span className="text-xs font-medium text-muted">Severity</span>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            ) : null}
          </div>

          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-medium text-muted">Message</span>
            <textarea
              required
              minLength={5}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, what you expected, and anything useful to reproduce."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-main-blue/20 focus:ring-2"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:bg-muted-bg/40">
            <Paperclip className="h-4 w-4" />
            <span className="flex-1 truncate">{screenshot?.name ?? "Attach optional screenshot (PNG/JPG/WEBP)"}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={submitFeedback.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitFeedback.isPending}>
              {submitFeedback.isPending ? "Submitting..." : "Submit feedback"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
