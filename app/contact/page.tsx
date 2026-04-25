"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headset,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type UseCase = "owner" | "manager" | "agent" | "other";

const INPUT =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-400 outline-none ring-main-blue/25 transition duration-200 focus:border-main-blue/50 focus:ring-2";

function Req() {
  return <span className="ml-0.5 text-red-500">*</span>;
}

function FeatureRow({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-white/[0.12] bg-white/[0.07] px-3 py-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.12]">
        <Icon className="h-3 w-3 text-white/90" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-xs font-semibold text-white">{title}</p>
        <p className="text-[11px] leading-relaxed text-white/65">{body}</p>
      </div>
    </li>
  );
}

function StatCard({ stat, label }: { stat: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-3">
      <p className="text-lg font-semibold tracking-tight text-white">{stat}</p>
      <p className="mt-0.5 text-[11px] text-white/65">{label}</p>
    </div>
  );
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [useCase, setUseCase] = useState<UseCase>("owner");
  const [website, setWebsite] = useState("");
  const [formStartedAt] = useState<number>(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSubmitting(true);
    try {
      await api.submitPublicContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
        useCase,
        website,
        formStartedAt,
      });
      setSent(true);
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setSubject("");
      setMessage("");
      setUseCase("owner");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Root: natural scroll on mobile, locked viewport on desktop */
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden lg:flex-row">
      {/* ──────────────────────────────────────────────
          LEFT  — brand panel
          Mobile  : compact hero header
          Desktop : full-height, no overflow
      ────────────────────────────────────────────── */}
      <aside className="relative flex flex-col overflow-hidden bg-main-blue px-6 py-5 text-white sm:px-8 sm:py-7 lg:h-full lg:w-[400px] lg:shrink-0 xl:w-[460px] xl:px-10 xl:py-9">
        {/* White grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(255,255,255,0.055) 1px,transparent 1px)," +
              "linear-gradient(to bottom,rgba(255,255,255,0.055) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Gold accent stripe */}
        <div className="pointer-events-none absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-[var(--accent-gold)] via-[var(--accent-gold)]/50 to-transparent" />
        {/* Ambient glow */}
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />

        {/* ── Content wrapper — justify-between pushes testimonial to bottom on desktop ── */}
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex flex-col gap-4 lg:gap-5">
            {/* Logo + home link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 40 40" fill="none" className="h-7 w-7 shrink-0" aria-hidden>
                  <rect width="40" height="40" rx="6" fill="white" fillOpacity="0.14" />
                  <path
                    d="M 7 11.5 Q 7 8 10.5 8 Q 14 8 14 11.5 L 14 21 C 14 26 26 26 26 21 L 26 11.5 Q 26 8 29.5 8 Q 33 8 33 11.5 L 33 25 Q 33 32 26 32 L 14 32 Q 7 32 7 25 Z"
                    fill="white"
                  />
                </svg>
                <span className="text-[19px] font-bold tracking-[-0.025em]">
                  <span className="text-white">mutungo</span>
                  <span
                    className="font-bold"
                    style={{ color: "var(--accent-gold)", fontSize: "1.1em", lineHeight: 1, verticalAlign: "-0.06em" }}
                  >
                    .
                  </span>
                </span>
              </div>
              <Link
                href="/"
                className="flex items-center gap-1 rounded-lg border border-white/[0.15] bg-white/[0.08] px-2 py-1 text-xs font-medium text-white/75 transition hover:bg-white/[0.13] hover:text-white"
              >
                <ArrowLeft className="h-3 w-3" />
                Home
              </Link>
            </div>

            {/* Hero copy — always visible */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/[0.10] px-2.5 py-0.5 text-[11px] font-medium text-white/90">
                <Sparkles className="h-3 w-3" style={{ color: "var(--accent-gold)" }} />
                Early users welcome
              </span>
              <h1 className="mt-3 text-[1.45rem] font-semibold leading-[1.15] tracking-tight sm:text-[1.6rem] xl:text-[1.85rem]">
                Get a direct line
                <br />
                to the team.
              </h1>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/75">
                Setting up for the first time, evaluating plans, or need onboarding help? We read every message and reply personally.
              </p>
            </div>

            {/* Feature list — desktop only */}
            <ul className="hidden space-y-2 lg:block">
              <FeatureRow icon={Zap} title="Fast onboarding guidance" body="We help you configure your first portfolio setup." />
              <FeatureRow icon={Mail} title="Direct email response" body="Replies go straight to your inbox, from a human." />
              <FeatureRow icon={Headset} title="Phone follow-up available" body="Leave your number for faster follow-through." />
            </ul>

            {/* Stats — desktop only */}
            <div className="hidden grid-cols-2 gap-2 lg:grid">
              <StatCard stat="< 24h" label="Avg. first reply" />
              <StatCard stat="100%" label="Human responses" />
            </div>
          </div>

          {/* Testimonial — desktop only, pinned to bottom */}
          <div className="hidden pt-3 lg:block">
            <div className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-3">
              <div className="mb-2 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-2.5 w-2.5 fill-current" style={{ color: "var(--accent-gold)" }} />
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-white/80">
                &ldquo;Umutungo helped us move three buildings into a single workspace in one weekend. Support was clear and fast.&rdquo;
              </p>
              <p className="mt-2 text-[11px] font-semibold text-white/90">Jeanne M. &mdash; Portfolio manager, Kigali</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────
          RIGHT — form area
          Mobile  : natural page flow
          Desktop : takes remaining width, no overflow
      ────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col bg-[#f8fafc]">
        {/* Centered form */}
        <div className="flex flex-1 items-start justify-center px-5 py-5 sm:px-8 sm:py-6 md:px-12 xl:px-14 xl:py-8">
          <div className="w-full max-w-xl">
            {/* Form header */}
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-main-blue">
              Send a message
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Contact Umutungo
            </h2>
            <p className="mt-1 text-xs text-muted">
              Fill in the form below — our team replies within one business day.
            </p>

            {/* Gold + blue divider */}
            <div className="my-3 flex h-px w-full overflow-hidden rounded-full">
              <div className="h-full w-10 bg-[var(--accent-gold)]" />
              <div className="h-full flex-1 bg-gradient-to-r from-main-blue/20 to-transparent" />
            </div>

            <form className="space-y-3 lg:space-y-4 mt-6" onSubmit={(e) => void onSubmit(e)}>
              {/* Row 1: name + email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground/70">
                    Your name
                    <Req />
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={INPUT}
                    placeholder="Jean Mukamana"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70">
                    Email address
                    <Req />
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Row 2: company + phone + role */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/70">Company</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={INPUT}
                    placeholder="Optional"
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70">
                    Phone{" "}
                    <span className="text-[10px] font-normal text-muted">(faster reach)</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250…"
                      className={cn(INPUT, "pl-9")}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70">I am a…</label>
                  <select
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value as UseCase)}
                    className={INPUT}
                  >
                    <option value="owner">Property owner</option>
                    <option value="manager">Portfolio manager</option>
                    <option value="agent">Field agent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-foreground/70">
                  Subject
                  <Req />
                </label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={INPUT}
                  placeholder="How can we help you?"
                />
              </div>

              {/* Message */}
              <div>
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-foreground/70">
                    Message
                    <Req />
                  </label>
                  <span className={cn("text-[10px]", message.length > 4800 ? "text-amber-600" : "text-muted")}>
                    {message.length} / 5000
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={cn(INPUT, "resize-none")}
                  placeholder="Describe your setup, question, or onboarding goal…"
                />
              </div>

              {/* Honeypot — must stay empty */}
              <div className="hidden" aria-hidden="true">
                <input
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {/* Success */}
              {sent ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-900">Message sent successfully</p>
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      We&apos;ll reply to your inbox within one business day.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="ml-1 shrink-0 rounded p-0.5 text-emerald-500 transition hover:bg-emerald-100 hover:text-emerald-700"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {/* Error */}
              {error ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <p className="flex-1 text-sm text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="ml-1 shrink-0 rounded p-0.5 text-red-400 transition hover:bg-red-100 hover:text-red-600"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {/* Submit row */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full gap-2 sm:w-auto sm:px-8"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {submitting ? "Sending…" : "Send message"}
                </Button>
                <p className="text-xs text-muted">Rate-limited · Bot-protected</p>
              </div>
            </form>

            {/* Footer links */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
              <Link href="/login" className="font-medium transition hover:text-foreground">
                Sign in
              </Link>
              <span className="text-border">·</span>
              <Link href="/register" className="font-medium transition hover:text-foreground">
                Create account
              </Link>
              <span className="text-border">·</span>
              <Link href="/terms" className="transition hover:text-foreground">
                Terms
              </Link>
              <span className="text-border">·</span>
              <Link href="/privacy" className="transition hover:text-foreground">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
