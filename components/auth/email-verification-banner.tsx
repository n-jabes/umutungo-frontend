"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/api";
import { userNeedsEmailVerification } from "@/lib/user-email-verification";

export function EmailVerificationBanner() {
  const { user, resendEmailVerification } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!userNeedsEmailVerification(user)) return null;

  async function onResend() {
    setBusy(true);
    try {
      await resendEmailVerification();
      toast.success("Verification email sent. Check your inbox and spam folder.");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-50 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex min-w-0 gap-3">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="font-medium text-foreground">Confirm your email address</p>
          <p className="mt-0.5 text-pretty text-muted dark:text-amber-100/85">
            We sent a link to <span className="font-medium text-foreground">{user!.email}</span>. Verifying helps with
            account recovery and important notices.
          </p>
        </div>
      </div>
      <Button type="button" variant="secondary" size="sm" className="shrink-0 self-start sm:self-auto" disabled={busy} onClick={() => void onResend()}>
        {busy ? "Sending…" : "Resend email"}
      </Button>
    </div>
  );
}
