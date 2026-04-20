"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { SendFeedbackButton } from "@/components/feedback/send-feedback-button";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import { feedbackSeverityPillClass, feedbackTypePillClass } from "@/components/feedback/feedback-pill-styles";
import { Card } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function FeedbackPage() {
  const list = useQuery({
    queryKey: queryKeys.feedbackMine,
    queryFn: () => api.listMyFeedback(),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Voice of user</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your feedback</h1>
          <p className="mt-2 text-sm text-muted">Track all submissions and follow their progress in real time.</p>
        </div>
        <SendFeedbackButton />
      </header>

      {list.isError ? (
        <Card className="p-4 text-sm text-red-600">{getErrorMessage(list.error)}</Card>
      ) : list.isLoading ? (
        <Card className="p-4 text-sm text-muted">Loading feedback…</Card>
      ) : (list.data?.length ?? 0) === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <MessageSquareText className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">No feedback yet. Share your first thought.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(list.data ?? []).map((item) => (
            <Card key={item.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className={feedbackTypePillClass}>{item.type}</span>
                {item.severity ? (
                  <span className={feedbackSeverityPillClass(item.severity)}>{item.severity}</span>
                ) : null}
                <FeedbackStatusBadge status={item.status} />
                <span>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{item.message}</p>
              <p className="text-xs text-muted">Route: {item.route}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
