"use client";

import { CornerDownLeft, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const OPEN_PLATFORM_COMMAND_PALETTE_EVENT = "umutungo:open-platform-command-palette";

export function openPlatformCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_PLATFORM_COMMAND_PALETTE_EVENT));
}

const ITEMS: Array<{
  id: string;
  label: string;
  hint: string;
  href: string;
  keywords?: string[];
}> = [
  { id: "overview", label: "Platform overview", hint: "Home", href: "/platform", keywords: ["dashboard", "ops"] },
  { id: "plans", label: "Plans catalog", hint: "Matrices", href: "/platform/plans", keywords: ["pricing", "features"] },
  {
    id: "compare",
    label: "Compare plans",
    hint: "Side by side",
    href: "/platform/plans/compare",
    keywords: ["diff", "matrix"],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    hint: "Lifecycle & events",
    href: "/platform/subscriptions",
    keywords: ["owners", "trials", "billing"],
  },
  {
    id: "accounts",
    label: "Accounts",
    hint: "Directory",
    href: "/platform/accounts",
    keywords: ["owners", "users"],
  },
];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchesItem(q: string, item: (typeof ITEMS)[number]) {
  if (!q) return true;
  const hay = [item.label, item.hint, item.href, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return hay.includes(q);
}

export function PlatformCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return ITEMS.filter((item) => matchesItem(q, item));
  }, [query]);

  useEffect(() => {
    setSelected((i) => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
  }, [filtered.length, query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      setSelected(0);
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onPaletteEvent = () => setOpen(true);
    window.addEventListener(OPEN_PLATFORM_COMMAND_PALETTE_EVENT, onPaletteEvent);
    return () => window.removeEventListener(OPEN_PLATFORM_COMMAND_PALETTE_EVENT, onPaletteEvent);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQuery("");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelected((s) => Math.min(filtered.length - 1, s + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(0, s - 1));
        return;
      }
      if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        go(filtered[selected].href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, selected, go]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-start pt-[12vh] sm:justify-center sm:pt-0 sm:bg-foreground/40 sm:px-4 sm:backdrop-blur-sm"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 hidden sm:block"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Platform quick actions"
        className={cn(
          "relative z-10 flex max-h-[min(72vh,520px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card",
          "sm:rounded-xl",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            autoComplete="off"
            aria-label="Search platform destinations"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox" aria-label="Destinations">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    i === selected ? "bg-muted-bg text-foreground" : "text-foreground hover:bg-muted-bg/70",
                  )}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => go(item.href)}
                >
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
                  </span>
                  <CornerDownLeft
                    className={cn("h-3.5 w-3.5 shrink-0 text-muted", i === selected ? "opacity-100" : "opacity-0")}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted">
          <kbd className="rounded border border-border bg-muted-bg px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
          <kbd className="ml-1 rounded border border-border bg-muted-bg px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
          <span className="mx-1.5">navigate</span>
          <kbd className="rounded border border-border bg-muted-bg px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          <span className="mx-1.5">open</span>
          <kbd className="rounded border border-border bg-muted-bg px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
          <span className="mx-1.5">close</span>
        </div>
      </div>
    </div>
  );
}
