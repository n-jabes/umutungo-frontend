"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClass = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" };

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  size = "md",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}) {
  if (!open) return null;

  return (
    /*
     * Outer: fills the viewport via `fixed inset-0`.
     *
     * Mobile (<sm):  transparent wrapper — no dark overlay, no padding,
     *                just a flex column so the dialog fills the screen.
     * sm+:           gains the dark/blurred backdrop and centres the dialog.
     */
    <div
      className="fixed inset-0 z-[100] flex flex-col
                 sm:items-center sm:justify-center
                 sm:bg-slate-900/50 sm:p-4 sm:backdrop-blur-sm"
    >
      {/* Tap-outside-to-close layer — only needed on sm+ where there IS a visible backdrop */}
      <button
        type="button"
        className="absolute inset-0 hidden sm:block"
        aria-label="Close dialog"
        onClick={onClose}
      />

      {/*
       * Dialog panel
       *
       * Mobile: `h-full w-full` inside the transparent flex wrapper → full-screen card,
       *         no dark area visible anywhere.
       * sm+:    auto height, max-w capped, rounded corners, centred by the flex parent.
       */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex h-full w-full flex-col bg-card",
          "sm:z-10 sm:h-auto sm:max-h-[90vh] sm:rounded-xl",
          "sm:border sm:border-gray-200 sm:shadow-2xl",
          sizeClass[size],
        )}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-muted-bg hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
