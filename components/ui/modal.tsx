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
    /* Full-screen overlay — acts as backdrop on sm+ */
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      {/* Tap-outside-to-close (sm+ only; on mobile the close button is used) */}
      <button
        type="button"
        className="absolute inset-0 hidden sm:block"
        aria-label="Close dialog"
        onClick={onClose}
      />

      {/*
        Mobile  : absolute inset-0 → covers the full screen, no gap at top
        sm+     : relative, centered, max-w, rounded, shadow
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "absolute inset-0 z-10 flex flex-col bg-card",
          "sm:relative sm:inset-auto sm:flex sm:max-h-[90vh] sm:w-full sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-2xl",
          sizeClass[size],
        )}
      >
        {/* Header */}
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

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
