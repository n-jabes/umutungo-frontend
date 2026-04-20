import type { UserPublic } from "@/lib/types";

export function getDefaultAppRoute(role: UserPublic["role"] | undefined): string {
  return role === "admin" ? "/platform" : "/dashboard";
}
