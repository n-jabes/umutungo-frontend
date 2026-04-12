/** Matches backend Zod `decimalInput` / `optionalDecimal`: digits with optional fractional part. */
const COMPLETE_DECIMAL = /^\d+(\.\d+)?$/;

/**
 * Strips non-numeric characters except a single `.` for in-progress typing.
 */
export function filterMoneyInput(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  return s;
}

/** Trim; remove trailing `.` so "80000." validates like "80000". */
export function normalizeMoneyInput(s: string): string {
  let t = s.trim();
  if (t.endsWith(".")) t = t.slice(0, -1);
  return t;
}

export function isValidMoneyAmount(s: string): boolean {
  return s !== "" && COMPLETE_DECIMAL.test(s);
}
