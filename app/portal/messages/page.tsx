import { ClientInbox } from "@/components/portal/client-inbox";
import { MarkSeen } from "@/components/portal/mark-seen";
import { requireProfile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";
import { pickReturn, unreadFromStaff } from "@/lib/client-home";
import { firm } from "@/lib/firm";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const profile = await requireProfile("client");
  const store = getStore();
  const [messages, returns] = await Promise.all([store.listMessages(profile.id), store.listTeamReturns()]);
  const current = pickReturn(returns.filter((item) => item.profileId === profile.id));
  const owner = current?.owner ? await store.getProfile(current.owner) : null;
  const conversation = messages.filter((message) => message.kind !== "note" && !message.requestState);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MarkSeen />
      <ClientInbox
        preparerName={owner?.name || firm.representative}
        preparerEmail={owner?.email || firm.email}
        firmName={firm.name}
        selfName={profile.name || "You"}
        preparerAvatar={owner ? avatarUrl(owner.id, owner.avatarPath) : null}
        selfAvatar={avatarUrl(profile.id, profile.avatarPath)}
        messages={conversation}
        unread={unreadFromStaff(messages)}
      />
    </div>
  );
}
