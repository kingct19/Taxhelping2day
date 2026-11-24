import { DocumentManager } from "@/components/return-workspace/document-manager";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { recordIntakeReview, sendOrganizer } from "@/lib/actions";
import type { DocumentEntry } from "@/lib/return-documents";
import { returnFieldClass } from "@/lib/return-progress";

export function DocumentsTab({
  profileId,
  returnId,
  entries,
  fileId,
  showOrganizer,
}: {
  profileId: string;
  returnId: string;
  entries: DocumentEntry[];
  fileId: string | null;
  showOrganizer: boolean;
}) {
  const ask = recordIntakeReview.bind(null, profileId, returnId);
  return (
    <div className="grid gap-4">
      <DocumentManager profileId={profileId} returnId={returnId} entries={entries} fileId={fileId} />
      {showOrganizer ? (
        <form action={sendOrganizer.bind(null, profileId, returnId)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-3">
          <p className="text-sm text-muted-foreground">Some organizer items have not been sent to the client.</p>
          <Button type="submit" variant="outline" size="sm">Send organizer</Button>
        </form>
      ) : null}
      <form action={ask} className="grid gap-3 rounded-lg border p-3">
        <div>
          <h2 className="text-sm font-medium">Ask the customer</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">This shows up in their portal.</p>
        </div>
        <label htmlFor="request" className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">What you need</span>
          <Textarea id="request" name="detail" required maxLength={1000} placeholder="Which document or correction do you need?" rows={2} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">How it affects the return</span>
          <select className={returnFieldClass} name="block" defaultValue="filing">
            <option value="start">We cannot start without it</option>
            <option value="filing">We cannot file without it</option>
            <option value="info">For our notes only</option>
          </select>
        </label>
        <Button className="w-fit" type="submit" name="action" value="request" size="sm">Send to their portal</Button>
      </form>
    </div>
  );
}
