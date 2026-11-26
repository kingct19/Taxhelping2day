import type { StaffRank, StaffStatus } from "@/lib/teammates";

export const taxpayerTypes = ["individual", "business", "nonprofit"] as const;
export type TaxpayerType = (typeof taxpayerTypes)[number];

export const documentKinds = ["w2", "1099", "prior_return", "photo_id", "other"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const signatureKinds = ["engagement", "poa"] as const;
export type SignatureKind = (typeof signatureKinds)[number];

export const requestStates = ["open", "responded", "unavailable", "replacement", "accepted", "waived"] as const;
export type RequestState = (typeof requestStates)[number];

export const requestBlocks = ["start", "filing", "info"] as const;
export type RequestBlock = (typeof requestBlocks)[number];

export const filingStatuses = ["draft", "changes", "signature", "transmitted", "accepted", "rejected"] as const;
export type FilingStatus = (typeof filingStatuses)[number];

export const filingJurisdictions = ["federal", "state"] as const;
export type FilingJurisdiction = (typeof filingJurisdictions)[number];

export const leadSources = ["inquiry", "referral", "returning"] as const;
export type LeadSource = (typeof leadSources)[number];

export const serviceLines = ["tax_return", "bookkeeping", "payroll", "estimates", "planning"] as const;
export type ServiceLine = (typeof serviceLines)[number];

export const invoiceStatuses = ["draft", "sent", "paid", "waived"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export type Invoice = {
  id: string;
  returnId: string;
  amountCents: number;
  status: InvoiceStatus;
  instructions: string;
  updatedAt: string;
};

export type FilingRecord = {
  id: string;
  returnId: string;
  jurisdiction: FilingJurisdiction;
  region: string;
  status: FilingStatus;
  note: string;
  updatedAt: string;
};

export const efileSigners = ["taxpayer", "spouse"] as const;
export type EfileSigner = (typeof efileSigners)[number];

export const efileMethods = ["manual", "attested"] as const;
export type EfileMethod = (typeof efileMethods)[number];

export type EfileAuthorization = {
  id: string;
  returnId: string;
  signer: EfileSigner;
  returnVersion: number;
  method: EfileMethod | null;
  status: "needed" | "signed";
  signedAt: string | null;
  evidence: string;
};

export const taskKinds = ["invite", "kickoff", "review"] as const;
export type TaskKind = (typeof taskKinds)[number];
export type TaskStatus = "open" | "done";

export type ClientTask = {
  id: string;
  profileId: string;
  kind: TaskKind;
  status: TaskStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Role = "client" | "staff";

export type Profile = {
  id: string;
  email: string;
  role: Role;
  staffRank: StaffRank;
  staffStatus: StaffStatus;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxpayerType: TaxpayerType;
  filingTypes?: string[];
  taxIdLast4: string | null;
  spouseName: string;
  taxYears: string;
  createdAt: string;
  starred: boolean;
  snoozedUntil: string | null;
  avatarPath: string | null;
  portalAcceptedAt: string | null;
};

export type ProfileUpdate = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxpayerType: TaxpayerType;
  filingTypes?: string[];
  spouseName: string;
  taxYears: string;
  taxId?: string;
};

export type DocumentRecord = {
  id: string;
  profileId: string;
  returnId: string | null;
  kind: DocumentKind;
  filename: string;
  contentType: string;
  createdAt: string;
};

export type SignatureRecord = {
  id: string;
  profileId: string;
  kind: SignatureKind;
  signedAt: string;
  ip: string;
  userAgent: string;
};

export const messageDeliveries = ["sent", "seen", "not-seen"] as const;
export type MessageDelivery = (typeof messageDeliveries)[number];

export type MessageAttachment = {
  id: string;
  name: string;
  size: string;
  type: "image" | "file";
  documentId: string | null;
  url: string;
};

export type Message = {
  requestState?: RequestState | null;
  requestBlock?: RequestBlock | null;
  previousId?: string | null;
  returnId?: string | null;
  documentId?: string | null;
  signatureId?: string | null;
  id: string;
  profileId: string;
  authorId: string;
  authorRole: Role;
  body: string;
  kind: "message" | "event" | "note";
  createdAt: string;
  conversationId: string | null;
  delivery: MessageDelivery | null;
  attachments: MessageAttachment[];
};

export const conversationChannels = ["chat", "email", "phone"] as const;
export type ConversationChannel = (typeof conversationChannels)[number];

export const conversationStatuses = ["open", "snoozed", "closed"] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

export const conversationPriorities = ["none", "low", "medium", "high", "urgent"] as const;
export type ConversationPriority = (typeof conversationPriorities)[number];

export const teamInboxIds = ["prep", "review", "client-care"] as const;
export type TeamInboxId = (typeof teamInboxIds)[number];

export type Conversation = {
  id: string;
  profileId: string;
  subject: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  priority: ConversationPriority;
  assigneeId: string | null;
  teamInbox: TeamInboxId | null;
  tags: string[];
  unreadCount: number;
  starred: boolean;
  mentioned: boolean;
  createdByMe: boolean;
  isSpam: boolean;
  suggestions: string[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationPatch = Partial<
  Pick<
    Conversation,
    | "subject"
    | "channel"
    | "status"
    | "priority"
    | "assigneeId"
    | "teamInbox"
    | "tags"
    | "unreadCount"
    | "starred"
    | "mentioned"
    | "createdByMe"
    | "isSpam"
    | "suggestions"
  >
>;

export type IdentityNote = {
  profileId: string;
  attested: boolean;
  note: string;
  attestedAt: string | null;
  attestedBy: string | null;
};

export function documentKindLabel(kind: DocumentKind): string {
  switch (kind) {
    case "w2":
      return "W-2";
    case "1099":
      return "1099";
    case "prior_return":
      return "Prior-year return";
    case "photo_id":
      return "Photo ID";
    case "other":
      return "Other";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function orderedFilingTypes(types: readonly string[], allowed?: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const source = allowed ? allowed.filter((id) => types.includes(id)) : types;
  for (const value of source) {
    const id = value.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,40}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function filingTypesOf(profile: Pick<Profile, "taxpayerType" | "filingTypes">): string[] {
  if (profile.filingTypes === undefined) return [profile.taxpayerType];
  return orderedFilingTypes(profile.filingTypes);
}

export function primaryFilingType(types: readonly string[]): TaxpayerType {
  if (types.includes("individual")) return "individual";
  if (types.includes("business")) return "business";
  if (types.includes("nonprofit")) return "nonprofit";
  return "individual";
}

export function isTaxpayerType(value: string): value is TaxpayerType {
  return taxpayerTypes.some((item) => item === value);
}

export function taxpayerTypeLabel(type: TaxpayerType): string {
  switch (type) {
    case "individual":
      return "Individual";
    case "business":
      return "Business";
    case "nonprofit":
      return "Non-profit";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function taskTitle(kind: TaskKind): string {
  switch (kind) {
    case "invite":
      return "Send the portal invite";
    case "kickoff":
      return "Kick off the season";
    case "review":
      return "Review the return";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function taskDetail(kind: TaskKind): string {
  switch (kind) {
    case "invite":
      return "The client needs the portal invitation before they can send records.";
    case "kickoff":
      return "Confirm the work, the fee, and what this season still needs.";
    case "review":
      return "Review the return with the client before it is filed.";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function isTaskStatus(value: string): value is TaskStatus {
  return value === "open" || value === "done";
}

export function taxFormFor(type: TaxpayerType): string {
  switch (type) {
    case "individual":
      return "1040";
    case "business":
      return "1120";
    case "nonprofit":
      return "990";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export type TaxReturn = {
  id: string;
  profileId: string;
  taxYear: number;
  entity: string;
  taxpayerType: TaxpayerType;
  filingTypeId?: string;
  returnVersion: number;
};

export function isRequestState(value: string): value is RequestState {
  return requestStates.some((item) => item === value);
}

export function isRequestBlock(value: string): value is RequestBlock {
  return requestBlocks.some((item) => item === value);
}

export function isFilingStatus(value: string): value is FilingStatus {
  return filingStatuses.some((item) => item === value);
}

export function isFilingJurisdiction(value: string): value is FilingJurisdiction {
  return filingJurisdictions.some((item) => item === value);
}

export function isLeadSource(value: string): value is LeadSource {
  return leadSources.some((item) => item === value);
}

export function isServiceLine(value: string): value is ServiceLine {
  return serviceLines.some((item) => item === value);
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return invoiceStatuses.some((item) => item === value);
}

export function isEfileSigner(value: string): value is EfileSigner {
  return efileSigners.some((item) => item === value);
}

export function isConversationChannel(value: string): value is ConversationChannel {
  return conversationChannels.some((item) => item === value);
}

export function isConversationStatus(value: string): value is ConversationStatus {
  return conversationStatuses.some((item) => item === value);
}

export function isConversationPriority(value: string): value is ConversationPriority {
  return conversationPriorities.some((item) => item === value);
}

export function isTeamInbox(value: string): value is TeamInboxId {
  return teamInboxIds.some((item) => item === value);
}

export function isMessageDelivery(value: string): value is MessageDelivery {
  return messageDeliveries.some((item) => item === value);
}
