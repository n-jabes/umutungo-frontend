"use client";

import { AlertTriangle, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/**
 * Confirmation for sensitive platform operations. Optional typed phrase when
 * `twoStepRequired` is true (platform-wide preference from localStorage).
 */
export function PlatformSafetyDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  detail,
  confirmLabel = "Confirm",
  variant = "caution",
  isPending = false,
  twoStepRequired,
  typedPhraseLabel,
  typedPhraseExpected,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  variant?: "caution" | "danger";
  isPending?: boolean;
  twoStepRequired: boolean;
  typedPhraseLabel: string;
  /** When `twoStepRequired`, confirmation is enabled only when input matches this string (trimmed). */
  typedPhraseExpected: string;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const phraseOk =
    !twoStepRequired || !typedPhraseExpected || typed.trim() === typedPhraseExpected.trim();

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl p-4",
            variant === "danger"
              ? "bg-red-600 text-white"
              : "border border-main-blue/20 bg-blue-soft text-foreground",
          )}
        >
          {variant === "danger" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-white" strokeWidth={2} />
          ) : (
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-main-blue" strokeWidth={1.75} />
          )}
          <div className="space-y-1">
            <p className={cn("text-sm font-medium", variant === "danger" ? "text-white" : "text-foreground")}>
              {description}
            </p>
            {detail ? (
              <p className={cn("text-xs", variant === "danger" ? "text-red-100" : "text-muted")}>{detail}</p>
            ) : null}
            {variant === "danger" ? (
              <p className="text-xs font-semibold text-red-200">This action has lasting billing and access impact.</p>
            ) : (
              <p className="text-xs text-muted">You can cancel if you opened this by mistake.</p>
            )}
          </div>
        </div>

        {twoStepRequired ? (
          <label className="block text-xs font-medium text-muted">
            {typedPhraseLabel}
            <input
              className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={typedPhraseExpected}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            disabled={isPending || !phraseOk}
            onClick={onConfirm}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
