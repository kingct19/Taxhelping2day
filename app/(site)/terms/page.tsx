import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { firm } from "@/lib/firm";

export const metadata: Metadata = {
  title: "Terms of agreement",
  description: "The terms for using the TaxHelping2Day website and client portal. Tax work begins only under a written engagement.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <SiteFrame
      eyebrow="Firm"
      title="Terms of agreement"
      lede="These terms cover the use of this website and the client portal. Preparing a return, keeping books, or representing you begins only when we accept that work in a written engagement."
    >
      <p className="text-sm text-muted-foreground">Effective November 19, 2026.</p>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">The practice</h2>
        <p className="text-pretty">
          {firm.legalName} is a private tax practice in {firm.city}, {firm.region}, led by Laura Wallace, Enrolled
          Agent. We are not a law firm and we are not an investment adviser. Pages on this site describe the practice
          in general. They are not advice for your facts, and they do not make you a client.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">When we are engaged</h2>
        <p className="text-pretty">
          A call, an email, or an account in the portal does not by itself start the work. We tell you whether we can
          take it, and the scope and the fee, before preparation begins. The engagement letter for that return is the
          agreement for the work. If that letter and these terms ever differ about the preparation itself, the letter
          controls.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">The website</h2>
        <p className="text-pretty">
          You may read these pages for your own information. You may not copy the site for a competing practice, scrape
          it, or interfere with it. The name {firm.name}, the logo, and the text we wrote belong to the firm.
          Photographs are credited on the <Link href="/photo-credits">photo credits</Link> page and are used under the
          licenses named there.
        </p>
        <p className="text-pretty">
          Links to IRS.gov and to state tax agencies leave this site. Those agencies publish the forms, the calendars,
          and their own rules. A description of a state on this site is general. Your return may differ, and we will
          say how when we have your records.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">The portal</h2>
        <p className="text-pretty">
          The portal is for clients we have invited. You sign in with a code sent to the email on file. Keep that
          email to yourself, and do not forward a sign-in code. You are responsible for the accuracy of the profile
          and the files you send. Tell us if a record is wrong.
        </p>
        <p className="text-pretty">
          Files you upload should be yours to share with a preparer. Do not upload a file that contains someone else’s
          information unless you are allowed to give it to us for the return.
        </p>
        <p className="text-pretty">
          A drawn signature on Form 2848 is your signature on that form for the years in your profile. It authorizes
          the named representative before the IRS only after the firm submits the form the way the IRS requires. The
          portal itself does not transmit the form to the IRS. A typed name on an e-file authorization is your record
          that the firm may e-file that version of the return. It is not the engagement letter and it is not Form
          2848. If the numbers change, we ask again.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Fees</h2>
        <p className="text-pretty">
          The website does not quote a fee for your return. The fee, and what it covers, is in the engagement letter
          before preparation begins.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Availability</h2>
        <p className="text-pretty">
          We intend the site and the portal to be available, and we protect the records as described in our{" "}
          <Link href="/privacy">privacy policy</Link> and on the <Link href="/security">security</Link> page. We may
          suspend a sign-in that we did not issue, or one that is being misused. We may also take the portal offline
          for a repair. We do not promise that the site will be uninterrupted.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Limits</h2>
        <p className="text-pretty">
          To the extent the law allows, {firm.legalName} is not liable for a loss that comes from using the public
          pages, from a third-party site we link to, or from a delay outside our control. This limit does not reduce
          a duty we owe you under a signed engagement, under Treasury Circular 230, or under another rule that cannot
          be waived.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Law</h2>
        <p className="text-pretty">
          These terms are governed by the law of the State of Texas, without regard to conflict-of-law rules. The
          federal rules that govern enrolled agents and tax return preparers still apply to the preparation and to
          any representation.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl">Changes and contact</h2>
        <p className="text-pretty">
          We may update these terms by posting a new version on this page and changing the date above. Continued use
          of the website after that date is acceptance of the new terms. An engagement already signed keeps the letter
          you signed.
        </p>
        <p className="text-pretty">
          Questions can be sent to <a href={`mailto:${firm.email}`}>{firm.email}</a>, by phone at{" "}
          <a href={firm.phoneHref}>{firm.phone}</a>, or by mail to {firm.mailingAddress}, {firm.city}, {firm.region}{" "}
          {firm.postalCode}.
        </p>
      </section>
    </SiteFrame>
  );
}
