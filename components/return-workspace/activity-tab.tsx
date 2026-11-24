import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { ActivityTimeline } from "@/components/return-workspace/activity-timeline";
import { activityGroup, describeActivity, shortDateTime } from "@/lib/return-progress";
import type { Message } from "@/lib/types";

export function ActivityTab({ messages, authors }: { messages: Message[]; authors: Map<string, string> }) {
  const items = [...messages]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((message) => {
      const described = describeActivity(message);
      return {
        id: message.id,
        label: described.label,
        body: message.body,
        when: shortDateTime(message.createdAt),
        actor: authors.get(message.authorId) || "Team",
        audience: message.kind === "note" ? "Team only" : "Customer can see this",
        tone: described.tone,
        icon: described.icon,
        group: activityGroup(described.label),
      };
    });

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        This is the record already saved on the return. Filing status and assignment changes are added from now on. Earlier ones were not stored as activity.
      </p>
      {items.length === 0 ? (
        <LiniqoEmpty {...liniqo.notice} className="px-0 py-4" artClassName="size-24">Nothing recorded yet.</LiniqoEmpty>
      ) : (
        <ActivityTimeline items={items} />
      )}
    </div>
  );
}
