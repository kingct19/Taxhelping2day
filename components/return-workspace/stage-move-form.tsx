import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function StageMoveForm({
  action,
  needsNote,
  label,
}: {
  action: (data: FormData) => Promise<void>;
  needsNote: boolean;
  label: string;
}) {
  return (
    <form action={action} className="grid gap-2">
      {needsNote ? (
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Reviewer note</span>
          <Textarea name="note" required maxLength={500} placeholder="What did the review confirm?" rows={2} />
        </label>
      ) : (
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Note for the team</span>
          <Input name="note" maxLength={500} placeholder="Optional" />
        </label>
      )}
      <Button className="w-fit" type="submit" size="sm">{label}</Button>
    </form>
  );
}
