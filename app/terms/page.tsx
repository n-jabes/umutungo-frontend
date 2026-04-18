import type { Metadata } from "next";
import { LegalDocLayout } from "@/components/legal/legal-doc-layout";
import { TermsContent } from "@/components/legal/terms-content";

export const metadata: Metadata = {
  title: "Terms of Service — Umutungo",
  description: "Terms governing use of the Umutungo asset and lease management platform.",
};

export default function TermsPage() {
  return (
    <LegalDocLayout title="Terms of Service">
      <TermsContent />
    </LegalDocLayout>
  );
}
