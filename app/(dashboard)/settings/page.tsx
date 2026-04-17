import { Suspense } from "react";
import { SettingsPageClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-sm text-muted">Loading settings…</div>}>
      <SettingsPageClient />
    </Suspense>
  );
}
