/** Rwanda mobile: +2507XXXXXXXX or 07XXXXXXXX → stored as 2507XXXXXXXX (no +). */

const WITH_PLUS = /^\+250(7\d{8})$/;
const WITH_250 = /^250(7\d{8})$/;
const LOCAL_07 = /^07(\d{8})$/;

export function normalizeRwandaPhone(input: string): string | null {
  const raw = input.trim().replace(/\s/g, "");
  if (!raw) return null;
  let m = raw.match(WITH_PLUS);
  if (m) return `250${m[1]}`;
  m = raw.match(WITH_250);
  if (m) return raw;
  m = raw.match(LOCAL_07);
  if (m) return `2507${m[1]}`;
  return null;
}

export function isValidRwandaPhoneInput(input: string): boolean {
  return normalizeRwandaPhone(input) !== null;
}

export function rwandaPhoneErrorMessage(): string {
  return "Enter a Rwanda number starting with +250 or 07 (e.g. +250788123456 or 0788123456).";
}
