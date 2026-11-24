import { InviteButtons } from "@/components/settings/invite-buttons";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";
import { staffEmails } from "@/lib/firm";
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
  const profiles = await getStore().listProfiles();
  const staff = profiles.filter((profile) => profile.role === "staff");
  const listed = new Set(staff.map((person) => person.email));
  const people = [
    ...staff.map((person) => ({ id: person.id, name: person.name || "Staff", email: person.email, avatar: avatarUrl(person.id, person.avatarPath) })),
    ...staffEmails()
      .filter((email) => !listed.has(email))
      .map((email) => ({ id: email, name: "Staff", email, avatar: null })),
  ];

  return (
    <SettingsFrame
      title="Teammates"
      description={`${people.length} ${people.length === 1 ? "person" : "people"} on this desk`}
      action={<InviteButtons />}
    >
      <Card>
        <CardContent>
          <ul>
            <li className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem] items-center gap-3 border-b px-1 pb-2 text-xs text-muted-foreground lg:grid">
              <span>Teammate</span>
              <span>Role</span>
              <span>Status</span>
            </li>
            {people.map((person) => {
              const photo = person.avatar;
              return (
              <li key={person.id} className="border-b py-3 last:border-b-0">
                <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_8rem]">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      {photo ? <AvatarImage src={photo} alt="" /> : null}
                      <AvatarFallback className="text-xs">{initials(person.name, person.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {person.name}
                        {person.email === current.email ? <span className="ml-2 text-xs font-normal text-muted-foreground">(You)</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                    </div>
                  </div>
                  <div>
                    <Badge variant="neutral">Staff</Badge>
                  </div>
                  <div>
                    <Badge variant="success">Active</Badge>
                  </div>
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
