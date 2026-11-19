import { InviteButtons } from "@/components/settings/invite-buttons";
import { SettingsFrame } from "@/components/settings/settings-frame";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
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
    ...staff.map((person) => ({ id: person.id, name: person.name || "Staff", email: person.email })),
    ...staffEmails()
      .filter((email) => !listed.has(email))
      .map((email) => ({ id: email, name: "Staff", email })),
  ];

  return (
    <SettingsFrame
      title="Teammates"
      description={`${people.length} ${people.length === 1 ? "person" : "people"} on this desk`}
      action={<InviteButtons />}
    >
      <Card className="overflow-hidden py-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Teammate</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.id}>
                <TableCell className="h-14 pl-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="text-xs">{initials(person.name, person.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {person.name}
                        {person.email === current.email ? <span className="ml-2 text-xs font-normal text-muted-foreground">(You)</span> : null}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{person.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="h-14">
                  <Badge variant="neutral">Staff</Badge>
                </TableCell>
                <TableCell className="h-14">
                  <Badge variant="success">Active</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </SettingsFrame>
  );
}
