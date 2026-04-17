const STORAGE_KEY = "umutungo:platform_two_step_confirm";

export function readPlatformTwoStepConfirm(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function writePlatformTwoStepConfirm(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}
