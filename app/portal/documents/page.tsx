import { uploadDocument } from "@/lib/actions";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { documentRequests, receivedRequest } from "@/lib/season";
import { documentKindLabel, documentKinds } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const profile = await requireProfile("client");
  const documents = await getStore().listDocuments(profile.id);

  return (
    <>
      <h1 className="font-serif text-3xl">Documents</h1>
      <p className="text-muted-foreground">Send the records for this return. Laura can open them from your file.</p>
      <ul className="flex flex-col gap-2">
        {documentRequests(profile.taxpayerType).map((request) => {
          const received = receivedRequest(request, documents);
          return (
            <li key={request.kind} className="rounded-lg border border-border bg-background px-4 py-3 text-foreground">
              <p className="font-medium">{request.title}</p>
              <p className="text-sm text-muted-foreground">{request.detail}</p>
              <p className="mt-1 text-sm">{received ? "In review" : request.required ? "Still needed" : "Send if you have one"}</p>
            </li>
          );
        })}
      </ul>
      <form id="upload" action={uploadDocument} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Type</FieldLabel>
            <Select name="kind" defaultValue="w2">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {documentKinds.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {documentKindLabel(kind)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="file">File</FieldLabel>
            <Input id="file" name="file" type="file" required />
          </Field>
        </FieldGroup>
        <Button type="submit">Upload</Button>
      </form>
      <ul className="flex flex-col gap-2">
        {documents.map((document) => (
          <li key={document.id}>
            <a className="break-all underline" href={`/files/documents/${document.id}`}>
              {documentKindLabel(document.kind)} — {document.filename}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
