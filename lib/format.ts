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

/** First calendar day of a billing month `YYYY-MM` as `YYYY-MM-DD`. */
export function firstDayOfMonthYm(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return `${ym}-01`;
  }
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Last calendar day of a billing month `YYYY-MM` as `YYYY-MM-DD`. */
export function lastDayOfMonthYm(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return `${ym}-28`;
  }
  const d = new Date(y, m, 0);
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${String(m).padStart(2, "0")}-${dd}`;
}

/** Human-readable inclusive rent coverage (e.g. for tables and summaries). */
export function formatPaymentCoverage(periodStartDate: string, periodEndDate: string): string {
  const s = periodStartDate?.slice(0, 10) ?? "";
  const e = periodEndDate?.slice(0, 10) ?? "";
  if (!s || !e) return "—";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const ds = new Date(`${s}T12:00:00.000Z`);
  const de = new Date(`${e}T12:00:00.000Z`);
  if (Number.isNaN(ds.getTime()) || Number.isNaN(de.getTime())) return `${s} → ${e}`;
  return `${ds.toLocaleDateString(undefined, opts)} – ${de.toLocaleDateString(undefined, opts)}`;
}

/** Table cell: prefer interval coverage; fall back to legacy `month` (YYYY-MM). */
export function paymentCoverageLabel(p: {
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  month?: string | null;
}): string {
  if (p.periodStartDate && p.periodEndDate) {
    return formatPaymentCoverage(p.periodStartDate, p.periodEndDate);
  }
  if (p.month) return p.month;
  return "—";
}

/** Previous billing month `YYYY-MM`. */
export function previousMonthYm(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

/** Inclusive billing-month range covering the last `count` calendar months (including current). */
export function monthRangeLastN(count: number): { from: string; to: string } {
  const months = monthOffsets(count);
  return { from: months[0]!, to: months[months.length - 1]! };
}

/** January of current year through current month (YYYY-MM). */
export function monthRangeYearToDate(): { from: string; to: string } {
  const to = currentMonth();
  const d = new Date();
  const from = `${d.getFullYear()}-01`;
  return { from, to };
}

/** Inclusive count of billing months between two YYYY-MM values (same month → 1). */
export function monthSpanInclusive(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

export function formatTimeAgo(timestamp: number | null | undefined): string {
  if (!timestamp || Number.isNaN(timestamp)) return "Not synced yet";
  const diff = Math.max(0, Date.now() - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
