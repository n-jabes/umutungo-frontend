"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, getErrorMessage, setSessionTokens } from "@/lib/api";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This link is missing a token. Open the link from your email, or request a new one from the app after you sign in.");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      try {
        const res = await api.verifyEmail({ token });
        if (cancelled) return;
        setSessionTokens(res.accessToken, res.refreshToken);
        setStatus("done");
        setMessage("Your email is verified. Redirecting to your workspace…");
        router.replace("/dashboard");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(getErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <Card className="w-full max-w-md border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Email verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
            </div>
          ) : (
            <p className={`text-sm ${status === "error" ? "text-red-600" : "text-muted"}`}>{message}</p>
          )}
          {status === "error" ? (
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className={buttonClassName({ variant: "secondary" })}>
                Sign in
              </Link>
              <Link href="/" className={buttonClassName({ variant: "primary" })}>
                Home
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-main-blue" strokeWidth={1.75} />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
