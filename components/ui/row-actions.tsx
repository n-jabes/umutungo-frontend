"use client";

import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const MENU_WIDTH = 144;
const MENU_EST_HEIGHT = 132;
const VIEWPORT_PAD = 8;

type RowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
};

export function RowActions({ onView, onEdit, onDelete, deleteLabel = "Delete" }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.right - MENU_WIDTH;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    if (left + MENU_WIDTH > window.innerWidth - VIEWPORT_PAD) {
      left = window.innerWidth - MENU_WIDTH - VIEWPORT_PAD;
    }
    let top = rect.bottom + VIEWPORT_PAD;
    if (top + MENU_EST_HEIGHT > window.innerHeight - VIEWPORT_PAD) {
      top = rect.top - MENU_EST_HEIGHT - VIEWPORT_PAD;
    }
    if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function run(action?: () => void) {
    setOpen(false);
    action?.();
  }

  const menu =
    open && mounted ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[199] cursor-default bg-transparent"
          aria-label="Close actions menu"
          onClick={() => setOpen(false)}
        />
        <div
          role="menu"
          className="fixed z-[200] w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
          <MenuItem label="View" icon={Eye} onClick={() => run(onView)} />
          <MenuItem label="Edit" icon={Pencil} onClick={() => run(onEdit)} />
          <MenuItem label={deleteLabel} icon={Trash2} danger onClick={() => run(onDelete)} />
        </div>
      </>
    ) : null;

  return (
    <div className="inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:bg-muted-bg hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open actions menu"
      >
        <EllipsisVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
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
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-foreground hover:bg-muted-bg"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
