import { InviteButtons } from "@/components/settings/invite-buttons";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { TeammateBadges, TeammateEditor } from "@/components/settings/teammate-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";
import { inviteDescription } from "@/lib/sign-in-methods";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function TeammatesPage() {
  const current = await requireProfile("staff");
  const store = getStore();
  const [profiles, methods] = await Promise.all([store.listProfiles(), store.getSignInMethods()]);
  const owner = current.staffRank === "owner";
  const people = profiles
    .filter((profile) => profile.role === "staff")
    .map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      avatar: avatarUrl(person.id, person.avatarPath),
      staffRank: person.staffRank,
      staffStatus: person.staffStatus,
    }));
  const columns = owner ? "lg:grid-cols-[minmax(0,1fr)_8rem_8rem_5rem]" : "lg:grid-cols-[minmax(0,1fr)_8rem_8rem]";

  return (
    <SettingsFrame
      title="Teammates"
      description={`${people.length} ${people.length === 1 ? "person" : "people"} on this desk`}
      action={<InviteButtons allowTeammate={owner} clientDescription={inviteDescription("client", methods)} teammateDescription={inviteDescription("staff", methods)} />}
    >
      <Card>
        <CardContent>
          <ul>
            <li className={`hidden items-center gap-3 border-b px-1 pb-2 text-xs text-muted-foreground lg:grid ${columns}`}>
              <span>Teammate</span>
              <span>Role</span>
              <span>Status</span>
              {owner ? <span>Access</span> : null}
            </li>
            {people.map((person) => {
              const photo = person.avatar;
              return (
              <li key={person.id} className="border-b py-3 last:border-b-0">
                <div className={`grid items-center gap-3 ${columns}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      {photo ? <AvatarImage src={photo} alt="" /> : null}
                      <AvatarFallback className="text-xs">{initials(person.name, person.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {person.name.trim() || "Staff"}
                        {person.email === current.email ? <span className="ml-2 text-xs font-normal text-muted-foreground">(You)</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                    </div>
                  </div>
                  <TeammateBadges staffRank={person.staffRank} staffStatus={person.staffStatus} />
                  {owner ? (
                    <div>
                      {person.id === current.id ? null : <TeammateEditor person={person} />}
                    </div>
                  ) : null}
                </div>
              </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </SettingsFrame>
  );
}
