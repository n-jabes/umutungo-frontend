import Link from "next/link";
import { CURRENT_LEGAL_BUNDLE_VERSION } from "@/lib/legal";

export function LegalDocLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-medium text-main-blue hover:underline">
            ← Home
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-muted">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: 18 April 2026 · Legal bundle <span className="font-mono">{CURRENT_LEGAL_BUNDLE_VERSION}</span>
        </p>
        <aside className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-50">
          <p className="font-medium text-foreground">Important</p>
          <p className="mt-1 text-xs opacity-95">
            This text describes how the Umutungo product is intended to work today. It is <strong>not</strong> personal
            legal advice. Have a qualified attorney review these documents for Rwanda or any other jurisdiction before
            you rely on them for high-stakes decisions.
          </p>
        </aside>
        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">{children}</div>
      </article>
    </div>
  );
}
