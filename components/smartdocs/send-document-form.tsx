"use client";

import { useState } from "react";
import { sendSmartdocToReturn } from "@/lib/signing-actions";
import { Button } from "@/components/ui/button";

const selectStyle = "h-8 w-full rounded-lg border border-input bg-white px-2 text-sm";

export function SendDocumentForm({
  profileId,
  returnId,
  email,
  templates,
}: {
  profileId: string;
  returnId: string;
  email: string;
  templates: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-2"
      action={async (formData) => {
        setError(null);
        setPending(true);
        try {
          const result = await sendSmartdocToReturn(profileId, returnId, formData);
          if (result.error) setError(result.error);
        } catch (caught) {
          setError(caught instanceof Error && caught.message ? caught.message : "Could not send the document.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">Document</span>
        <select className={selectStyle} name="template" defaultValue={templates[0]?.id}>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" className="w-fit" disabled={pending}>Send to {email}</Button>
    </form>
  );
}
