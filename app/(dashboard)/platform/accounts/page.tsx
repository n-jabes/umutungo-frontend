"use client";

import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import {
  PlatformPageShell,
  PlatformSectionCard,
} from "@/components/platform/platform-page-shell";

export default function PlatformAccountsPage() {
  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Accounts"
        description="Inspect account usage, entitlement state, and over-limit compliance from one place."
      >
        <PlatformSectionCard title="Module scope" description="Included later in Modules 4 and 5">
          <ul className="space-y-1 text-sm text-muted">
            <li>Usage vs plan limits</li>
            <li>Over-limit compliance controls</li>
            <li>Entitlement inspector per owner account</li>
          </ul>
        </PlatformSectionCard>
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
