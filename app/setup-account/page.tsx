"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/api";
import {
  PASSWORD_RULE_LABELS,
  evaluatePassword,
  passwordMeetsAllRules,
} from "@/lib/password-rules";
import { cn } from "@/lib/utils";

function SetupAccountContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const router = useRouter();
  const { setupPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwdChecks = useMemo(() => evaluatePassword(password), [password]);
  const pwdOk = passwordMeetsAllRules(pwdChecks);
  const confirmOk = confirmPassword.length > 0 && password === confirmPassword;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return setError("Invalid setup link.");
    if (!pwdOk) return setError("Password does not meet all requirements below.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setPending(true);
    try {
      await setupPassword({ token, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your account password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted">Password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-11 text-sm outline-none ring-main-blue/30 focus:ring-2"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
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
                  className={cn(
                    "w-full rounded-lg border bg-background py-2.5 pl-10 pr-11 text-sm outline-none ring-main-blue/30 focus:ring-2",
                    confirmPassword.length > 0 && (confirmOk ? "border-main-green/50" : "border-red-300"),
                    confirmPassword.length === 0 && "border-border",
                  )}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
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
              {pending ? "Setting up..." : "Activate account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Set your account password</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">Preparing secure setup...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SetupAccountContent />
    </Suspense>
  );
}
