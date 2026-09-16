import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { LegalPage } from "../legal-page";
import {
  termsDescription,
  termsSections,
  termsUpdatedAt,
} from "../terms-content";

export const metadata: Metadata = {
  title: "服务条款 - XingTone",
  description: "XingTone（瞳瞳音乐）服务条款",
};

export default function UserAgreementPage() {
  return (
    <LegalPage
      icon={FileText}
      title="服务条款"
      description={termsDescription}
      updatedAt={termsUpdatedAt}
      sections={termsSections}
    />
  );
}
