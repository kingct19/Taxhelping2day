"use client";

import { Children, cloneElement, isValidElement, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { useSavedState } from "@/hooks/use-saved-state";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { deleteAutomationAction, saveAutomationAction, setAutomationEnabledAction } from "@/lib/automation-actions";
import {
  actionSummary,
  automationEvents,
  eventLabel,
  triggerSummary,
  type Automation,
  type AutomationDraft,
  type FirmTag,
} from "@/lib/automations";
import { stages, stageOrder } from "@/lib/return-workflow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "All" },
  { id: "move", label: "Move stage" },
  { id: "email", label: "Send email" },
  { id: "tag", label: "Tag" },
] as const;

type FilterId = (typeof filters)[number]["id"];

function isFilterId(value: unknown): value is FilterId {
  return filters.some((item) => item.id === value);
}

function tagName(tags: FirmTag[], id: string) {
  return tags.find((tag) => tag.id === id)?.name ?? "a deleted tag";
}

function shown(rule: Automation, filter: FilterId) {
  switch (filter) {
    case "all":
      return true;
    case "move":
      return Boolean(rule.moveToStage);
    case "email":
      return Boolean(rule.emailSubject);
    case "tag":
      return Boolean(rule.addTagId || rule.removeTagId || rule.triggerKind === "tag_added" || rule.triggerKind === "tag_removed");
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

function blankDraft(tags: FirmTag[]): AutomationDraft {
  return {
    name: "",
    enabled: true,
    triggerKind: "event",
    event: "invited",
    stage: "lead",
    afterDays: 1,
    tagId: tags[0]?.id ?? null,
    conditionTagId: null,
    conditionMode: null,
    moveToStage: "onboarding",
    emailSubject: "",
    emailBody: "",
    addTagId: null,
    removeTagId: null,
  };
}

function fromRule(rule: Automation): AutomationDraft {
  return { ...rule, emailSubject: rule.emailSubject ?? "", emailBody: rule.emailBody ?? "" };
}

export function AutomationDesk({ rules, tags }: { rules: Automation[]; tags: FirmTag[] }) {
  const router = useRouter();
  const [filter, setFilter] = useSavedState<FilterId>("view:automations", "all", isFilterId);
  const [draft, setDraft] = useState<AutomationDraft | null>(null);
  const [moveOn, setMoveOn] = useState(true);
  const [emailOn, setEmailOn] = useState(false);
  const [emailOpen, setEmailOpen] = useState(true);
  const [addOn, setAddOn] = useState(false);
  const [removeOn, setRemoveOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const nameOf = (id: string) => tagName(tags, id);

  function openEditor(rule: Automation | null) {
    const next = rule ? fromRule(rule) : blankDraft(tags);
    setDraft(next);
    setMoveOn(Boolean(next.moveToStage));
    setEmailOn(Boolean(next.emailSubject));
    setEmailOpen(!next.emailSubject);
    setAddOn(Boolean(next.addTagId));
    setRemoveOn(Boolean(next.removeTagId));
    setError(null);
  }

  function save() {
    if (!draft) return;
    const tagFallback = tags[0]?.id ?? null;
    const wantsTag = draft.triggerKind === "tag_added" || draft.triggerKind === "tag_removed";
    const payload: AutomationDraft = {
      ...draft,
      tagId: wantsTag ? draft.tagId ?? tagFallback : draft.tagId,
      conditionTagId: draft.conditionMode ? draft.conditionTagId ?? tagFallback : null,
      moveToStage: moveOn ? draft.moveToStage : null,
      emailSubject: emailOn ? draft.emailSubject : null,
      emailBody: emailOn ? draft.emailBody : null,
      addTagId: addOn ? draft.addTagId ?? tagFallback : null,
      removeTagId: removeOn ? draft.removeTagId ?? tagFallback : null,
    };
    startTransition(async () => {
      const result = await saveAutomationAction(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  if (draft) {
    const choice = whenChoice(draft);
    return (
      <AutomationFlow
        draft={draft}
        tags={tags}
        choice={choice}
        pending={pending}
        error={error}
        moveOn={moveOn}
        emailOn={emailOn}
        emailOpen={emailOpen}
        addOn={addOn}
        removeOn={removeOn}
        bodyRef={bodyRef}
        onDraft={setDraft}
        onCancel={() => setDraft(null)}
        onSave={save}
        onMove={setMoveOn}
        onEmail={setEmailOn}
        onEmailOpen={setEmailOpen}
        onAdd={setAddOn}
        onRemove={setRemoveOn}
      />
    );
  }

  const visible = rules.filter((rule) => shown(rule, filter));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <Button key={item.id} type="button" size="sm" variant={filter === item.id ? "secondary" : "outline"} onClick={() => setFilter(item.id)}>
            {item.label}
            <span className="text-muted-foreground">{item.id === "all" ? rules.length : rules.filter((rule) => shown(rule, item.id)).length}</span>
          </Button>
        ))}
        <Button type="button" className="ml-auto" onClick={() => openEditor(null)}>Create automation</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {visible.length === 0 ? <p className="px-3 py-6 text-sm text-muted-foreground">No automations in this view.</p> : null}
        {visible.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{rule.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {triggerSummary(rule, nameOf)}
                <span className="px-1.5 text-[#2563eb]">→</span>
                {actionSummary(rule, nameOf)}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={rule.enabled}
              aria-label={rule.enabled ? `Turn off ${rule.name}` : `Turn on ${rule.name}`}
              className={cn("relative h-5 w-9 rounded-full", rule.enabled ? "bg-primary" : "bg-muted")}
              onClick={() => {
                startTransition(async () => {
                  await setAutomationEnabledAction(rule.id, !rule.enabled);
                  router.refresh();
                });
              }}
            >
              <span className={cn("absolute top-0.5 size-4 rounded-full bg-white", rule.enabled ? "left-4" : "left-0.5")} />
            </button>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => openEditor(rule)}>Edit</Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!window.confirm(`Delete ${rule.name}?`)) return;
                  startTransition(async () => {
                    await deleteAutomationAction(rule.id);
                    router.refresh();
                  });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const messageTokens = [
  { token: "{{client_name}}", label: "Client name" },
  { token: "{{firm_name}}", label: "Firm name" },
  { token: "{{portal_link}}", label: "Portal link" },
] as const;

const whenOptions = [
  ...automationEvents.map((event) => ({ id: event, label: eventLabel(event) })),
  { id: "entered_stage", label: "the return enters" },
  { id: "stage_age", label: "the return has been in" },
  { id: "tag_added", label: "the tag is added" },
  { id: "tag_removed", label: "the tag is removed" },
] as const;

type WhenChoice = (typeof whenOptions)[number]["id"];

function isWhenChoice(value: string): value is WhenChoice {
  return whenOptions.some((option) => option.id === value);
}

function whenChoice(draft: AutomationDraft): WhenChoice {
  if (draft.triggerKind === "event" && draft.event && isWhenChoice(draft.event)) return draft.event;
  if (draft.triggerKind !== "event" && isWhenChoice(draft.triggerKind)) return draft.triggerKind;
  return "invited";
}

function applyWhen(draft: AutomationDraft, choice: WhenChoice): AutomationDraft {
  switch (choice) {
    case "entered_stage":
    case "stage_age":
    case "tag_added":
    case "tag_removed":
      return { ...draft, triggerKind: choice, event: null };
    case "invited":
    case "accepted":
    case "profile_complete":
    case "documents_ready":
    case "efile_signed":
    case "filing_accepted":
    case "return_cancelled":
      return { ...draft, triggerKind: "event", event: choice };
    default: {
      const exhaustive: never = choice;
      return exhaustive;
    }
  }
}

function AutomationFlow({
  draft,
  tags,
  choice,
  pending,
  error,
  moveOn,
  emailOn,
  emailOpen,
  addOn,
  removeOn,
  bodyRef,
  onDraft,
  onCancel,
  onSave,
  onMove,
  onEmail,
  onEmailOpen,
  onAdd,
  onRemove,
}: {
  draft: AutomationDraft;
  tags: FirmTag[];
  choice: WhenChoice;
  pending: boolean;
  error: string | null;
  moveOn: boolean;
  emailOn: boolean;
  emailOpen: boolean;
  addOn: boolean;
  removeOn: boolean;
  bodyRef: RefObject<HTMLTextAreaElement | null>;
  onDraft: (next: AutomationDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  onMove: (next: boolean) => void;
  onEmail: (next: boolean) => void;
  onEmailOpen: (next: boolean) => void;
  onAdd: (next: boolean) => void;
  onRemove: (next: boolean) => void;
}) {
  const steps: ReactNode[] = [];
  let actions = 0;
  function leadWord() {
    const word = actions === 0 ? "then" : "and";
    actions += 1;
    return word;
  }
  if (emailOn) {
    const lead = leadWord();
    steps.push(
      <FlowItem key="email" marker="branch">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span>{lead} send</span>
            <PillSelect value="email" onChange={() => undefined} label="Channel">
              <option value="email">Email</option>
            </PillSelect>
            <span>to the client</span>
            <RemoveStep label="Remove email" onClick={() => onEmail(false)} />
          </div>
          <EmailCard
            open={emailOpen}
            subject={draft.emailSubject ?? ""}
            body={draft.emailBody ?? ""}
            bodyRef={bodyRef}
            onOpen={onEmailOpen}
            onSubject={(emailSubject) => onDraft({ ...draft, emailSubject })}
            onBody={(emailBody) => onDraft({ ...draft, emailBody })}
          />
        </div>
      </FlowItem>,
    );
  }
  if (moveOn) {
    const lead = leadWord();
    steps.push(
      <FlowItem key="move" marker="branch">
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <span>{lead} update the stage to</span>
          <PillSelect value={draft.moveToStage ?? "onboarding"} onChange={(moveToStage) => onDraft({ ...draft, moveToStage })} label="Stage">
            {[...stageOrder, "canceled" as const].map((stage) => (
              <option key={stage} value={stage}>{stages[stage]}</option>
            ))}
          </PillSelect>
          <RemoveStep label="Remove stage change" onClick={() => onMove(false)} />
        </div>
      </FlowItem>,
    );
  }
  if (addOn) {
    const lead = leadWord();
    steps.push(
      <FlowItem key="add" marker="branch">
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <span>{lead} add the tag</span>
          <TagPill tags={tags} value={draft.addTagId} onChange={(addTagId) => onDraft({ ...draft, addTagId })} />
          <RemoveStep label="Remove add tag" onClick={() => onAdd(false)} />
        </div>
      </FlowItem>,
    );
  }
  if (removeOn) {
    const lead = leadWord();
    steps.push(
      <FlowItem key="remove" marker="branch">
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <span>{lead} remove the tag</span>
          <TagPill tags={tags} value={draft.removeTagId} onChange={(removeTagId) => onDraft({ ...draft, removeTagId })} />
          <RemoveStep label="Remove remove tag" onClick={() => onRemove(false)} />
        </div>
      </FlowItem>,
    );
  }

  const extras = [
    !emailOn ? { id: "email", label: "send an email", onClick: () => {
      onEmail(true);
      onEmailOpen(false);
      if (!draft.emailSubject && !draft.emailBody) {
        onDraft({ ...draft, emailSubject: "A note from {{firm_name}}", emailBody: "Hi {{client_name}}, sign in when you can: {{portal_link}}" });
      }
    } } : null,
    !moveOn ? { id: "move", label: "update the stage", onClick: () => {
      onMove(true);
      if (!draft.moveToStage) onDraft({ ...draft, moveToStage: "onboarding" });
    } } : null,
    !addOn ? { id: "add", label: "add a tag", onClick: () => onAdd(true) } : null,
    !removeOn ? { id: "remove", label: "remove a tag", onClick: () => onRemove(true) } : null,
  ].filter((item) => item !== null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="automation-name"
          aria-label="Automation name"
          value={draft.name}
          onChange={(event) => onDraft({ ...draft, name: event.target.value })}
          placeholder="Name this automation"
          className="h-9 min-w-48 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
        />
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" disabled={pending}>Save</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="rounded-xl bg-[#f4f7fb] px-4 py-8 sm:px-10 dark:bg-muted/30">
        <Flow>
          <FlowItem marker="dot">
            <div className="flex flex-wrap items-center gap-2">
              <span>When</span>
              <PillSelect
                value={choice}
                label="When this happens"
                onChange={(value) => {
                  if (isWhenChoice(value)) onDraft(applyWhen(draft, value));
                }}
              >
                {whenOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </PillSelect>
              {choice === "entered_stage" || choice === "stage_age" ? (
                <PillSelect value={draft.stage ?? "lead"} label="Stage" onChange={(stage) => onDraft({ ...draft, stage })}>
                  {stageOrder.map((stage) => (
                    <option key={stage} value={stage}>{stages[stage]}</option>
                  ))}
                </PillSelect>
              ) : null}
              {choice === "stage_age" ? (
                <>
                  <span>for</span>
                  <input
                    aria-label="Days"
                    inputMode="numeric"
                    value={draft.afterDays ?? 0}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onDraft({ ...draft, afterDays: Number.isFinite(next) ? next : 0 });
                    }}
                    className="h-9 w-16 rounded-lg border border-neutral-200 bg-white px-3 text-sm shadow-sm dark:border-input dark:bg-background"
                  />
                  <span>days</span>
                </>
              ) : null}
              {choice === "tag_added" || choice === "tag_removed" ? (
                <TagPill tags={tags} value={draft.tagId} onChange={(tagId) => onDraft({ ...draft, tagId })} />
              ) : null}
            </div>
          </FlowItem>
          <FlowItem marker="dot">
            <div className="flex flex-wrap items-center gap-2">
              <span>and</span>
              {draft.conditionMode ? (
                <>
                  <span>only if the return</span>
                  <PillSelect
                    value={draft.conditionMode}
                    label="Tag condition"
                    onChange={(conditionMode) => onDraft({ ...draft, conditionMode: conditionMode || null })}
                  >
                    <option value="has">has</option>
                    <option value="missing">does not have</option>
                  </PillSelect>
                  <TagPill tags={tags} value={draft.conditionTagId} onChange={(conditionTagId) => onDraft({ ...draft, conditionTagId })} />
                  <RemoveStep label="Remove condition" onClick={() => onDraft({ ...draft, conditionMode: null, conditionTagId: null })} />
                </>
              ) : (
                <AddStep onClick={() => onDraft({ ...draft, conditionMode: "has" })}>only if the return has a tag</AddStep>
              )}
            </div>
          </FlowItem>
          {steps}
          {extras.length > 0 ? (
            <FlowItem marker="dot">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>and</span>
                {extras.map((item) => (
                  <AddStep key={item.id} onClick={item.onClick}>{item.label}</AddStep>
                ))}
              </div>
            </FlowItem>
          ) : null}
        </Flow>
      </div>
    </form>
  );
}

function Flow({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {items.map((child, index) =>
        isValidElement<{ last?: boolean }>(child)
          ? cloneElement(child, { last: index === items.length - 1 })
          : child,
      )}
    </div>
  )
}

function FlowItem({
  marker,
  last = false,
  children,
}: {
  marker: "dot" | "branch"
  last?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative min-h-9 pl-14 text-base text-foreground">
      {last ? null : (
        <span aria-hidden className="absolute top-[18px] left-1 h-[calc(100%+2rem)] w-px bg-[#2563eb]" />
      )}
      {marker === "dot" ? (
        <span aria-hidden className="absolute top-[18px] left-[calc(0.25rem+0.5px)] z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563eb]" />
      ) : (
        <span aria-hidden className="absolute top-[6px] left-1 h-3 w-8">
          <span className="absolute inset-0 rounded-bl-[6px] border-b border-l border-[#2563eb]" />
          <span className="absolute right-0 bottom-0 size-1.5 translate-x-1/2 translate-y-1/2 rotate-45 border-t border-r border-[#2563eb]" />
        </span>
      )}
      {children}
    </div>
  )
}

function AddStep({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-[#2563eb]/20 bg-white px-2.5 text-sm text-[#2563eb] shadow-sm hover:border-[#2563eb]/40 hover:bg-[#eff4ff] dark:bg-background dark:hover:bg-[#2563eb]/10"
    >
      <PlusIcon className="size-3.5" />
      {children}
    </button>
  )
}

function RemoveStep({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} className="text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={onClick}>
      Remove
    </button>
  );
}

function PillSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex max-w-full">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 max-w-64 appearance-none rounded-lg border border-neutral-200 bg-white pr-8 pl-3 text-sm text-neutral-900 shadow-sm dark:border-input dark:bg-background dark:text-foreground"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-neutral-500" />
    </span>
  );
}

function TagPill({ tags, value, onChange }: { tags: FirmTag[]; value: string | null; onChange: (id: string | null) => void }) {
  if (tags.length === 0) {
    return <Link href="/settings/tags" className="text-sm text-[#2563eb] underline">Add a tag first</Link>;
  }
  return (
    <PillSelect value={value ?? tags[0].id} label="Tag" onChange={onChange}>
      {tags.map((tag) => (
        <option key={tag.id} value={tag.id}>{tag.name}</option>
      ))}
    </PillSelect>
  );
}

function EmailCard({
  open,
  subject,
  body,
  bodyRef,
  onOpen,
  onSubject,
  onBody,
}: {
  open: boolean;
  subject: string;
  body: string;
  bodyRef: RefObject<HTMLTextAreaElement | null>;
  onOpen: (next: boolean) => void;
  onSubject: (value: string) => void;
  onBody: (value: string) => void;
}) {
  function insertToken(token: string) {
    const field = bodyRef.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? start;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    onBody(next);
    requestAnimationFrame(() => {
      field?.focus();
      const caret = start + token.length;
      field?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="w-full max-w-xl rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Email</p>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#2563eb] px-3 py-0.5 text-sm text-[#2563eb]"
          onClick={() => onOpen(!open)}
        >
          Edit
          <ChevronDownIcon className={cn("size-4", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Subject
            <input value={subject} onChange={(event) => onSubject(event.target.value)} className="h-9 rounded-lg border border-neutral-200 px-3 text-sm text-foreground dark:border-input dark:bg-background" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Message
            <textarea ref={bodyRef} value={body} onChange={(event) => onBody(event.target.value)} rows={4} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-foreground dark:border-input dark:bg-background" />
          </label>
          <div className="flex flex-wrap gap-1">
            {messageTokens.map((item) => (
              <button key={item.token} type="button" className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-xs text-neutral-700" onClick={() => insertToken(item.token)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-sm leading-6">
          {subject ? <p><span className="text-xs text-muted-foreground">Subject </span>{previewText(subject)}</p> : null}
          <p><span className="mb-1 block text-xs text-muted-foreground">Message</span>{body ? previewText(body) : <span className="text-muted-foreground">No message yet.</span>}</p>
        </div>
      )}
    </div>
  );
}

function previewText(value: string) {
  const parts = value.split(/(\{\{client_name\}\}|\{\{firm_name\}\}|\{\{portal_link\}\})/g);
  return parts.map((part, index) => {
    const label = tokenChip(part);
    if (!label) return <span key={`${part}-${index}`}>{part}</span>;
    return <span key={`${part}-${index}`} className="mx-0.5 inline-flex rounded bg-neutral-200/80 px-1.5 py-0.5 text-xs text-neutral-700">{label}</span>;
  });
}

function tokenChip(part: string): string | null {
  switch (part) {
    case "{{client_name}}":
      return "Client name";
    case "{{firm_name}}":
      return "Firm name";
    case "{{portal_link}}":
      return "Portal link";
    default:
      return null;
  }
}
