"use client";

import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import {
  PlatformPageShell,
  PlatformSectionCard,
} from "@/components/platform/platform-page-shell";

export default function PlatformPlansPage() {
  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Plans"
        description="Create and publish pricing plan versions. Plan editing, feature matrix controls, and publish workflow will be added in Module 2."
      >
        <PlatformSectionCard title="Module scope" description="Included later in Module 2">
          <ul className="space-y-1 text-sm text-muted">
            <li>Plan catalog (starter, growth, pro)</li>
            <li>Feature-value matrix editor</li>
            <li>Draft and publish plan version flow</li>
          </ul>
        </PlatformSectionCard>
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
