"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LegalFooterInline } from "@/components/legal/legal-footer-inline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/api";
import {
  isValidRwandaPhoneInput,
  normalizeRwandaPhone,
  rwandaPhoneErrorMessage,
} from "@/lib/phone";

function LoginContent() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resetBanner, setResetBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "1") setResetBanner(true);
  }, [searchParams]);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  useEffect(() => {
    if (mode !== "phone") {
      setPhoneHint(null);
      return;
    }
    const t = phone.trim();
    if (!t) {
      setPhoneHint(null);
      return;
    }
    setPhoneHint(isValidRwandaPhoneInput(t) ? null : rwandaPhoneErrorMessage());
  }, [phone, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "phone") {
      const normalized = normalizeRwandaPhone(phone);
      if (!normalized) {
        setError(rwandaPhoneErrorMessage());
        return;
      }
      setPending(true);
      try {
        await login({ phone: normalized, password });
        router.replace("/dashboard");
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setPending(false);
      }
      return;
    }
    setPending(true);
    try {
      await login({ email: email.trim(), password });
      router.replace("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!ready || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-10 sm:items-center sm:justify-center sm:py-0">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Umutungo home">
            <Logo />
          </Link>
          <Link href="/" className="text-xs font-medium text-muted hover:text-foreground">
            ← Home
          </Link>
        </div>
        <Card className="border-border p-0 shadow-card">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardTitle className="text-lg font-semibold text-foreground">Sign in</CardTitle>
            <p className="text-sm text-muted">Access your Umutungo workspace.</p>
          </CardHeader>
          <CardContent className="p-6">
            {resetBanner ? (
              <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                Your password was updated. Sign in with your new password.
              </p>
            ) : null}
            <div className="mb-6 flex rounded-lg border border-border bg-muted-bg/40 p-1 text-xs font-medium">
              <button
                type="button"
                className={
                  mode === "email"
                    ? "flex-1 rounded-md bg-card py-2 text-main-blue shadow-sm"
                    : "flex-1 rounded-md py-2 text-muted transition hover:text-foreground"
                }
                onClick={() => {
                  setMode("email");
                  setError(null);
                }}
              >
                Email
              </button>
              <button
                type="button"
                className={
                  mode === "phone"
                    ? "flex-1 rounded-md bg-card py-2 text-main-blue shadow-sm"
                    : "flex-1 rounded-md py-2 text-muted transition hover:text-foreground"
                }
                onClick={() => {
                  setMode("phone");
                  setError(null);
                }}
              >
                Phone
              </button>
            </div>
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              {mode === "email" ? (
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
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted">Phone</label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+250788123456 or 0788123456"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-main-blue/30 focus:ring-2"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                    Rwanda numbers: international (+250…) or local (07…).
                  </p>
                  {phoneHint ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">{phoneHint}</p>
                  ) : null}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted">Password</label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
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
                {mode === "email" ? (
                  <p className="mt-2 text-right text-xs">
                    <Link href="/forgot-password" className="font-medium text-main-blue hover:underline">
                      Forgot password?
                    </Link>
                  </p>
                ) : null}
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              New to Umutungo?{" "}
              <Link href="/register" className="font-medium text-main-blue hover:underline">
                Create an account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
