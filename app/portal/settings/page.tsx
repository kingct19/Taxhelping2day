import { ThemeToggle } from "@/components/desk/theme-toggle";
import { ReplyHours } from "@/components/portal/reply-hours";
import { requireProfile } from "@/lib/auth";
import { firm } from "@/lib/firm";
import { replyExpectation, summarizeHours } from "@/lib/office-hours";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  const profile = await requireProfile("client");
  const officeHours = await getStore().getOfficeHours();
  return (
    <div className="grid max-w-xl gap-5">
      <header className="grid gap-1">
        <h1 className="font-serif text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Sign-in and display for this portal.</p>
      </header>
      <section className="grid gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="text-sm">{profile.email}</p>
        <p className="text-sm text-muted-foreground">You sign in with a code sent to this email. Ask the firm if it needs to change.</p>
      </section>
      <section className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <div>
          <h2 className="text-sm font-medium">Appearance</h2>
          <p className="text-sm text-muted-foreground">Light or dark for this browser.</p>
        </div>
        <ThemeToggle />
      </section>
      {officeHours.saved ? (
        <section className="grid gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <h2 className="text-sm font-medium">When we reply</h2>
          <ReplyHours reply={replyExpectation(officeHours.hours)} lines={summarizeHours(officeHours.hours)} />
        </section>
      ) : null}
      <section className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <h2 className="text-sm font-medium">Help</h2>
        <p className="mt-1 text-sm text-muted-foreground">Questions about a return belong in Messages. For account access, email the firm.</p>
        <a className="mt-2 inline-block text-sm underline" href={`mailto:${firm.email}`}>{firm.email}</a>
      </section>
    </div>
  );
}
