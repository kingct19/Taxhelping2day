import type { Message, RequestBlock, RequestState } from "@/lib/types";

export type RequestThread = { root: Message; latest: Message };

export function normalizeRequestState(value: string | null | undefined): RequestState | null {
  if (value === "received") return "responded";
  if (value === "open" || value === "responded" || value === "unavailable" || value === "replacement" || value === "accepted" || value === "waived") {
    return value;
  }
  return null;
}

export function normalizeRequestBlock(value: string | null | undefined): RequestBlock | null {
  if (value === "start" || value === "filing" || value === "info") return value;
  return null;
}

export function requestRoot(messages: Message[], id: string): Message | undefined {
  let current = messages.find((row) => row.id === id);
  const seen = new Set<string>();
  while (current?.previousId && !seen.has(current.id)) {
    seen.add(current.id);
    const prior = messages.find((row) => row.id === current?.previousId);
    if (!prior) break;
    current = prior;
  }
  return current;
}

export function requestThreads(messages: Message[]): RequestThread[] {
  const replies = new Map(messages.filter((row) => row.previousId).map((row) => [row.previousId, row]));
  return messages.filter((row) => row.requestState === "open").flatMap((root) => {
    let latest = root;
    const seen = new Set<string>();
    while (replies.has(latest.id) && !seen.has(latest.id)) {
      seen.add(latest.id);
      latest = replies.get(latest.id)!;
    }
    if (!latest.requestState) return [];
    return [{ root, latest }];
  });
}

export function clientOwes(state: RequestState): boolean {
  switch (state) {
    case "open":
    case "replacement":
      return true;
    case "responded":
    case "unavailable":
    case "accepted":
    case "waived":
      return false;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function staffOwes(state: RequestState): boolean {
  switch (state) {
    case "responded":
    case "unavailable":
      return true;
    case "open":
    case "replacement":
    case "accepted":
    case "waived":
      return false;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function requestLabel(state: RequestState, staff: boolean): string {
  switch (state) {
    case "open":
      return staff ? "Waiting on client" : "Waiting on you";
    case "responded":
      return staff ? "Needs your review" : "In review";
    case "unavailable":
      return staff ? "Client cannot supply this" : "Waiting for the firm to decide";
    case "replacement":
      return staff ? "Replacement requested" : "Please send a replacement";
    case "accepted":
      return "Accepted";
    case "waived":
      return "Waived";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function requestBlockLabel(block: RequestBlock): string {
  switch (block) {
    case "start":
      return "Blocks starting the return";
    case "filing":
      return "Blocks filing";
    case "info":
      return "Informational";
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}
