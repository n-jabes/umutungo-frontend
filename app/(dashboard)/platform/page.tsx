"use client";

import Link from "next/link";
import { PlatformAccessGuard } from "@/components/platform/platform-access-guard";
import {
  PlatformPageShell,
  PlatformPlaceholderList,
  PlatformSectionCard,
} from "@/components/platform/platform-page-shell";

export default function PlatformOverviewPage() {
  return (
    <PlatformAccessGuard>
      <PlatformPageShell
        title="Operations overview"
        description="Manage the platform workspace modules for pricing, subscriptions, and account operations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/platform/plans"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted-bg active:scale-[0.99]"
            >
              Plans catalog
            </Link>
            <Link
              href="/platform/plans/compare"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted-bg active:scale-[0.99]"
            >
              Compare plans
            </Link>
          </div>
        }
      >
        <PlatformSectionCard
          title="Module status"
          description="Plan catalog UI (Module 2) is live for admins. Subscriptions and accounts follow in later modules."
        >
          <PlatformPlaceholderList
            items={[
              { label: "Plans", value: "Catalog & publish" },
              { label: "Subscriptions", value: "Scaffolded" },
              { label: "Accounts", value: "Scaffolded" },
              { label: "Audit", value: "Coming in module 7" },
            ]}
          />
        </PlatformSectionCard>
      </PlatformPageShell>
    </PlatformAccessGuard>
  );
}
