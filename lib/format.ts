const currency =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_CURRENCY
    ? process.env.NEXT_PUBLIC_CURRENCY
    : "RWF";

/** Prefer Rwanda locale when displaying Francs for familiar grouping and symbols. */
const moneyLocale = currency === "RWF" ? "en-RW" : undefined;

export function formatMoney(value: number | string | null | undefined): string {
  const n = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(moneyLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatCompactMoney(value: number | string | null | undefined): string {
  const n = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(moneyLocale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatPercent(rate: number): string {
  if (Number.isNaN(rate)) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}

export function currentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthOffsets(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}
