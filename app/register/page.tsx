"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Phone, UserRound, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/api";
import {
  PASSWORD_RULE_LABELS,
  evaluatePassword,
  passwordMeetsAllRules,
} from "@/lib/password-rules";
import {
  isValidRwandaPhoneInput,
  normalizeRwandaPhone,
  rwandaPhoneErrorMessage,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const pwdChecks = useMemo(() => evaluatePassword(password), [password]);
  const pwdOk = passwordMeetsAllRules(pwdChecks);
  const confirmOk = confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() && !phone.trim()) {
      setError("Provide an email or phone number.");
      return;
    }
    if (phone.trim()) {
      if (!isValidRwandaPhoneInput(phone)) {
        setError(rwandaPhoneErrorMessage());
        return;
      }
    }
    if (!pwdOk) {
      setError("Password does not meet all requirements below.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const normalizedPhone = phone.trim() ? normalizeRwandaPhone(phone) : null;
      await register({
        name: name.trim(),
        password,
        email: email.trim() || undefined,
        phone: normalizedPhone ?? undefined,
      });
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
        <Logo className="mb-10" />
        <Card className="border-border p-0 shadow-card">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardTitle className="text-lg font-semibold text-foreground">Create owner account</CardTitle>
            <p className="text-sm text-muted">Start tracking real assets in minutes.</p>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <div>
                <label className="text-xs font-medium text-muted">Full name</label>
                <div className="relative mt-1">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    required
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-main-blue/30 focus:ring-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Email (optional if phone set)</label>
                <input
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-main-blue/30 focus:ring-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Phone (optional if email set)</label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+250788123456 or 0788123456"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none ring-main-blue/30 focus:ring-2"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  If provided, use international (+250…) or local (07…) format.
                </p>
                {phone.trim() && !isValidRwandaPhoneInput(phone) ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
                    {rwandaPhoneErrorMessage()}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Password</label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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
                <ul className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted-bg/40 px-3 py-2.5">
                  {PASSWORD_RULE_LABELS.map(({ key, label }) => {
                    const ok = pwdChecks[key];
                    const touched = password.length > 0;
                    return (
                      <li
                        key={key}
                        className={cn(
                          "flex items-center gap-2 text-xs transition-colors",
                          !touched && "text-muted",
                          touched && ok && "font-medium text-main-green",
                          touched && !ok && "text-muted",
                        )}
                      >
                        {touched ? (
                          ok ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-main-green" strokeWidth={2.5} />
                          ) : (
                            <X className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
                          )
                        ) : (
                          <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                        )}
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Confirm password</label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    className={cn(
                      "w-full rounded-lg border bg-background py-2.5 pl-10 pr-11 text-sm outline-none ring-main-blue/30 focus:ring-2",
                      confirmPassword.length > 0 &&
                        (confirmOk ? "border-main-green/50" : "border-red-300"),
                      confirmPassword.length === 0 && "border-border",
                    )}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && !confirmOk ? (
                  <p className="mt-1 text-xs text-red-600">Must match the password above.</p>
                ) : confirmOk ? (
                  <p className="mt-1 text-xs font-medium text-main-green">Passwords match.</p>
                ) : null}
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-main-blue hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
