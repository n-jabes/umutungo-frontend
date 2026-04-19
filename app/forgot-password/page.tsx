"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LegalFooterInline } from "@/components/legal/legal-footer-inline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, getErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.forgotPassword({ email: email.trim() });
      setDone(true);
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
            <CardTitle className="text-lg font-semibold text-foreground">Forgot password</CardTitle>
            <p className="text-sm text-muted">
              Enter the email on your account. If it matches an account, we will send a reset link (check spam too).
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {done ? (
              <p className="text-sm text-muted">
                If an account exists for that email, we sent instructions. The link expires in two hours.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
                <div>
                  <label className="text-xs font-medium text-muted">Email</label>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-main-blue/30 focus:ring-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-main-blue hover:underline">
                Back to sign in
              </Link>
            </p>
            <div className="mt-6 flex justify-center">
              <LegalFooterInline className="text-center text-xs text-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
