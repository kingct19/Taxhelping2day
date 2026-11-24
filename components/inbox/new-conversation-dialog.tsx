"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { createInboxConversation } from "@/lib/actions";
import type { InboxContact } from "@/components/inbox/inbox-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { channelLabel } from "@/lib/inbox-view";
import { conversationChannels, type ConversationChannel } from "@/lib/types";

export function NewConversationDialog({
  contacts,
  trigger,
  onCreated,
}: {
  contacts: InboxContact[];
  trigger: ReactElement;
  onCreated: (profileId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState(contacts[0]?.id ?? "");
  const [channel, setChannel] = useState<ConversationChannel>("chat");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const contactItems = contacts.map((contact) => ({ label: contact.name || contact.email, value: contact.id }));
  const channelItems = conversationChannels.map((item) => ({ label: channelLabel(item), value: item }));
  const canCreate = profileId.length > 0 && (subject.trim().length > 0 || message.trim().length > 0) && !pending;

  function reset() {
    setSubject("");
    setMessage("");
    setChannel("chat");
    setProfileId(contacts[0]?.id ?? "");
  }

  async function create() {
    if (!canCreate) return;
    setPending(true);
    const created = await createInboxConversation({ profileId, subject, channel, body: message });
    setPending(false);
    if (!created) return;
    setOpen(false);
    reset();
    onCreated(created);
    router.push(`/inbox?id=${created}`);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>Start a conversation with a client already on the desk.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nc-contact">Client</Label>
              <Select items={contactItems} value={profileId} onValueChange={(value) => { if (value) setProfileId(value); }}>
                <SelectTrigger id="nc-contact" className="w-full">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {contactItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-channel">Channel</Label>
              <Select items={channelItems} value={channel} onValueChange={(value) => { if (value === "chat" || value === "email" || value === "phone") setChannel(value); }}>
                <SelectTrigger id="nc-channel" className="w-full">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {channelItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-subject">Subject</Label>
            <Input id="nc-subject" value={subject} placeholder="How can we help?" onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-message">Message</Label>
            <Textarea id="nc-message" value={message} placeholder="Write the first message…" className="max-h-28 min-h-24 resize-none" onChange={(event) => setMessage(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" onClick={() => void create()} disabled={!canCreate} aria-busy={pending || undefined}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Create conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
