import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import { firm } from "@/lib/firm";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What the TaxHelping2Day website and client portal do with personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SiteFrame
      eyebrow="Firm"
      title="Privacy"
      lede="Client information is confidential. We use it to prepare your return and to communicate with you, and we do not sell it."
    >
      <p className="text-pretty">
        A call or an email to {firm.email} is read so we can reply. This website does not add you to a mailing list.
      </p>
      <p className="text-pretty">
        Once you are a client, the portal holds your profile, the files you send, signed letters, and messages with
        our team. Taxpayer identification numbers are encrypted. Only you and our team can open your file.
      </p>
      <p className="text-pretty">
        Documents and identification numbers are not sent to an AI model.
      </p>
    </SiteFrame>
  );
}
