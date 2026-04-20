import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
};

export function Logo({ className, showTagline = true, size = "md" }: LogoProps) {
  /*
   * Icon is sized at exactly 1.25× the font-size so it reads as a styled
   * capital letter — tall enough to have presence, short enough to feel
   * like part of the same word.  items-center vertically centres both
   * elements (industry-standard for icon + wordmark lockups).
   */
  const iconDim =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-[30px] w-[30px]" : "h-6 w-6";
  const nameSize =
    size === "sm" ? "text-[16px]" : size === "lg" ? "text-[24px]" : "text-[20px]";

  return (
    <Link href="/" className={cn("group inline-flex flex-col gap-1", className)}>

      <div className="flex items-center gap-[3px]">

        {/* ── Square U mark ── */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", iconDim)}
          aria-hidden
        >
          {/* Deep-blue field, rx=6 for a premium-square feel */}
          <rect width="40" height="40" rx="6" fill="#1e3a8a" />

          {/* Subtle top sheen — 6 % white gives just enough depth without gradients */}
          <rect x="1" y="1" width="38" height="15" rx="5" fill="white" fillOpacity="0.06" />

          {/*
           * White U — Poppins-style domed arm tops, widened inner void.
           *
           * Geometry (40 × 40 viewBox):
           *   Left arm   x  7 → 14   (7 px wide)
           *   Inner void x 14 → 26   (12 px — 20 % wider than before for legibility)
           *   Right arm  x 26 → 33   (7 px wide)
           *   Bottom bar y 26 → 32   (6 px tall)
           *   Padding    8 px all sides
           *
           * Arm domes (r = 3.5 = arm_width / 2 → fully domed, no flat section):
           *   Left  dome : M 7 11.5  Q 7 8 10.5 8  Q 14 8 14 11.5
           *   Right dome : Q 26 8 29.5 8  Q 33 8 33 11.5
           *   At each apex the outgoing and incoming Q tangents are both
           *   rightward → G1 smooth, no visible kink.
           *
           * Inner base : Q 20 29 26 26 (3 px soft curve at centre)
           * Bottom outer corners : Q bezier r = 2
           */}
          <path
            d="M 7 11.5 Q 7 8 10.5 8 Q 14 8 14 11.5 L 14 21 C 14 26 26 26 26 21 L 26 11.5 Q 26 8 29.5 8 Q 33 8 33 11.5 L 33 25 Q 33 32 26 32 L 14 32 Q 7 32 7 25 Z"
            fill="white"
          />
        </svg>

        {/* ── Wordmark ── */}
        <span className={cn("font-bold tracking-[-0.025em]", nameSize)}>
          <span style={{ color: "#1e3a8a" }}>mutungo</span>
          {/*
           * Terminal dot at 1.1 em — just enough to be intentional without
           * dominating the wordmark. verticalAlign -0.06 em sits it on the
           * optical baseline of the lowercase letters.
           */}
          <span
            style={{
              color: "#14532d",
              fontSize: "1.1em",
              lineHeight: 1,
              verticalAlign: "-0.06em",
            }}
          >.</span>
        </span>

      </div>

      {showTagline && (
        <span className="hidden sm:inline text-[10.5px] font-medium tracking-wide text-muted">
          Manage your assets. Grow your wealth.
        </span>
      )}

    </Link>
  );
}
