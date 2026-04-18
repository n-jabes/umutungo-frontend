import Link from "next/link";

/** Compact Terms + Privacy links for footers and forms. */
export function LegalFooterInline({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-xs text-muted"}>
      <Link href="/terms" className="font-medium text-main-blue hover:underline">
        Terms of Service
      </Link>
      <span className="mx-1.5 text-border">·</span>
      <Link href="/privacy" className="font-medium text-main-blue hover:underline">
        Privacy Policy
      </Link>
    </p>
  );
}
