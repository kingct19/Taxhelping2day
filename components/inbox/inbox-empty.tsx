import { LiniqoArt, liniqo } from "@/components/liniqo-empty";

export function InboxEmpty() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <LiniqoArt {...liniqo.liveChat} className="size-36" />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-2xl font-semibold text-foreground xl:text-3xl">Select a conversation</p>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">
          Choose a conversation from the inbox to read the thread, see the client, and reply.
        </p>
      </div>
    </div>
  );
}
