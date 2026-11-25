import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon, FileTextIcon, LightbulbIcon, UserRoundIcon } from "lucide-react";
import { PortalAvatar } from "@/components/portal/portal-avatar";
import { ReplyHours } from "@/components/portal/reply-hours";
import { StageChecklist } from "@/components/portal/stage-checklist";
import { ActivityTimeline, type ActivityItem } from "@/components/return-workspace/activity-timeline";
import { LiniqoEmpty, liniqo } from "@/components/liniqo-empty";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  clientActions,
  clientFirstName,
  deriveClientStage,
  firmRequestedPoa,
  pickReturn,
  type LetterSnapshot,
} from "@/lib/client-home";
import { emptyIntake } from "@/lib/filing-needs";
import { seasonFor } from "@/lib/season";
import { engagementLetter } from "@/lib/engagement-letter";
import { firm } from "@/lib/firm";
import { replyExpectation, summarizeHours } from "@/lib/office-hours";
import { requestThreads } from "@/lib/request-thread";
import { activityGroup, describeActivity, formatDollars, shortDateTime } from "@/lib/return-progress";
import { getStore } from "@/lib/store";

function CardHeading({ icon: Icon, title }: { icon: typeof FileTextIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
}

export async function PortalHome({ profileId, readOnly = false }: { profileId: string; readOnly?: boolean }) {
  const store = getStore();
  const profile = await store.getProfile(profileId);
  if (!profile) return null;
  const [signatures, messages, returns, filings, authorizations, invoices, documents, catalog, officeHours] = await Promise.all([
    store.listSignatures(profile.id),
    store.listMessages(profile.id),
    store.listTeamReturns(),
    store.listFilings(),
    store.listAuthorizations(),
    store.listInvoices(),
    store.listDocuments(profile.id),
    store.getFilingCatalog(),
    store.getOfficeHours(),
  ]);
  const mine = returns.filter((item) => item.profileId === profile.id);
  const current = pickReturn(mine);
  const currentFilings = filings.filter((filing) => filing.returnId === current?.id);
  const currentAuthorizations = authorizations.filter((item) => item.returnId === current?.id);
  const threads = requestThreads(messages.filter((message) => !current || !message.returnId || message.returnId === current.id));
  const letterState = await engagementLetter(mine.map((item) => item.id));
  const letter: LetterSnapshot = letterState.status;
  const returnIds = new Set(mine.map((item) => item.id));
  const sentInvoices = invoices.filter((invoice) => returnIds.has(invoice.returnId) && invoice.status === "sent");
  const invoice = sentInvoices.find((item) => item.returnId === current?.id) ?? sentInvoices[0] ?? null;
  const poaAsked = firmRequestedPoa(messages);
  const actions = clientActions({
    profile,
    signatures,
    threads,
    authorizations: currentAuthorizations,
    filings: currentFilings,
    invoice,
    letter,
    poaAsked,
    returnVersion: current?.returnVersion ?? 1,
  });
  const owner = current?.owner ? await store.getProfile(current.owner) : null;
  const authors = new Map<string, string>([[profile.id, profile.name || "You"]]);
  if (owner) authors.set(owner.id, owner.name || firm.representative);
  const visible = messages.filter((message) => message.kind !== "note");
  const missingAuthors = [...new Set(visible.map((message) => message.authorId))].filter((id) => !authors.has(id));
  const lookedUp = await Promise.all(missingAuthors.map(async (id) => [id, await store.getProfile(id)] as const));
  for (const [id, person] of lookedUp) {
    if (person) authors.set(id, person.name || person.email);
  }
  const activity: ActivityItem[] = [...visible]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((message) => {
      const described = describeActivity(message);
      return {
        id: message.id,
        label: described.label,
        body: message.body,
        when: shortDateTime(message.createdAt),
        actor: authors.get(message.authorId) || "Team",
        audience: "Customer can see this",
        tone: described.tone,
        icon: described.icon,
        group: activityGroup(described.label),
      };
    });
  const season = seasonFor(
    profile,
    signatures,
    documents,
    current ? { answered: current.desk.intakeAnswered, needs: current.desk.filingNeeds } : emptyIntake(),
    catalog,
  );
  const progress = deriveClientStage({ returnStage: current?.stage ?? null, filings: currentFilings, season });
  const first = clientFirstName(profile.name);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const preparerName = owner?.name || firm.representative;
  const documentCount = actions.filter((action) => action.href.startsWith("/portal/documents")).length;
  const signatureCount = actions.filter((action) => action.href.startsWith("/portal/signatures")).length;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex flex-col gap-4 p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-4">
        <Card className="shadow-none">
          <CardContent>
            <StageChecklist stage={progress} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-12 gap-4">
          <Card className="relative col-span-12 overflow-hidden shadow-none xl:col-span-8 lg:min-h-48">
            <CardContent className="flex h-full flex-col justify-center gap-4 lg:pe-64">
              <div className="flex max-w-md flex-col gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {first}</h1>
                <p className="text-sm text-muted-foreground">
                  {current ? "Stay informed on this return. Here is the work still moving." : "Your return stays in one place. Here is the next step."}
                </p>
                {readOnly ? (
                  <Button className="mt-2 w-fit rounded-lg" disabled>
                    View documents
                    <ArrowRightIcon />
                  </Button>
                ) : (
                  <Button nativeButton={false} className="mt-2 w-fit rounded-lg" render={<Link href="/portal/documents" />}>
                    View documents
                    <ArrowRightIcon />
                  </Button>
                )}
              </div>
              <Image
                src="/images/backgrounds/analytic-user.svg"
                alt=""
                width={222}
                height={182}
                unoptimized
                className="greeting-art dark:hidden"
              />
              <Image
                src="/images/backgrounds/analytic-user-dark.svg"
                alt=""
                width={222}
                height={188}
                unoptimized
                className="greeting-art hidden dark:block"
              />
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-4">
            <CardContent className="flex h-full flex-col gap-4">
              <CardHeading icon={LightbulbIcon} title="Waiting on you" />
              <div>
                <p className="text-3xl font-semibold tabular-nums">{actions.length.toLocaleString("en-US")}</p>
                <p className="mt-1 text-xs text-muted-foreground">waiting on you</p>
              </div>
              <ul className="mt-auto flex flex-col gap-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="tabular-nums">{documentCount.toLocaleString("en-US")}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Signatures</span>
                  <span className="tabular-nums">{signatureCount.toLocaleString("en-US")}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {officeHours.saved ? (
            <Card className="col-span-12 shadow-none">
              <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
                <div className="grid gap-2">
                  <CardHeading icon={ClockIcon} title="When we reply" />
                  <p className="text-sm text-muted-foreground">Send a message any time. We answer it during these hours.</p>
                </div>
                <ReplyHours reply={replyExpectation(officeHours.hours)} lines={summarizeHours(officeHours.hours)} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="col-span-12 shadow-none xl:col-span-8">
            <CardContent className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <CardHeading icon={FileTextIcon} title="What needs you" />
                {readOnly ? (
                  <Button variant="outline" size="sm" disabled>Documents</Button>
                ) : (
                  <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/portal/documents" />}>
                    Documents
                  </Button>
                )}
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing is waiting on you. We will message you if that changes.</p>
              ) : (
                <ul>
                  {actions.map((action) => (
                    <li key={action.id} className="border-b py-3 last:border-b-0">
                      <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{action.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{action.detail}</p>
                        </div>
                        {readOnly ? (
                          <Button size="sm" className="w-fit" disabled>Open</Button>
                        ) : (
                          <Button nativeButton={false} size="sm" className="w-fit" render={<Link href={action.href} />}>
                            Open
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none xl:col-span-4">
            <CardContent className="flex h-full flex-col gap-5">
              <CardHeading icon={UserRoundIcon} title="Your tax professional" />
              <div className="flex items-center gap-3">
                {owner ? (
                  <PortalAvatar id={owner.id} name={owner.name} email={owner.email} avatarPath={owner.avatarPath} className="size-9" />
                ) : (
                  <PortalAvatar id="firm" name={firm.representative} email={firm.email} avatarPath={null} className="size-9" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{preparerName}</p>
                  <p className="truncate text-xs text-muted-foreground">{owner ? "Assigned to this return" : firm.name}</p>
                </div>
              </div>
              {readOnly ? (
                <Button variant="outline" className="mt-auto w-fit" disabled>
                  Message
                  <ArrowRightIcon />
                </Button>
              ) : (
                <Button nativeButton={false} variant="outline" className="mt-auto w-fit" render={<Link href="/portal/messages" />}>
                  Message
                  <ArrowRightIcon />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 shadow-none">
            <CardContent className="flex flex-col gap-4">
              <CardHeading icon={FileTextIcon} title="Activity" />
              {activity.length === 0 ? (
                <LiniqoEmpty {...liniqo.notice} className="px-0 py-4" artClassName="size-24">Nothing recorded yet.</LiniqoEmpty>
              ) : (
                <ActivityTimeline items={activity} />
              )}
            </CardContent>
          </Card>

          {sentInvoices.length > 0 ? (
            <Card id="invoice" className="col-span-12 shadow-none">
              <CardContent className="flex flex-col gap-3">
                <CardHeading icon={FileTextIcon} title="Invoice" />
                {sentInvoices.map((item) => {
                  const taxReturn = mine.find((row) => row.id === item.returnId);
                  return (
                    <div key={item.id} className="grid gap-1 text-sm">
                      <p className="font-medium">
                        ${formatDollars(item.amountCents)}
                        {taxReturn ? ` · ${taxReturn.entity} ${taxReturn.taxYear}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap text-muted-foreground">{item.instructions || "The firm has not added payment instructions yet."}</p>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">This portal does not charge a card. Use the instructions above.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
