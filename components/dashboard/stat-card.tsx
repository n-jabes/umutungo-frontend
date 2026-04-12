import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "green" | "blue" | "gold" | "neutral";
}) {
  const tones = {
    green: "text-main-green bg-success-soft",
    blue: "text-main-blue bg-blue-soft",
    gold: "text-main-green bg-gold-soft ring-1 ring-accent-gold/30",
    neutral: "text-muted bg-muted-bg",
  };
  return (
    <Card className="p-5">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
            <p
              className={cn(
                "mt-3 text-2xl font-semibold tracking-tight tabular-nums-fin text-foreground sm:text-3xl",
              )}
            >
              {value}
            </p>
            {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              tones[tone],
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
