"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  detail,
  confirmLabel = "Delete",
  isPending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  /** Optional extra detail line rendered below the main description */
  detail?: string;
  confirmLabel?: string;
  isPending?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        {/* Warning block — solid red so the danger is unmistakable */}
        <div className="flex items-start gap-3 rounded-xl bg-red-600 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-white" strokeWidth={2} />
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">{description}</p>
            {detail ? (
              <p className="text-xs text-red-100">{detail}</p>
            ) : null}
            <p className="text-xs font-semibold text-red-200">
              This action is irreversible and cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700 active:bg-red-800 disabled:opacity-60"
          >
            {isPending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
