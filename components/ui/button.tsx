import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-main-blue text-white shadow-sm hover:bg-main-blue/90 active:scale-[0.99]",
  secondary:
    "border border-border bg-card text-foreground hover:bg-muted-bg active:scale-[0.99]",
  ghost: "text-main-blue hover:bg-blue-soft",
  danger: "bg-red-600 text-white hover:bg-red-600/90",
  gold: "bg-gold-soft text-main-green border border-accent-gold/40 hover:border-accent-gold/70",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-sm rounded-xl",
} as const;

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50";

/** Use on `<Link>` when you need the same look as `<Button>` (this `Button` does not support `asChild`). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
} = {}) {
  return cn(buttonBase, variants[variant], sizes[size], className);
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(buttonBase, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
