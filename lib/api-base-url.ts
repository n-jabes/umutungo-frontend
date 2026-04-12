/**
 * Normalizes API base URL. Host-only values get https:// so axios does not treat them as paths on the current origin.
 */
export function normalizeApiBaseUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "http://localhost:4000";
  const noTrailingSlash = t.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(noTrailingSlash)) return noTrailingSlash;
  return `https://${noTrailingSlash.replace(/^\/+/, "")}`;
}

const DEFAULT = "http://localhost:4000";

/** Server-only resolution: prefers API_BASE_URL (runtime, not client-inlined) then NEXT_PUBLIC_API_URL. */
export function resolveApiBaseForClientInjection(): string {
  const serverOnly = process.env.API_BASE_URL?.trim();
  if (serverOnly) return normalizeApiBaseUrl(serverOnly);
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (pub) return normalizeApiBaseUrl(pub);
  return DEFAULT;
}
