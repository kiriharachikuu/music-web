import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { LegalPage } from "../legal-page";
import {
  privacyDescription,
  privacySections,
  privacyUpdatedAt,
} from "../privacy-content";

export const metadata: Metadata = {
  title: "隐私政策 - XingTone",
  description: "XingTone（瞳瞳音乐）隐私政策",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      icon={ShieldCheck}
      title="隐私政策"
      description={privacyDescription}
      updatedAt={privacyUpdatedAt}
      sections={privacySections}
    />
  );
}
