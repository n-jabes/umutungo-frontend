import type { Metadata } from "next";
import { LegalDocLayout } from "@/components/legal/legal-doc-layout";
import { PrivacyContent } from "@/components/legal/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Umutungo",
  description: "How Umutungo processes personal and portfolio data.",
};

export default function PrivacyPage() {
  return (
    <LegalDocLayout title="Privacy Policy">
      <PrivacyContent />
    </LegalDocLayout>
  );
}
