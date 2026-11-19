import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "Security",
  description: "How TaxHelping2Day keeps client records private, encrypted, and limited to you and our team.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <SiteFrame
      eyebrow="Our firm"
      title="Your records stay with us"
      lede="A tax practice is trusted with Social Security numbers, identification, and the details of a household or a business. We treat that information as confidential."
    >
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">A private sign-in</h2>
        <p className="text-pretty">
          Clients sign in with a one-time link sent to their email. There is no password to reuse. The link expires
          after it is used, and an email we do not have on file cannot open an account.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Encrypted identification numbers</h2>
        <p className="text-pretty">
          Social Security numbers and employer identification numbers are encrypted. The portal shows only the last
          four digits. Your profile, documents, signed letters, and messages are visible to you and to our team.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Not sold, and not used to train software</h2>
        <p className="text-pretty">
          We do not sell client information. Documents and identification numbers are not sent to an AI model. A
          message you send is read by the firm.
        </p>
      </section>
    </SiteFrame>
  );
}
