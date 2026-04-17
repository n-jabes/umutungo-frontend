"use client";

import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import {
  PlatformPageShell,
  PlatformSectionCard,
} from "@/components/platform/platform-page-shell";

export default function PlatformSubscriptionsPage() {
  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Subscriptions"
        description="Manual grants, trial extensions, and lifecycle actions will be centralized here."
      >
        <PlatformSectionCard title="Module scope" description="Included later in Module 3">
          <ul className="space-y-1 text-sm text-muted">
            <li>Subscription search and filters</li>
            <li>Grant / extend / downgrade / cancel actions</li>
            <li>Reason-required operator events</li>
          </ul>
        </PlatformSectionCard>
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
