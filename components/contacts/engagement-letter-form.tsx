import Link from "next/link";
import { ReadyLetterForm } from "@/components/contacts/ready-letter-form";
import { packetDb } from "@/lib/docuseal";
import { engagementLetter } from "@/lib/engagement-letter";

type TemplateRow = {
  id: string;
  name: string;
  docuseal_template_id: number | null;
  kind: string | null;
  archived_at: string | null;
};

export async function EngagementLetterForm({
  profileId,
  returns,
}: {
  profileId: string;
  returns: { id: string; taxYear: number; entity: string }[];
}) {
  const db = packetDb();
  const templatesResult = db
    ? await db.from("signing_templates").select("id,name,docuseal_template_id,kind,archived_at").is("archived_at", null).order("name")
    : null;
  if (templatesResult?.error) throw templatesResult.error;
  const templates = ((templatesResult?.data ?? []) as TemplateRow[]).filter((template) => template.docuseal_template_id);
  const letter = await engagementLetter(returns.map((item) => item.id));

  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-medium">Engagement letter</h2>
      {letter.status === "sent" ? <p className="text-sm text-muted-foreground">{letter.title} was sent. Waiting for the client to open it.</p> : null}
      {letter.status === "opened" ? <p className="text-sm text-muted-foreground">{letter.title} was opened. Waiting for the signature.</p> : null}
      {letter.status === "signed" ? <p className="text-sm text-muted-foreground">{letter.title} is signed.</p> : null}
      {letter.status === "declined" ? <p className="text-sm text-muted-foreground">{letter.title} was declined.</p> : null}
      {letter.status === "unsigned" && returns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Open a return and finish the document review, then send the engagement letter from Smartdocs.</p>
      ) : null}
      {letter.status === "unsigned" && returns.length > 0 && templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Link className="underline" href="/smartdocs">Create the engagement letter in Smartdocs</Link> before it can be ready.
        </p>
      ) : null}
      {letter.status === "unsigned" && returns.length > 0 && templates.length > 0 ? (
        <ReadyLetterForm
          profileId={profileId}
          returns={returns}
          templates={templates.map((template) => ({
            id: template.id,
            name: template.name,
            engagement: template.kind === "engagement",
          }))}
        />
      ) : null}
    </div>
  );
}
