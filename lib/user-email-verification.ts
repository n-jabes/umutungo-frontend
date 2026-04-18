import type { UserPublic } from "@/lib/types";

/** True when the account has an email on file that is not yet verified (Resend flow). */
export function userNeedsEmailVerification(user: UserPublic | null | undefined): boolean {
  return Boolean(user?.email && !user.emailVerifiedAt);
}
