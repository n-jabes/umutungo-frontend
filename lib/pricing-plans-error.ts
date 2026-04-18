import { isAxiosError } from "axios";
import { ApiRequestError, getErrorMessage } from "@/lib/api";

export type PricingPlansLoadFailure = {
  title: string;
  body: string;
};

function isLikelyNetworkFailure(err: unknown): boolean {
  if (isAxiosError(err)) {
    if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") return true;
    if (!err.response && err.request) return true;
    return false;
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes("network error") ||
      m.includes("failed to fetch") ||
      m.includes("load failed") ||
      m.includes("networkerror") ||
      m.includes("err_connection_refused")
    );
  }
  return false;
}

/**
 * End-user copy when `GET /public/pricing-plans` fails (marketing + register).
 * Deploy tip: set `API_BASE_URL` or `NEXT_PUBLIC_API_URL` to your live API origin; otherwise the app may point at localhost.
 */
export function describePricingPlansLoadFailure(err: unknown): PricingPlansLoadFailure {
  const detail = getErrorMessage(err);

  if (isLikelyNetworkFailure(err)) {
    return {
      title: "We can’t show plans right now",
      body: "We couldn’t reach our servers from your browser. Check your internet connection, wait a moment, and try again. If you’re on a company network, a firewall may be blocking the request.",
    };
  }

  const status = isAxiosError(err) ? err.response?.status : undefined;
  if (status === 502 || status === 503 || status === 504) {
    return {
      title: "Plans are temporarily unavailable",
      body: "Our service is busy or restarting. Please refresh the page in a minute or two.",
    };
  }
  if (status != null && status >= 500) {
    return {
      title: "Something went wrong loading plans",
      body: "Please refresh the page. If it keeps happening, try again later or sign in if you already have an account.",
    };
  }
  if (status === 404) {
    return {
      title: "Plans aren’t available from here",
      body: "This page couldn’t find the pricing service. The site may still be finishing setup—try again later or use the link your team gave you.",
    };
  }
  if (err instanceof ApiRequestError || (status != null && status >= 400)) {
    return {
      title: "We couldn’t load plans",
      body:
        detail && detail !== "Something went wrong"
          ? detail
          : "Please refresh the page. If you already have an account, you can sign in from the top of the page.",
    };
  }

  return {
    title: "We couldn’t load plans",
    body:
      detail && detail !== "Something went wrong"
        ? detail
        : "Please refresh the page. If you already have an account, you can sign in instead.",
  };
}

export function pricingPlansSupportDetail(err: unknown): string {
  return getErrorMessage(err);
}
