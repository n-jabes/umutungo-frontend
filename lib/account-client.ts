/**
 * Authenticated account/profile HTTP calls.
 * Lives in its own module so we never attach `patchMe`-style helpers to the giant `api` object
 * (avoids bundler/HMR edge cases and keeps a clear boundary).
 */
import type { ApiErrorPayload } from "./types";
import type { UserPublic } from "./types";
import { ApiRequestError, rawApi } from "./api";

type Ok<T> = { success: true; data: T };
type Err = ApiErrorPayload;

function unwrap<T>(body: Ok<T> | Err): T {
  if ("error" in body && body.error) {
    throw new ApiRequestError(body.message, { code: body.code, details: body.details });
  }
  if ("success" in body && body.success) return body.data;
  throw new Error("Unexpected API response");
}

export async function updateMyAccountProfile(body: {
  name?: string;
  email?: string | null;
  phone?: string | null;
}) {
  const { data } = await rawApi.patch<Ok<UserPublic>>("/users/me", body);
  return unwrap(data);
}

export async function deleteMyAccount(payload: { password: string }) {
  const { data } = await rawApi.request<Ok<{ deleted: boolean }>>({
    method: "DELETE",
    url: "/users/me",
    data: payload,
  });
  return unwrap(data);
}
