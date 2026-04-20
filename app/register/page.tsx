"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Phone, UserRound, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogPlanCards } from "@/components/marketing/catalog-plan-cards";
import { PricingPlansLoadError } from "@/components/marketing/pricing-plans-load-error";
import { MockPaymentPanel } from "@/components/marketing/mock-payment-panel";
import { useAuth } from "@/contexts/auth-context";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
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
import { CURRENT_LEGAL_BUNDLE_VERSION } from "@/lib/legal";
import { LegalFooterInline } from "@/components/legal/legal-footer-inline";
import { useQuery } from "@tanstack/react-query";

type Step = 1 | 2 | 3;

function RegisterFlow() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");

  const [step, setStep] = useState<Step>(1);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const plansQuery = useQuery({
    queryKey: queryKeys.publicPricingPlans,
    queryFn: () => api.getPublicPricingPlans(),
    staleTime: 5 * 60_000,
  });
  const platformSettingsQuery = useQuery({
    queryKey: queryKeys.publicPlatformSettings,
    queryFn: () => api.getPublicPlatformSettings(),
    staleTime: 5 * 60_000,
  });

  const plans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data]);
  const selectedPlan = useMemo(
    () => (selectedPlanKey ? plans.find((p) => p.planKey === selectedPlanKey) ?? null : null),
    [plans, selectedPlanKey],
  );
  const selfRegistrationEnabled = platformSettingsQuery.data?.selfRegistrationEnabled ?? true;

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  useEffect(() => {
    if (!planFromUrl || selectedPlanKey) return;
    const keys = new Set(plans.map((p) => p.planKey));
    if (keys.has(planFromUrl)) setSelectedPlanKey(planFromUrl);
  }, [planFromUrl, plans, selectedPlanKey]);

  const pwdChecks = useMemo(() => evaluatePassword(password), [password]);
  const pwdOk = passwordMeetsAllRules(pwdChecks);
  const confirmOk = confirmPassword.length > 0 && password === confirmPassword;

  function goNextFromPlan() {
    setError(null);
    if (!selectedPlanKey) {
      setError("Select a plan to continue.");
      return;
    }
    setStep(2);
  }

  function goNextFromDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() && !phone.trim()) {
      setError("Provide an email or phone number.");
      return;
    }
    if (phone.trim() && !isValidRwandaPhoneInput(phone)) {
      setError(rwandaPhoneErrorMessage());
      return;
    }
    if (!pwdOk) {
      setError("Password does not meet all requirements below.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!legalAccepted) {
      setError("Please read and accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setStep(3);
  }

  async function completeSignup() {
    if (!selectedPlanKey) return;
    setError(null);
    setPending(true);
    try {
      const normalizedPhone = phone.trim() ? normalizeRwandaPhone(phone) : null;
      await register({
        name: name.trim(),
        password,
        email: email.trim() || undefined,
        phone: normalizedPhone ?? undefined,
        planKey: selectedPlanKey,
        termsAccepted: true,
        termsVersion: CURRENT_LEGAL_BUNDLE_VERSION,
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

  const stepTitle =
    step === 1 ? "Choose your plan" : step === 2 ? "Account details" : "Checkout (preview)";

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className={cn("rounded-full px-2 py-1", step >= 1 ? "bg-main-blue text-white" : "bg-muted-bg")}>
              1 Plan
            </span>
            <span className="text-border">→</span>
            <span className={cn("rounded-full px-2 py-1", step >= 2 ? "bg-main-blue text-white" : "bg-muted-bg")}>
              2 Account
            </span>
            <span className="text-border">→</span>
            <span className={cn("rounded-full px-2 py-1", step >= 3 ? "bg-main-blue text-white" : "bg-muted-bg")}>
              3 Pay
            </span>
          </div>
        </div>

        <Card className="border-border shadow-card">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardTitle className="text-lg font-semibold text-foreground">{stepTitle}</CardTitle>
            <p className="text-sm text-muted">
              {step === 1
                ? "Your subscription is created from the catalog tier you select. Limits match the published matrix."
                : step === 2
                  ? "We will create your owner workspace after checkout."
                  : "Simulate payment — your plan is written to the database when you finish."}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {platformSettingsQuery.isLoading || plansQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
              </div>
            ) : platformSettingsQuery.isError ? (
              <PricingPlansLoadError
                error={platformSettingsQuery.error}
                onRetry={() => platformSettingsQuery.refetch()}
                retrying={platformSettingsQuery.isFetching}
                align="start"
              />
            ) : !selfRegistrationEnabled ? (
              <div className="space-y-4">
                <p className="text-sm text-foreground">
                  New account self-registration is currently disabled by the platform administrator.
                </p>
                <p className="text-sm text-muted">
                  To get access, ask an admin to create your account from the dashboard, then use the setup link they
                  share with you.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/login">
                    <Button type="button">Go to sign in</Button>
                  </Link>
                  <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
                    ← Back to home
                  </Link>
                </div>
              </div>
            ) : plansQuery.isError ? (
              <PricingPlansLoadError
                error={plansQuery.error}
                onRetry={() => plansQuery.refetch()}
                retrying={plansQuery.isFetching && !plansQuery.isLoading}
                align="start"
              />
            ) : step === 1 ? (
              <div className="space-y-6">
                <CatalogPlanCards
                  plans={plans}
                  mode="picker"
                  selectedPlanKey={selectedPlanKey}
                  onSelectPlan={setSelectedPlanKey}
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex justify-end gap-3">
                  <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
                    ← Back to home
                  </Link>
                  <Button type="button" onClick={goNextFromPlan}>
                    Continue
                  </Button>
                </div>
              </div>
            ) : step === 2 ? (
              <form className="space-y-4" onSubmit={(e) => void goNextFromDetails(e)}>
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
                  {phone.trim() && !isValidRwandaPhoneInput(phone) ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">{rwandaPhoneErrorMessage()}</p>
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
                      autoComplete="new-password"
                      required
                      className={cn(
                        "w-full rounded-lg border bg-background py-2.5 pl-10 pr-11 text-sm outline-none ring-main-blue/30 focus:ring-2",
                        confirmPassword.length > 0 && (confirmOk ? "border-main-green/50" : "border-red-300"),
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
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted-bg/30 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => setLegalAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-main-blue focus:ring-main-blue"
                  />
                  <span className="text-xs leading-relaxed text-muted">
                    I have read and agree to the{" "}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-main-blue hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-main-blue hover:underline">
                      Privacy Policy
                    </Link>
                    . (Bundle <span className="font-mono text-foreground">{CURRENT_LEGAL_BUNDLE_VERSION}</span>)
                  </span>
                </label>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex justify-between gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit">Continue to checkout</Button>
                </div>
                <LegalFooterInline />
              </form>
            ) : selectedPlan ? (
              <div>
                {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
                <MockPaymentPanel
                  plan={selectedPlan}
                  pending={pending}
                  onSimulateSuccess={() => void completeSignup()}
                  onBack={() => setStep(2)}
                />
              </div>
            ) : (
              <p className="text-sm text-muted">Select a plan from step 1.</p>
            )}

            {step !== 2 ? (
              <p className="mt-8 text-center text-sm text-muted">
                Already registered?{" "}
                <Link href="/login" className="font-medium text-main-blue hover:underline">
                  Sign in
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
        </div>
      }
    >
      <RegisterFlow />
    </Suspense>
  );
}
