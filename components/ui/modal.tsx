"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const max =
    size === "lg" ? "max-w-lg" : size === "sm" ? "max-w-sm" : "max-w-md";
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px] transition-opacity"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative mt-auto w-full rounded-t-2xl border border-border bg-card shadow-card sm:mt-0 sm:rounded-xl",
          max,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
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
        <div className="max-h-[min(70vh,560px)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
