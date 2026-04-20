"use client";

import Link from "next/link";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import { PlatformAdminGuard } from "@/components/platform/platform-admin-guard";
import { PlatformAdminAccountsPanel } from "@/components/platform/platform-admin-accounts-panel";
import {
  PlatformPageShell,
  PlatformSectionCard,
} from "@/components/platform/platform-page-shell";
import { buttonClassName } from "@/components/ui/button";

export default function PlatformAccountsPage() {
  return (
    <PlatformAccessGuard>
      <PlatformAdminGuard>
        <PlatformPageShell
          title="Accounts"
          description="Provision users, issue password setup links, and remove accounts. New users with an email are marked verified immediately; share the setup link so they choose their password (same flow as owner-created agents)."
          actions={
            <Link href="/platform/subscriptions" className={buttonClassName({ variant: "secondary" })}>
              Subscriptions
            </Link>
          }
        >
          <PlatformSectionCard
            title="User directory"
            description="Search and filter the full user list. Use “New user” to create an owner (with an initial published plan), admin, or agent. Leave “Set password here” unchecked to receive a copyable setup link."
          >
            <PlatformAdminAccountsPanel />
          </PlatformSectionCard>

          <PlatformSectionCard
            title="Usage & entitlements"
            description="Per-owner usage, over-limit handling, and entitlement inspection will continue to live alongside subscription tools."
          >
            <ul className="space-y-1 text-sm text-muted">
              <li>Open an owner from Subscriptions to adjust plan, grants, and billing context.</li>
              <li>Usage vs plan limits and compliance controls are planned for later modules.</li>
            </ul>
            <Link
              href="/platform/subscriptions"
              className={buttonClassName({ variant: "secondary", size: "sm", className: "mt-4 inline-flex" })}
            >
              Go to subscriptions
            </Link>
          </PlatformSectionCard>
        </PlatformPageShell>
      </PlatformAdminGuard>
    </PlatformAccessGuard>
  );
}
