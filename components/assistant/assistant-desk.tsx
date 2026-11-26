"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { useSavedState } from "@/hooks/use-saved-state";
import Link from "next/link";
import { BranchSwitcher, BranchSwitcherContent, BranchSwitcherControl } from "@/components/ui/branch-switcher";
import { Citation, Citations, CitationSources, type CitationSource } from "@/components/ui/citations";
import { ContextMeter } from "@/components/ui/context-meter";
import { MessageActionCopy, MessageActionFeedback, MessageActionRegenerate, MessageActions, type MessageFeedback } from "@/components/ui/message-actions";
import { ModelPicker, type Model } from "@/components/ui/model-picker";
import { PromptInput, type PromptMessage } from "@/components/ui/prompt-input";
import { Reasoning } from "@/components/ui/reasoning";
import { ShimmerText } from "@/components/ui/shimmer-text";
import { StreamingText, type StreamStatus } from "@/components/ui/streaming-text";
import { Suggestion, Suggestions } from "@/components/ui/suggestions";
import { Filter, Message, Plus, Search } from "@/lib/icons";
import { cn } from "@/lib/utils";

const storageKey = "th2d-assistant-threads";
const contextLimit = 8000;

const models: Model[] = [
  {
    value: "desk",
    name: "Desk",
    description: "Keeps the thread in this browser. Does not call a model.",
    speed: 3,
    cost: 1,
  },
];

const librarySource: CitationSource[] = [
  {
    id: "library",
    url: "/library",
    title: "Internal Revenue Code",
    siteName: "Library",
    snippet: "Title 26, as kept on the firm library.",
    favicon: <span className="text-[10px] font-medium">L</span>,
  },
];

export type AssistantPerson = { id: string; name: string; email: string };

type Branch = {
  text: string;
  reasoning: string;
  cite: boolean;
  status: StreamStatus;
  feedback: MessageFeedback;
};

type UserTurn = { id: string; role: "user"; text: string };
type AssistantTurn = { id: string; role: "assistant"; index: number; branches: Branch[] };
type Turn = UserTurn | AssistantTurn;

type Thread = {
  id: string;
  title: string;
  clientId: string | null;
  turns: Turn[];
};

type StreamTarget = { threadId: string; turnId: string; index: number };

function deskReply(question: string, clientName: string | null, alternate: boolean) {
  const cite = /\b(irc|code|statute|regulation|irs|§|section)\b/i.test(question);
  const who = clientName ? ` The note sits beside ${clientName}.` : "";
  const text = alternate
    ? `Kept on this thread.${who} Open the library for the statute, and the client file when the work belongs on the return. This screen still does not call a model.`
    : `Saved on this thread.${who} This assistant keeps the note in this browser. It does not call a model, read a client file, or draft a return.`;
  return {
    text,
    cite,
    reasoning: "Checking that the note stays on this desk and is not sent out as a filing or a client reply.",
  };
}

function tokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

const emptyThreads: Thread[] = [];
let threadCache: Thread[] = emptyThreads;
let threadsLoaded = false;
const threadListeners = new Set<() => void>();

function readThreads() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return emptyThreads;
    const parsed = JSON.parse(saved) as Thread[];
    return Array.isArray(parsed) ? parsed : emptyThreads;
  } catch {
    return emptyThreads;
  }
}

function getThreads() {
  if (!threadsLoaded) {
    threadsLoaded = true;
    threadCache = readThreads();
  }
  return threadCache;
}

function subscribeThreads(listener: () => void) {
  threadListeners.add(listener);
  return () => threadListeners.delete(listener);
}

function setThreads(next: Thread[] | ((current: Thread[]) => Thread[])) {
  threadCache = typeof next === "function" ? next(threadCache) : next;
  window.localStorage.setItem(storageKey, JSON.stringify(threadCache));
  threadListeners.forEach((listener) => listener());
}

export function AssistantDesk({
  prompt,
  clients,
}: {
  prompt?: string;
  clients: AssistantPerson[];
}) {
  const threads = useSyncExternalStore(subscribeThreads, getThreads, () => emptyThreads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(prompt ?? "");
  const [seenPrompt, setSeenPrompt] = useState(prompt);
  const [model, setModel] = useSavedState("view:assistant-model", "desk", (value): value is string => typeof value === "string" && models.some((item) => item.value === value));
  const [generating, setGenerating] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const stream = useRef<StreamTarget | null>(null);
  const timer = useRef<number | null>(null);

  if (prompt !== seenPrompt) {
    setSeenPrompt(prompt);
    if (prompt) setDraft(prompt);
  }

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearInterval(timer.current);
    };
  }, []);

  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const needle = query.trim().toLowerCase();
  const visibleClients = clients.filter((client) => !needle || client.name.toLowerCase().includes(needle) || client.email.toLowerCase().includes(needle));
  const visibleThreads = threads.filter((thread) => {
    if (clientId && thread.clientId !== clientId) return false;
    if (!needle) return true;
    return thread.title.toLowerCase().includes(needle);
  });
  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  function stop() {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    const target = stream.current;
    stream.current = null;
    setGenerating(false);
    if (!target) return;
    setThreads((current) =>
      current.map((thread) => {
        if (thread.id !== target.threadId) return thread;
        return {
          ...thread,
          turns: thread.turns.map((turn) => {
            if (turn.role !== "assistant" || turn.id !== target.turnId) return turn;
            return {
              ...turn,
              branches: turn.branches.map((branch, index) => (index === target.index && branch.status === "streaming" ? { ...branch, status: "stopped" } : branch)),
            };
          }),
        };
      }),
    );
  }

  function play(target: StreamTarget, full: string) {
    stop();
    stream.current = target;
    setGenerating(true);
    let cursor = 0;
    timer.current = window.setInterval(() => {
      cursor = Math.min(full.length, cursor + Math.max(2, Math.ceil(full.length / 36)));
      const done = cursor >= full.length;
      const slice = full.slice(0, cursor);
      setThreads((current) =>
        current.map((thread) => {
          if (thread.id !== target.threadId) return thread;
          return {
            ...thread,
            turns: thread.turns.map((turn) => {
              if (turn.role !== "assistant" || turn.id !== target.turnId) return turn;
              return {
                ...turn,
                index: target.index,
                branches: turn.branches.map((branch, index) => (index === target.index ? { ...branch, text: slice, status: done ? "done" : "streaming" } : branch)),
              };
            }),
          };
        }),
      );
      if (done) {
        if (timer.current != null) window.clearInterval(timer.current);
        timer.current = null;
        stream.current = null;
        setGenerating(false);
      }
    }, 24);
  }

  function send(message: PromptMessage) {
    const files = message.attachments.map((file) => file.name).filter(Boolean);
    const text = [message.text.trim(), files.length > 0 ? `Files: ${files.join(", ")}` : ""].filter(Boolean).join("\n");
    if (!text) return;
    const reply = deskReply(text, selectedClient?.name ?? null, false);
    const threadId = active?.id ?? crypto.randomUUID();
    const turnId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const userTurn: UserTurn = { id: turnId, role: "user", text };
    const assistantTurn: AssistantTurn = {
      id: assistantId,
      role: "assistant",
      index: 0,
      branches: [{ text: "", reasoning: reply.reasoning, cite: reply.cite, status: "streaming", feedback: null }],
    };
    setThreads((current) => {
      const existing = current.find((thread) => thread.id === threadId);
      if (!existing) {
        const created: Thread = { id: threadId, title: message.text.trim().slice(0, 48) || "New thread", clientId, turns: [userTurn, assistantTurn] };
        return [created, ...current];
      }
      return current.map((thread) => (thread.id === threadId ? { ...thread, turns: [...thread.turns, userTurn, assistantTurn] } : thread));
    });
    setActiveId(threadId);
    setDraft("");
    play({ threadId, turnId: assistantId, index: 0 }, reply.text);
  }

  function regenerate(threadId: string, turn: AssistantTurn) {
    const user = threads.find((item) => item.id === threadId)?.turns.find((item) => item.role === "user");
    const question = user && user.role === "user" ? user.text : turn.branches[turn.index]?.text ?? "";
    const client = clients.find((item) => item.id === threads.find((thread) => thread.id === threadId)?.clientId);
    const reply = deskReply(question, client?.name ?? null, true);
    const index = turn.branches.length;
    setThreads((current) =>
      current.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          turns: thread.turns.map((item) =>
            item.id === turn.id && item.role === "assistant"
              ? { ...item, index, branches: [...item.branches, { text: "", reasoning: reply.reasoning, cite: reply.cite, status: "streaming", feedback: null }] }
              : item,
          ),
        };
      }),
    );
    play({ threadId, turnId: turn.id, index }, reply.text);
  }

  function setFeedback(threadId: string, turnId: string, index: number, feedback: MessageFeedback) {
    setThreads((current) =>
      current.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          turns: thread.turns.map((turn) => {
            if (turn.role !== "assistant" || turn.id !== turnId) return turn;
            return { ...turn, branches: turn.branches.map((branch, branchIndex) => (branchIndex === index ? { ...branch, feedback } : branch)) };
          }),
        };
      }),
    );
  }

  function setBranch(threadId: string, turnId: string, index: number) {
    setThreads((current) =>
      current.map((thread) => {
        if (thread.id !== threadId) return thread;
        return { ...thread, turns: thread.turns.map((turn) => (turn.role === "assistant" && turn.id === turnId ? { ...turn, index } : turn)) };
      }),
    );
  }

  const used = active
    ? active.turns.reduce((sum, turn) => {
        switch (turn.role) {
          case "user":
            return sum + tokens(turn.text);
          case "assistant":
            return sum + tokens(turn.branches[turn.index]?.text ?? "");
          default: {
            const exhaustive: never = turn;
            return exhaustive;
          }
        }
      }, 0)
    : 0;
  const lastTurn = active?.turns.at(-1);
  const showNext = lastTurn?.role === "assistant" && lastTurn.branches[lastTurn.index]?.status !== "streaming";

  return (
    <div className="flex h-full min-h-0 bg-page text-fg">
      <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-line px-3 py-4">
        <p className="px-1 text-sm font-semibold tracking-tight">Assistant</p>
        <div className="flex items-center gap-1.5">
          <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-raised px-3">
            <Search className="shrink-0 text-fg-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search clients and threads"
              className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-4"
            />
          </label>
          <button type="button" className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg" aria-label="Show every client" onClick={() => setClientId(null)}>
            <Filter />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          <section className="flex flex-col gap-1">
            <p className="px-2 text-[11px] font-medium tracking-[0.08em] text-fg-3 uppercase">Clients</p>
            <button
              type="button"
              onClick={() => setClientId(null)}
              className={cn("rounded-lg px-2 py-1.5 text-left text-sm", clientId === null ? "bg-hover font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg")}
            >
              All clients
            </button>
            {visibleClients.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-fg-3">No clients yet</p>
            ) : (
              visibleClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setClientId(client.id)}
                  className={cn("truncate rounded-lg px-2 py-1.5 text-left text-sm", clientId === client.id ? "bg-hover font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg")}
                >
                  {client.name}
                </button>
              ))
            )}
            <Link href="/contacts" className="mt-1 rounded-lg border border-line px-2 py-1.5 text-sm text-fg-2 hover:bg-hover hover:text-fg">
              + Add new client
            </Link>
          </section>
          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-2">
              <p className="text-[11px] font-medium tracking-[0.08em] text-fg-3 uppercase">Threads</p>
              <button
                type="button"
                aria-label="Start a thread"
                className="grid size-6 place-items-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
                onClick={() => {
                  setActiveId(null);
                  area.current?.focus();
                }}
              >
                <Plus />
              </button>
            </div>
            {visibleThreads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                <Message className="text-fg-4" />
                <p className="text-xs text-fg-3">{threads.length === 0 ? "Start your first thread" : "No threads here"}</p>
              </div>
            ) : (
              visibleThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveId(thread.id)}
                  className={cn("truncate rounded-lg px-2 py-1.5 text-left text-sm", activeId === thread.id ? "bg-hover font-medium text-fg" : "text-fg-2 hover:bg-hover hover:text-fg")}
                >
                  {thread.title}
                </button>
              ))
            )}
          </section>
        </div>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
              <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{active.title}</h1>
              <ContextMeter
                variant="ring"
                limit={contextLimit}
                segments={[
                  { id: "thread", label: "Thread", tokens: used },
                ]}
              />
              <ModelPicker models={models} value={model} onValueChange={setModel} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-6">
              {active.turns.map((turn) => {
                switch (turn.role) {
                  case "user":
                    return (
                      <p key={turn.id} className="max-w-xl self-end text-sm text-fg">
                        {turn.text}
                      </p>
                    );
                  case "assistant":
                    return (
                      <AssistantReply
                        key={turn.id}
                        turn={turn}
                        onBranch={(index) => setBranch(active.id, turn.id, index)}
                        onRegenerate={() => regenerate(active.id, turn)}
                        onFeedback={(index, feedback) => setFeedback(active.id, turn.id, index, feedback)}
                      />
                    );
                  default: {
                    const exhaustive: never = turn;
                    return exhaustive;
                  }
                }
              })}
              {showNext ? (
                <Suggestions label="Next questions" onPick={(next) => { setDraft(next); area.current?.focus(); }}>
                  <Suggestion prompt="What is still open on this client?">What is still open</Suggestion>
                  <Suggestion prompt="Where is the statute for this question?">Open the library</Suggestion>
                  <Suggestion prompt="What should the firm do next on this file?">Next step on the file</Suggestion>
                </Suggestions>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <h1 className="text-center font-serif text-[2rem] leading-tight font-normal tracking-tight text-fg">How can I support your firm today?</h1>
            <div className="mt-16 w-full max-w-xl">
              <Composer draft={draft} onDraft={setDraft} onSend={send} onStop={stop} generating={generating} area={area} />
            </div>
          </div>
        )}
        {active ? (
          <div className="px-6 pt-2 pb-6">
            <div className="mx-auto w-full max-w-2xl">
              <Composer draft={draft} onDraft={setDraft} onSend={send} onStop={stop} generating={generating} area={area} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Composer({
  draft,
  onDraft,
  onSend,
  onStop,
  generating,
  area,
}: {
  draft: string;
  onDraft: (value: string) => void;
  onSend: (message: PromptMessage) => void;
  onStop: () => void;
  generating: boolean;
  area: RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <PromptInput
      value={draft}
      onValueChange={onDraft}
      onSend={onSend}
      onStop={onStop}
      generating={generating}
      textareaRef={area}
      placeholder="Give me a task or question to work on..."
      label="Task or question"
      accept="image/*,.pdf"
      maxFiles={5}
    />
  );
}

function AssistantReply({
  turn,
  onBranch,
  onRegenerate,
  onFeedback,
}: {
  turn: AssistantTurn;
  onBranch: (index: number) => void;
  onRegenerate: () => void;
  onFeedback: (index: number, feedback: MessageFeedback) => void;
}) {
  return (
    <BranchSwitcher count={turn.branches.length} value={turn.index} onValueChange={onBranch} className="flex max-w-2xl flex-col gap-2 self-start">
      <BranchSwitcherContent>
        {(index) => {
          const branch = turn.branches[index];
          if (!branch) return null;
          return (
            <div className="flex flex-col gap-3">
              <Reasoning streaming={branch.status === "streaming" && branch.text.length === 0}>{branch.reasoning}</Reasoning>
              {branch.status === "streaming" && branch.text.length === 0 ? <ShimmerText>Reading the request</ShimmerText> : null}
              {branch.cite ? (
                <Citations sources={librarySource}>
                  <StreamingText text={branch.text} status={branch.status} />
                  <Citation id="library" />
                  <CitationSources />
                </Citations>
              ) : (
                <StreamingText text={branch.text} status={branch.status} />
              )}
              {branch.status !== "streaming" ? (
                <div className="flex items-center gap-2">
                  <MessageActions>
                    <MessageActionCopy value={branch.text} />
                    <MessageActionRegenerate onRegenerate={onRegenerate} />
                    <MessageActionFeedback value={branch.feedback} onValueChange={(feedback) => onFeedback(index, feedback)} />
                  </MessageActions>
                  <BranchSwitcherControl />
                </div>
              ) : null}
            </div>
          );
        }}
      </BranchSwitcherContent>
    </BranchSwitcher>
  );
}
