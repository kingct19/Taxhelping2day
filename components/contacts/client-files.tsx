import { shortDate } from "@/lib/return-progress";
import { documentKindLabel, type DocumentRecord } from "@/lib/types";

export function ClientFiles({ documents }: { documents: DocumentRecord[] }) {
  const listed = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="grid content-start gap-2 rounded-lg border p-3">
      <h2 className="text-sm font-medium">Files</h2>
      {listed.length === 0 ? <p className="text-sm text-muted-foreground">None uploaded.</p> : (
        <ul className="grid gap-2">
          {listed.map((document) => {
            const name = document.filename.trim() || documentKindLabel(document.kind);
            return (
              <li key={document.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3">
                <div className="min-w-0">
                  <a className="block truncate text-sm font-medium underline" href={`/files/documents/${document.id}`}>
                    {name}
                  </a>
                  <p className="mt-0.5 text-sm text-muted-foreground">{documentKindLabel(document.kind)}</p>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{shortDate(document.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
