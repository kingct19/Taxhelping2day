import { notFound } from "next/navigation";
import { SmartdocBuilder } from "@/components/smartdocs/smartdoc-builder";
import { SubpageNav } from "@/components/subpage-nav";
import { requireProfile } from "@/lib/auth";
import { builderConfigured, signBuilderToken } from "@/lib/docuseal-builder";
import { packetDb } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f-]{36}$/i;

export default async function SmartdocEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireProfile("staff");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const db = packetDb();
  if (!db || !builderConfigured()) {
    return (
      <main className="grid gap-3 px-6 py-6">
        <SubpageNav backHref="/smartdocs" backLabel="Back to Smartdocs" crumbs={[{ href: "/smartdocs", label: "Smartdocs" }, { label: "Builder unavailable" }]} />
        <h1 className="text-base font-semibold">Builder unavailable</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Set DOCUSEAL_API_KEY, DOCUSEAL_USER_EMAIL, and DOCUSEAL_WEBHOOK_SECRET before editing a document.
        </p>
      </main>
    );
  }
  const { data, error } = await db.from("signing_templates").select("id,name,docuseal_template_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const token = signBuilderToken(data.docuseal_template_id
    ? { integration_email: staff.email, template_id: data.docuseal_template_id }
    : { integration_email: staff.email, external_id: data.id, name: data.name, document_urls: [] });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <SubpageNav
          backHref="/smartdocs"
          backLabel="Back to Smartdocs"
          crumbs={[{ href: "/smartdocs", label: "Smartdocs" }, { label: data.name }]}
        />
      </header>
      <div className="grid min-h-0 flex-1 content-start gap-4 overflow-auto px-6 py-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Upload the PDF and place the client’s fields on First Party. When Saved appears, go back to Smartdocs and send it from the list.
        </p>
        <SmartdocBuilder templateId={data.id} token={token} savedDocusealId={data.docuseal_template_id} />
      </div>
    </main>
  );
}
