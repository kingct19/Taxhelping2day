"use client";

import { useState } from "react";
import { prepareEngagementLetter } from "@/lib/signing-actions";
import { Button } from "@/components/ui/button";

const selectStyle = "h-8 w-full rounded-lg border border-input bg-white px-2 text-sm";

export function ReadyLetterForm({
  profileId,
  templates,
  returns,
}: {
  profileId: string;
  templates: { id: string; name: string; engagement: boolean }[];
  returns: { id: string; taxYear: number; entity: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const marked = templates.find((template) => template.engagement) ?? templates[0];

  return (
    <form
      className="grid gap-2"
      action={async (formData) => {
        setError(null);
        setPending(true);
        try {
          const result = await prepareEngagementLetter(profileId, formData);
          if (result.error) setError(result.error);
        } catch (caught) {
          setError(caught instanceof Error && caught.message ? caught.message : "Could not send the document.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="grid gap-1 text-sm">
        Smartdoc
        <select className={selectStyle} name="template" defaultValue={marked?.id}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}{template.engagement ? " · Engagement letter" : ""}
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
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="w-fit" disabled={pending}>Have the letter ready</Button>
    </form>
  );
}
