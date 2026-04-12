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

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-lg",
    md: "h-10 px-4 text-sm rounded-lg",
    lg: "h-11 px-5 text-sm rounded-xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
