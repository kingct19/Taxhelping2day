import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stageTone } from "@/lib/status-tone";
import { stages, type Stage } from "@/lib/return-workflow";

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

export function ClientHeader({
  name,
  email,
  avatar,
  filing,
  phone,
  since,
  portal,
  stage,
  deskHref,
  conversationHref,
}: {
  name: string;
  email: string;
  avatar: string | null;
  filing: string;
  phone: string;
  since: string;
  portal: string;
  stage: Stage | null;
  deskHref: string;
  conversationHref: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar size="lg">
          {avatar ? <AvatarImage src={avatar} alt="" /> : null}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filing}
            {email ? ` · ${email}` : ""}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{phone || "Not on file"}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Client since</dt>
              <dd>{since}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Portal</dt>
              <dd>{portal || "Not on file"}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {stage ? <Badge variant={stageTone(stage)}>{stages[stage]}</Badge> : <Badge variant="neutral">No open return</Badge>}
        <Button nativeButton={false} variant="outline" size="sm" render={<Link href={deskHref} />}>
          Open this client on the desk
        </Button>
        <Button nativeButton={false} variant="outline" size="sm" render={<Link href={conversationHref} />}>
          Open conversation
        </Button>
      </div>
    </header>
  );
}
