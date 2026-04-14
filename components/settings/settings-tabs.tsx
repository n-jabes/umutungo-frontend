"use client";

import { cn } from "@/lib/utils";

export type SettingsTabItem = { id: string; label: string };

export function SettingsTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: SettingsTabItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Settings sections"
      className="flex flex-wrap gap-0 border-b border-border"
    >
      {tabs.map((t) => {
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`settings-tab-${t.id}`}
            aria-controls={`settings-panel-${t.id}`}
            className={cn(
              "relative min-h-[44px] px-5 py-3 text-sm font-medium transition-colors",
              selected
                ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-main-blue"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
