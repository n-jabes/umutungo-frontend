"use client";

import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

type RowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
};

export function RowActions({ onView, onEdit, onDelete, deleteLabel = "Delete" }: RowActionsProps) {
  const [open, setOpen] = useState(false);

  function run(action?: () => void) {
    setOpen(false);
    action?.();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:bg-muted-bg hover:text-foreground"
        aria-label="Open actions menu"
      >
        <EllipsisVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            aria-label="Close actions menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg">
            <MenuItem label="View" icon={Eye} onClick={() => run(onView)} />
            <MenuItem label="Edit" icon={Pencil} onClick={() => run(onEdit)} />
            <MenuItem label={deleteLabel} icon={Trash2} danger onClick={() => run(onDelete)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  icon: Icon,
  danger,
  onClick,
}: {
  label: string;
  icon: typeof Eye;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-foreground hover:bg-muted-bg"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </button>
  );
}
