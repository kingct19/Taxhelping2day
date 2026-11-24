import Link from "next/link";
import { prepareEngagementLetter } from "@/lib/signing-actions";
import { packetDb } from "@/lib/docuseal";
import { engagementLetter } from "@/lib/engagement-letter";
import { Button } from "@/components/ui/button";

const selectStyle = "h-8 w-full rounded-lg border border-input bg-white px-2 text-sm";

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
  const marked = templates.find((template) => template.kind === "engagement") ?? templates[0];

  return (
    <div className="grid gap-2">
      <h2 className="text-sm font-medium">Engagement letter</h2>
      {letter.status === "ready" ? <p className="text-sm text-muted-foreground">{letter.title} is ready for the client to sign.</p> : null}
      {letter.status === "waiting" ? <p className="text-sm text-muted-foreground">{letter.title} is with the client.</p> : null}
      {letter.status === "unsigned" && returns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Open a return, then send the engagement letter from Smartdocs.</p>
      ) : null}
      {letter.status === "unsigned" && returns.length > 0 && templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Link className="underline" href="/smartdocs">Create the engagement letter in Smartdocs</Link> before it can be ready.
        </p>
      ) : null}
      {letter.status === "unsigned" && returns.length > 0 && templates.length > 0 ? (
        <form action={prepareEngagementLetter.bind(null, profileId)} className="grid gap-2">
          <label className="grid gap-1 text-sm">
            Smartdoc
            <select className={selectStyle} name="template" defaultValue={marked?.id}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}{template.kind === "engagement" ? " · Engagement letter" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Return
            <select className={selectStyle} name="returnId" defaultValue={returns[0]?.id}>
              {returns.map((item) => (
                <option key={item.id} value={item.id}>{item.taxYear} {item.entity}</option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" className="w-fit">Have the letter ready</Button>
        </form>
      ) : null}
    </div>
  );
}
