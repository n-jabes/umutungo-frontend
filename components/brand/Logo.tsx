import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Logo({ className, showTagline = true, size = "md" }: LogoProps) {
  const markSize =
    size === "sm" ? "h-8 w-8 text-lg" : size === "lg" ? "h-12 w-12 text-2xl" : "h-10 w-10 text-xl";
  const wordSize = size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <Link href="/dashboard" className={cn("group inline-flex flex-col gap-1", className)}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl border border-border bg-card shadow-card transition-shadow duration-200 group-hover:shadow-card-hover",
            markSize,
          )}
          aria-hidden
        >
          <span
            className={cn(
              "font-semibold tracking-tight bg-gradient-to-br from-main-blue via-main-green to-main-green bg-clip-text text-transparent",
              markSize.includes("text-2xl") ? "text-2xl" : markSize.includes("text-lg") ? "text-lg" : "text-xl",
            )}
          >
            U
          </span>
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-accent-gold/25" />
        </div>
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-semibold tracking-tight text-foreground lowercase",
              wordSize,
            )}
          >
            <span className="text-main-blue">mutun</span>
            <span className="text-main-green">go</span>
          </span>
          {showTagline && (
            <span className="text-xs font-medium text-muted sm:text-[13px]">
              Manage your assets. Grow your wealth.
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
