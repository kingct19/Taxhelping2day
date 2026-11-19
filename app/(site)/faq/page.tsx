import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import { faqs } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Questions",
  description: "Common questions about TaxHelping2Day, the client portal, and where the practice works.",
  alternates: { canonical: "/faq" },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function FaqPage() {
  return (
    <SiteFrame eyebrow="Resources" title="Questions clients ask" lede="A few answers before we talk. The written engagement is where the specific work and the fee are defined.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="flex flex-col gap-6">
        {faqs.map((faq) => (
          <section key={faq.question} className="flex flex-col gap-2">
            <h2 className="font-serif text-2xl">{faq.question}</h2>
            <p className="text-pretty">{faq.answer}</p>
          </section>
        ))}
      </div>
    </SiteFrame>
  );
}
