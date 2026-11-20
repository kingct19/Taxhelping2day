import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { firm } from "@/lib/firm";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How TaxHelping2Day LLC collects, uses, and protects personal information on this website and in the client portal.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SiteFrame
      eyebrow="Firm"
      title="Privacy policy"
      lede={`${firm.legalName} keeps client information confidential. We use it to prepare a return, keep books, and speak with you. We do not sell it.`}
    >
      <p className="text-sm text-muted-foreground">Effective November 19, 2026.</p>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Who this covers</h2>
        <p className="text-pretty">
          This policy describes the public website at {firm.domain} and the client portal. {firm.legalName} is a private
          tax practice in {firm.city}, {firm.region}. Laura Wallace, Enrolled Agent, leads the practice. The written
          engagement for a particular return states the work we have accepted. This page states how we handle personal
          information.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">What we collect</h2>
        <p className="text-pretty">If you call or email us, we keep your name, your contact details, and what you wrote, so we can reply. This website does not add you to a mailing list.</p>
        <p className="text-pretty">
          If we invite you to the portal, we keep the profile you save: legal name, phone, address, who we are helping,
          spouse name when you provide it, and the tax years you name. A Social Security number or employer
          identification number is encrypted. The portal shows only the last four digits.
        </p>
        <p className="text-pretty">
          We also keep the files you upload, messages with the firm, the engagement letter and its signature when one
          is sent, a drawn signature on Form 2848, and a typed name when you authorize e-file of a specific version of
          a return. An email address we do not have on file cannot open an account.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">How we use it</h2>
        <p className="text-pretty">
          We use this information to decide whether we can take the work, to prepare and review a return, to keep
          books, to send the engagement and Form 2848, to request documents, and to answer you. A message you send is
          read by the firm. We do not use your documents or identification numbers to train an AI model, and we do not
          send them to one.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Who can see it</h2>
        <p className="text-pretty">
          Your portal file is visible to you and to our team. We share a return, a form, or a record with the IRS or a
          state tax agency when you have asked us to file or to represent you, and when the law requires it. We do not
          sell personal information and we do not share it for advertising.
        </p>
        <p className="text-pretty">
          A few companies process information so the portal can function. Clerk sends the sign-in code and keeps the
          session. Supabase stores the portal records. Resend delivers email from the firm. When we send an engagement
          letter for electronic signature, DocuSeal handles that signing step. Each one receives only what that step
          requires.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Cookies</h2>
        <p className="text-pretty">
          The public pages do not use advertising or analytics cookies. Signing in sets a session cookie so the portal
          knows it is you. That cookie is not used to follow you across other websites.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">How long we keep it</h2>
        <p className="text-pretty">
          We keep a client file for the engagement and for the period the tax rules require a preparer to keep
          records. If you wrote before we accepted any work, we keep that message long enough to answer it and to know
          whether we spoke. You may ask what we still hold. Some records cannot be deleted while a return is open or
          while the retention period runs.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Security</h2>
        <p className="text-pretty">
          Clients sign in with a code sent to their email. Identification numbers are encrypted. Access to a file is
          limited to that client and our team. No method of storage is perfect. If we learn of unauthorized access to
          a client file, we will tell the people affected and take the steps the situation requires. A fuller
          description of the portal is on the <Link href="/security">security</Link> page.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Children</h2>
        <p className="text-pretty">
          This site and the portal are for adults who need tax preparation, bookkeeping, or representation. We do not
          knowingly collect information from a child for the child’s own account.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Changes and questions</h2>
        <p className="text-pretty">
          If we change this policy, we will post the new version on this page and change the date above. Questions
          about your information can be sent to <a href={`mailto:${firm.email}`}>{firm.email}</a> or by mail to{" "}
          {firm.mailingAddress}, {firm.city}, {firm.region} {firm.postalCode}.
        </p>
      </section>
    </SiteFrame>
  );
}
