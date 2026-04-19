"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LegalFooterInline } from "@/components/legal/legal-footer-inline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, clearSessionTokens, getErrorMessage } from "@/lib/api";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

function RuleRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 ${
        met ? "text-emerald-700 dark:text-emerald-400" : "text-muted"
      }`}
    >
      {met ? (
        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      ) : (
        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-border" aria-hidden />
      )}
      <span>{label}</span>
    </li>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const lenOk = password.length >= PASSWORD_MIN;
  const maxOk = password.length <= PASSWORD_MAX;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  /** Non-alphanumeric = symbol / punctuation (recommendation only; server does not require it). */
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const matchOk = confirm.length > 0 && password === confirm;
  const matchMismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This page needs a link from your email.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password.length > PASSWORD_MAX) {
      setError(`Password must be at most ${PASSWORD_MAX} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await api.resetPassword({ token, password });
      clearSessionTokens();
      router.replace("/login?reset=1");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-10 sm:items-center sm:justify-center sm:py-0">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Umutungo home">
            <Logo />
          </Link>
          <Link href="/login" className="text-xs font-medium text-muted hover:text-foreground">
            ← Sign in
          </Link>
        </div>
        <Card className="border-border p-0 shadow-card">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardTitle className="text-lg font-semibold text-foreground">Set a new password</CardTitle>
            <p className="text-sm text-muted">Choose a strong password you have not used elsewhere.</p>
          </CardHeader>
          <CardContent className="p-6">
            {!token ? (
              <p className="text-sm text-red-600">
                This link is missing a token. Open the link from your email, or{" "}
                <Link href="/forgot-password" className="font-medium text-main-blue underline">
                  request a new reset
                </Link>
                .
              </p>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
                <div>
                  <label className="text-xs font-medium text-muted">New password</label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={PASSWORD_MIN}
                      maxLength={PASSWORD_MAX}
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-11 text-sm outline-none ring-main-blue/30 focus:ring-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                  <ul
                    className="mt-2 space-y-1.5 text-xs"
                    aria-label="Password requirements"
                  >
                    <RuleRow met={lenOk} label={`At least ${PASSWORD_MIN} characters`} />
                    <RuleRow met={maxOk} label={`At most ${PASSWORD_MAX} characters`} />
                    <RuleRow met={hasLower} label="One lowercase letter" />
                    <RuleRow met={hasUpper} label="One uppercase letter" />
                    <RuleRow met={hasDigit} label="One number" />
                    <RuleRow met={hasSpecial} label="One special character (!@#…)" />
                  </ul>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">
                    Mixed case, numbers, and symbols improve security. The server only requires length{" "}
                    {PASSWORD_MIN}–{PASSWORD_MAX} characters.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Confirm password</label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={PASSWORD_MIN}
                      maxLength={PASSWORD_MAX}
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-main-blue/30 focus:ring-2"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs" aria-label="Confirm password status">
                    <RuleRow met={matchOk} label="Matches new password" />
                  </ul>
                  {matchMismatch ? (
                    <p className="mt-1.5 text-xs text-red-600">Passwords do not match yet.</p>
                  ) : null}
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            )}
            <div className="mt-6 flex justify-center">
              <LegalFooterInline className="text-center text-xs text-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
