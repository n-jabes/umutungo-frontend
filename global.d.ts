export {};

declare global {
  interface Window {
    /** Set by `app/layout.tsx` from server env so the API client uses the current base URL in dev. */
    __UMUTUNGO_API_BASE__?: string;
  }
}
