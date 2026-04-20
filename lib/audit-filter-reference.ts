/**
 * Human-readable hints for audit log filters. Kept in sync with `writeAudit` usage in Backend `src/services`.
 * When new audit actions ship, extend these lists so the UI stays helpful.
 */

export type AuditEntityTypeOption = { type: string; about: string };

export const AUDIT_ENTITY_TYPE_OPTIONS: readonly AuditEntityTypeOption[] = [
  { type: "User", about: "People: sign-in, profile, agents, admin user provisioning" },
  { type: "Asset", about: "Properties / land you manage" },
  { type: "AssetValuation", about: "Recorded valuations on an asset" },
  { type: "Unit", about: "Rentable spaces, status, moves between assets" },
  { type: "Tenant", about: "Tenant records" },
  { type: "Lease", about: "Active or ended leases" },
  { type: "Payment", about: "Rent and other payments on a lease" },
  { type: "PaymentProof", about: "Uploaded proof files for a payment" },
  { type: "Subscription", about: "Owner billing plan (admin subscription tools)" },
  { type: "Plan", about: "Catalog plan metadata (admin)" },
  { type: "PlanVersion", about: "Published or draft plan versions / matrices (admin)" },
] as const;

export const AUDIT_ENTITY_TYPE_VALUES = AUDIT_ENTITY_TYPE_OPTIONS.map((o) => o.type);

export type AuditActionGroup = { title: string; actions: readonly string[] };

/** Grouped for the “browse” panel; every string should appear exactly once across groups. */
export const AUDIT_ACTION_GROUPS: readonly AuditActionGroup[] = [
  {
    title: "Authentication & account",
    actions: [
      "auth.login",
      "auth.register",
      "auth.setup_token.issue",
      "auth.setup_password.complete",
      "auth.email_verified",
      "auth.email_verification_resent",
      "auth.password_reset_requested",
      "auth.password_reset_complete",
      "auth.account_self_deleted",
      "account.profile_update",
    ],
  },
  {
    title: "Users & agents (admin / owner tools)",
    actions: [
      "users.list",
      "users.get",
      "users.create",
      "users.update",
      "users.delete",
      "users.setup_token.reissue",
      "agents.list",
      "agents.create",
      "agents.update",
      "agents.delete",
      "agents.setup_token.reissue",
    ],
  },
  {
    title: "Portfolio",
    actions: [
      "asset.create",
      "asset.update",
      "asset.delete",
      "asset.valuation.create",
      "unit.create",
      "unit.update",
      "unit.delete",
      "unit.assign_asset",
      "unit.status",
      "tenant.create",
      "tenant.update",
      "tenant.delete",
      "lease.create",
      "lease.update",
      "lease.end",
      "payment.record",
      "payment.update",
      "payment.delete",
      "payment.proof.added",
      "payment.proof.deleted",
    ],
  },
  {
    title: "Platform (admin)",
    actions: [
      "platform.plan.update_metadata",
      "platform.plan.rollback_draft_started",
      "platform.plan_version.create_draft",
      "platform.plan_version.update_matrix",
      "platform.plan_version.publish",
      "platform.plan_version.delete_draft",
      "platform.subscription.grant",
      "platform.subscription.schedule_set",
      "platform.subscription.extend",
      "platform.subscription.downgrade",
      "platform.subscription.cancel",
      "platform.subscription.expire_now",
    ],
  },
] as const;

const _actionSet = new Set(AUDIT_ACTION_GROUPS.flatMap((g) => [...g.actions]));
export const AUDIT_ACTION_SUGGESTIONS = [..._actionSet].sort((a, b) => a.localeCompare(b));
