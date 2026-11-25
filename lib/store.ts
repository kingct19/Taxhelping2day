import {
  localAddReturnTag,
  localAutomationFired,
  localDeleteAutomation,
  localDeleteTag,
  localEnsureTag,
  localListAutomations,
  localListReturnTags,
  localListTags,
  localRecordFire,
  localRemoveReturnTag,
  localSaveAutomation,
  localSaveTag,
  localSetAutomationEnabled,
  readAutomationTables,
  remoteAddReturnTag,
  remoteAutomationFired,
  remoteDeleteAutomation,
  remoteDeleteTag,
  remoteEnsureTag,
  remoteListAutomations,
  remoteListReturnTags,
  remoteListTags,
  remoteRecordFire,
  remoteRemoveReturnTag,
  remoteSaveAutomation,
  remoteSaveTag,
  remoteSetAutomationEnabled,
} from "@/lib/automation-data";
import type { Automation, AutomationFire, FirmTag, ReturnTag } from "@/lib/automations";
import { avatarContentType, avatarExtension, avatarMime, avatarStorageKey, safeAvatarPath } from "@/lib/avatar";
import { blankConversation, conversationFromSupabase, normalizeConversation, normalizeMessage, parseAttachments, parseDelivery } from "@/lib/conversation";
import { defaultSuggestions } from "@/lib/inbox-view";
import { asWorkflow, initialWorkflow, type TeamReturn, type Workflow } from "@/lib/return-workflow";
import { randomBytes, randomUUID } from "crypto";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { decryptText, encryptText, hashToken, last4 } from "@/lib/crypto";
import { staffEmails } from "@/lib/firm";
import { applyTeammateUpdate, startingRank, type StaffRank, type StaffStatus } from "@/lib/teammates";
import { normalizeRequestBlock, normalizeRequestState } from "@/lib/request-thread";
import type {
  Conversation,
  ConversationChannel,
  ConversationPatch,
  DocumentKind,
  DocumentRecord,
  ClientTask,
  EfileAuthorization,
  FilingRecord,
  IdentityNote,
  Invoice,
  LeadSource,
  ServiceLine,
  Message,
  MessageAttachment,
  MessageDelivery,
  Profile,
  ProfileUpdate,
  Role,
  SignatureKind,
  SignatureRecord,
  TaskKind,
  TaxpayerType,
  TaxReturn,
} from "@/lib/types";
import { defaultFilingCatalog, parseFilingCatalog, type FilingCatalog } from "@/lib/filing-catalog";
import { defaultOfficeHours, parseOfficeHours, type OfficeHours } from "@/lib/office-hours";
import { defaultSignInMethods, parseSignInMethods, readableSignInMethods, signInMethodsError, type SignInMethods } from "@/lib/sign-in-methods";
import { orderedFilingTypes, taskKinds } from "@/lib/types";

type StoredProfile = Profile & { taxIdEncrypted: string | null };

type StoredDocument = DocumentRecord & { storagePath: string };
type StoredSignature = SignatureRecord & { storagePath: string };

type MagicToken = {
  hash: string;
  profileId: string;
  expiresAt: string;
  usedAt: string | null;
};

type Database = {
  returns: (TaxReturn & Partial<Workflow>)[];
  profiles: StoredProfile[];
  documents: StoredDocument[];
  signatures: StoredSignature[];
  messages: Message[];
  conversations: Conversation[];
  tokens: MagicToken[];
  identityNotes: IdentityNote[];
  tasks: ClientTask[];
  staffAllowlist: string[];
  filings: FilingRecord[];
  authorizations: EfileAuthorization[];
  invoices: Invoice[];
  filingCatalog?: FilingCatalog;
  officeHours?: OfficeHours;
  signInMethods?: SignInMethods;
  tags: FirmTag[];
  returnTags: ReturnTag[];
  automations: Automation[];
  automationFires: AutomationFire[];
};

export type Store = {
  listRequestStates(): Promise<Pick<Message, "id" | "profileId" | "returnId" | "previousId" | "requestState" | "requestBlock" | "body">[]>;
  listFilings(returnId?: string): Promise<FilingRecord[]>;
  saveFiling(input: Omit<FilingRecord, "id" | "updatedAt">): Promise<FilingRecord>;
  listAuthorizations(returnId?: string): Promise<EfileAuthorization[]>;
  saveAuthorization(input: Omit<EfileAuthorization, "id">): Promise<EfileAuthorization>;
  listInvoices(returnId?: string): Promise<Invoice[]>;
  saveInvoice(input: Omit<Invoice, "id" | "updatedAt">): Promise<Invoice>;
  bumpReturnVersion(id: string): Promise<number | null>;
  listTeamReturns(): Promise<TeamReturn[]>;
  updateWorkflow(id: string, workflow: Workflow & { taxpayerType?: TaxpayerType }): Promise<boolean>;
  listReturns(profileId: string): Promise<TaxReturn[]>;
  createReturn(input: Omit<TaxReturn, "id" | "returnVersion"> & { source?: LeadSource; services?: ServiceLine[] }): Promise<void>;
  getFilingCatalog(): Promise<FilingCatalog>;
  saveFilingCatalog(catalog: FilingCatalog): Promise<void>;
  getOfficeHours(): Promise<{ saved: boolean; hours: OfficeHours }>;
  saveOfficeHours(hours: OfficeHours): Promise<void>;
  getSignInMethods(): Promise<SignInMethods>;
  saveSignInMethods(methods: SignInMethods): Promise<void>;
  ensureStaff(): Promise<void>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  getProfile(id: string): Promise<Profile | null>;
  getTaxId(id: string): Promise<string | null>;
  listProfiles(): Promise<Profile[]>;
  createClient(input: { email: string; name: string }): Promise<Profile>;
  updateProfile(id: string, patch: ProfileUpdate): Promise<Profile>;
  saveAvatar(input: { profileId: string; contentType: string; bytes: Buffer }): Promise<Profile>;
  clearAvatar(profileId: string): Promise<Profile | null>;
  readAvatar(profileId: string): Promise<{ contentType: string; bytes: Buffer } | null>;
  issueToken(profileId: string): Promise<string>;
  consumeToken(raw: string): Promise<Profile | null>;
  listDocuments(profileId: string): Promise<DocumentRecord[]>;
  addDocument(input: {
    profileId: string;
    kind: DocumentKind;
    filename: string;
    contentType: string;
    bytes: Buffer;
  }): Promise<DocumentRecord>;
  readDocument(id: string): Promise<{ record: DocumentRecord; bytes: Buffer } | null>;
  listSignatures(profileId: string): Promise<SignatureRecord[]>;
  addSignature(input: {
    profileId: string;
    kind: SignatureKind;
    ip: string;
    userAgent: string;
    bytes: Buffer;
  }): Promise<SignatureRecord>;
  readSignature(id: string): Promise<{ record: SignatureRecord; bytes: Buffer } | null>;
  listMessages(profileId: string): Promise<Message[]>;
  listInbox(): Promise<{ conversations: Conversation[]; messages: Message[] }>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(input: {
    profileId: string;
    subject: string;
    channel: ConversationChannel;
    assigneeId: string | null;
    createdByMe: boolean;
  }): Promise<Conversation>;
  updateConversation(id: string, patch: ConversationPatch): Promise<Conversation | null>;
  markConversationRead(id: string): Promise<void>;
  markStaffMessagesSeen(profileId: string): Promise<number>;
  addMessage(input: {
    previousId?: string;
    requestState?: NonNullable<Message["requestState"]>;
    requestBlock?: NonNullable<Message["requestBlock"]>;
    returnId?: string;
    documentId?: string;
    signatureId?: string;
    profileId: string;
    conversationId?: string;
    authorId: string;
    authorRole: Role;
    body: string;
    kind: "message" | "event" | "note";
    delivery?: MessageDelivery | null;
    attachments?: MessageAttachment[];
  }): Promise<Message>;
  getIdentity(profileId: string): Promise<IdentityNote | null>;
  saveIdentity(input: IdentityNote): Promise<IdentityNote>;
  listTasks(): Promise<ClientTask[]>;
  setTaskStatus(id: string, status: ClientTask["status"]): Promise<ClientTask | null>;
  saveTaskNote(id: string, note: string): Promise<ClientTask | null>;
  isStaffAllowed(email: string): Promise<boolean>;
  createStaff(input: { email: string; name: string; staffRank?: StaffRank }): Promise<Profile | null>;
  updateTeammate(id: string, patch: { name: string; staffRank: StaffRank; staffStatus: StaffStatus }): Promise<Profile | null>;
  setFileFlags(id: string, flags: { starred?: boolean; snoozedUntil?: string | null }): Promise<Profile | null>;
  listTags(): Promise<FirmTag[]>;
  saveTag(name: string, id?: string): Promise<{ tag: FirmTag } | { error: string }>;
  ensureTag(name: string): Promise<FirmTag | null>;
  deleteTag(id: string): Promise<{ ok: true } | { ok: false; error: string }>;
  listReturnTags(): Promise<ReturnTag[]>;
  addReturnTag(returnId: string, tagId: string): Promise<{ created: boolean; createdAt: string } | { error: string }>;
  removeReturnTag(returnId: string, tagId: string): Promise<boolean>;
  listAutomations(): Promise<Automation[]>;
  saveAutomation(rule: Automation): Promise<void>;
  deleteAutomation(id: string): Promise<void>;
  setAutomationEnabled(id: string, enabled: boolean): Promise<void>;
  automationFired(automationId: string, returnId: string, triggerKey: string): Promise<boolean>;
  recordAutomationFire(automationId: string, returnId: string, triggerKey: string): Promise<void>;
  stampStageEntered(id: string): Promise<string>;
  markPortalAccepted(profileId: string): Promise<boolean>;
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

function emptyDb(): Database {
  const tables = readAutomationTables(undefined);
  return { returns: [], profiles: [], documents: [], signatures: [], messages: [], conversations: [], tokens: [], identityNotes: [], tasks: [], staffAllowlist: [], filings: [], authorizations: [], invoices: [], filingCatalog: defaultFilingCatalog(), ...tables };
}

function readDb(raw: string): Database {
  const parsed = JSON.parse(raw) as Partial<Database>;
  return {
    returns: parsed.returns ?? [],
    profiles: parsed.profiles ?? [],
    documents: parsed.documents ?? [],
    signatures: parsed.signatures ?? [],
    messages: parsed.messages ?? [],
    conversations: parsed.conversations ?? [],
    tokens: parsed.tokens ?? [],
    identityNotes: parsed.identityNotes ?? [],
    tasks: parsed.tasks ?? [],
    staffAllowlist: parsed.staffAllowlist ?? [],
    filings: parsed.filings ?? [],
    authorizations: parsed.authorizations ?? [],
    invoices: parsed.invoices ?? [],
    filingCatalog: parsed.filingCatalog ? parseFilingCatalog(parsed.filingCatalog) : defaultFilingCatalog(),
    ...readAutomationTables(parsed),
    officeHours: parseOfficeHours(parsed.officeHours) ?? undefined,
    signInMethods: parseSignInMethods(parsed.signInMethods) ?? undefined,
  };
}

function publicMessage(row: Message): Message {
  return {
    ...row,
    requestState: normalizeRequestState(row.requestState),
    requestBlock: normalizeRequestBlock(row.requestBlock),
    ...normalizeMessage(row),
  };
}

function seedConversations(conversations: Conversation[], profiles: Profile[], messages: Message[]) {
  for (const profile of profiles) {
    if (profile.role !== "client") continue;
    if (conversations.some((item) => item.profileId === profile.id)) continue;
    conversations.push(blankConversation(profile));
  }
  for (const message of messages) {
    if (message.conversationId) continue;
    const match = conversations
      .filter((item) => item.profileId === message.profileId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
    if (match) message.conversationId = match.id;
  }
}

function attachConversation(db: Database, message: Message) {
  seedConversations(db.conversations, db.profiles, db.messages);
  const explicit = message.conversationId ? db.conversations.find((item) => item.id === message.conversationId) : undefined;
  const open = db.conversations
    .filter((item) => item.profileId === message.profileId && item.status !== "closed" && !item.isSpam)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const conversation = explicit ?? open ?? blankConversation({ id: message.profileId, name: "", email: "Conversation", starred: false, snoozedUntil: null });
  if (!explicit && !open) db.conversations.push(conversation);
  conversation.updatedAt = message.createdAt;
  if (message.authorRole === "client" && message.kind === "message") conversation.unreadCount += 1;
  message.conversationId = conversation.id;
}

function blankTask(profileId: string, kind: TaskKind): ClientTask {
  const now = new Date().toISOString();
  return { id: randomUUID(), profileId, kind, status: "open", note: "", createdAt: now, updatedAt: now };
}

function seedTasks(db: Database) {
  for (const profile of db.profiles) {
    if (profile.role !== "client") continue;
    for (const kind of taskKinds) {
      if (!db.tasks.some((task) => task.profileId === profile.id && task.kind === kind)) {
        db.tasks.push(blankTask(profile.id, kind));
      }
    }
  }
}

function omit<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy = { ...value } as Partial<T>;
  delete copy[key];
  return copy as Omit<T, K>;
}

function publicProfile(profile: StoredProfile): Profile {
  const next = omit(profile, "taxIdEncrypted");
  return {
    ...next,
    starred: profile.starred ?? false,
    snoozedUntil: profile.snoozedUntil ?? null,
    avatarPath: profile.avatarPath ?? null,
    portalAcceptedAt: profile.portalAcceptedAt ?? null,
    staffRank: profile.staffRank ?? startingRank(profile.email),
    staffStatus: profile.staffStatus ?? "active",
  };
}

let queue: Promise<unknown> = Promise.resolve();

async function loadDb(): Promise<Database> {
  try {
    return readDb(await readFile(dbPath, "utf8"));
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    if (missing) return emptyDb();
    throw error;
  }
}

function withDb<T>(mutate: boolean, fn: (db: Database) => Promise<T> | T): Promise<T> {
  const run = queue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const db = await loadDb();
    const result = await fn(db);
    if (mutate) {
      const temporary = `${dbPath}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(db, null, 2));
      await rename(temporary, dbPath);
    }
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function blankProfile(email: string, role: Role, name = ""): StoredProfile {
  return {
    id: randomUUID(),
    email,
    role,
    name,
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    taxpayerType: "individual",
    taxIdLast4: null,
    taxIdEncrypted: null,
    spouseName: "",
    taxYears: "",
    createdAt: new Date().toISOString(),
    starred: false,
    snoozedUntil: null,
    avatarPath: null,
    portalAcceptedAt: null,
    staffRank: "staff",
    staffStatus: "active",
  };
}

const localStore: Store = {
  async ensureStaff() {
    await withDb(true, (db) => {
      for (const email of staffEmails()) {
        if (!db.profiles.some((profile) => profile.email === email)) {
          const profile = blankProfile(email, "staff", email === "taxhelping2day@gmail.com" ? "Laura Wallace" : "");
          profile.staffRank = startingRank(email);
          profile.staffStatus = "active";
          db.profiles.push(profile);
        }
      }
    });
  },
  async getProfileByEmail(email) {
    return withDb(false, (db) => {
      const profile = db.profiles.find((item) => item.email === email.toLowerCase());
      return profile ? publicProfile(profile) : null;
    });
  },
  async getProfile(id) {
    return withDb(false, (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      return profile ? publicProfile(profile) : null;
    });
  },
  async getTaxId(id) {
    return withDb(false, (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      return profile?.taxIdEncrypted ? decryptText(profile.taxIdEncrypted) : null;
    });
  },
  async listProfiles() {
    return withDb(false, (db) => db.profiles.map(publicProfile));
  },
  async createClient({ email, name }) {
    return withDb(true, (db) => {
      const existing = db.profiles.find((item) => item.email === email.toLowerCase());
      if (existing) {
        if (name && !existing.name) {
          existing.name = name;
        }
        return publicProfile(existing);
      }
      const profile = blankProfile(email.toLowerCase(), "client", name);
      db.profiles.push(profile);
      return publicProfile(profile);
    });
  },
  async updateProfile(id, patch) {
    return withDb(true, (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      if (!profile) {
        throw new Error("Profile not found.");
      }
      profile.name = patch.name;
      profile.phone = patch.phone;
      profile.address = patch.address;
      profile.city = patch.city;
      profile.state = patch.state;
      profile.zip = patch.zip;
      profile.taxpayerType = patch.taxpayerType;
      if (patch.filingTypes !== undefined) profile.filingTypes = orderedFilingTypes(patch.filingTypes);
      profile.spouseName = patch.spouseName;
      profile.taxYears = patch.taxYears;
      if (patch.taxId) {
        const digits = patch.taxId.replace(/\D/g, "");
        profile.taxIdEncrypted = encryptText(digits);
        profile.taxIdLast4 = last4(digits);
      }
      return publicProfile(profile);
    });
  },
  async saveAvatar(input) {
    const contentType = avatarContentType(input.bytes, input.contentType);
    if (!contentType) throw new Error("Use a JPG, PNG, or WebP image under 2.5 MB.");
    const relative = avatarStorageKey(input.profileId, avatarExtension(contentType));
    const filePath = path.join(dataDir, relative);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.bytes);
    return withDb(true, async (db) => {
      const profile = db.profiles.find((item) => item.id === input.profileId);
      if (!profile) throw new Error("Profile not found.");
      const previous = safeAvatarPath(profile.avatarPath);
      if (previous && previous !== relative) await rm(path.join(dataDir, previous), { force: true });
      profile.avatarPath = relative;
      return publicProfile(profile);
    });
  },
  async clearAvatar(profileId) {
    return withDb(true, async (db) => {
      const profile = db.profiles.find((item) => item.id === profileId);
      if (!profile) return null;
      const previous = safeAvatarPath(profile.avatarPath);
      if (previous) await rm(path.join(dataDir, previous), { force: true });
      profile.avatarPath = null;
      return publicProfile(profile);
    });
  },
  async readAvatar(profileId) {
    return withDb(false, async (db) => {
      const profile = db.profiles.find((item) => item.id === profileId);
      const relative = safeAvatarPath(profile?.avatarPath);
      if (!relative) return null;
      try {
        const bytes = await readFile(path.join(dataDir, relative));
        return { contentType: avatarMime(relative), bytes };
      } catch {
        return null;
      }
    });
  },
  async issueToken(profileId) {
    const raw = randomBytes(32).toString("hex");
    await withDb(true, (db) => {
      db.tokens.push({
        hash: hashToken(raw),
        profileId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        usedAt: null,
      });
    });
    return raw;
  },
  async consumeToken(raw) {
    return withDb(true, (db) => {
      const token = db.tokens.find((item) => item.hash === hashToken(raw));
      if (!token || token.usedAt || new Date(token.expiresAt).getTime() < Date.now()) {
        return null;
      }
      token.usedAt = new Date().toISOString();
      const profile = db.profiles.find((item) => item.id === token.profileId);
      return profile ? publicProfile(profile) : null;
    });
  },
  async listDocuments(profileId) {
    return withDb(false, (db) =>
      db.documents
        .filter((item) => item.profileId === profileId)
        .map((item) => omit(item, "storagePath")),
    );
  },
  async addDocument(input) {
    const id = randomUUID();
    const storagePath = path.join(dataDir, "files", id);
    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, input.bytes);
    const record: StoredDocument = {
      id,
      profileId: input.profileId,
      kind: input.kind,
      filename: input.filename,
      contentType: input.contentType,
      createdAt: new Date().toISOString(),
      storagePath,
    };
    await withDb(true, (db) => {
      db.documents.push(record);
    });
    return omit(record, "storagePath");
  },
  async readDocument(id) {
    return withDb(false, async (db) => {
      const record = db.documents.find((item) => item.id === id);
      if (!record) {
        return null;
      }
      const bytes = await readFile(record.storagePath);
      return { record: omit(record, "storagePath"), bytes };
    });
  },
  async listSignatures(profileId) {
    return withDb(false, (db) =>
      db.signatures
        .filter((item) => item.profileId === profileId)
        .sort((a,b) => b.signedAt.localeCompare(a.signedAt) || b.id.localeCompare(a.id))
        .map((item) => omit(item, "storagePath")),
    );
  },
  async addSignature(input) {
    const id = randomUUID();
    const storagePath = path.join(dataDir, "files", `${id}.pdf`);
    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, input.bytes);
    const record: StoredSignature = {
      id,
      profileId: input.profileId,
      kind: input.kind,
      signedAt: new Date().toISOString(),
      ip: input.ip,
      userAgent: input.userAgent,
      storagePath,
    };
    await withDb(true, (db) => {
      db.signatures.push(record);
    });
    return omit(record, "storagePath");
  },
  async readSignature(id) {
    return withDb(false, async (db) => {
      const record = db.signatures.find((item) => item.id === id);
      if (!record) {
        return null;
      }
      const bytes = await readFile(record.storagePath);
      return { record: omit(record, "storagePath"), bytes };
    });
  },
  async listMessages(profileId) {
    return withDb(true, (db) => {
      seedConversations(db.conversations, db.profiles, db.messages);
      return db.messages.filter((item) => item.profileId === profileId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(publicMessage);
    });
  },
  async listInbox() {
    return withDb(true, (db) => {
      seedConversations(db.conversations, db.profiles, db.messages);
      return {
        conversations: db.conversations.map((item) => normalizeConversation(item)),
        messages: db.messages.map(publicMessage),
      };
    });
  },
  async getConversation(id) {
    return withDb(false, (db) => {
      const conversation = db.conversations.find((item) => item.id === id);
      return conversation ? normalizeConversation(conversation) : null;
    });
  },
  async createConversation(input) {
    return withDb(true, (db) => {
      const profile = db.profiles.find((item) => item.id === input.profileId);
      const conversation = blankConversation(
        profile ?? { id: input.profileId, name: "", email: input.subject, starred: false, snoozedUntil: null },
        { subject: input.subject, channel: input.channel, assigneeId: input.assigneeId, createdByMe: input.createdByMe },
      );
      db.conversations.push(conversation);
      return conversation;
    });
  },
  async updateConversation(id, patch) {
    return withDb(true, (db) => {
      const conversation = db.conversations.find((item) => item.id === id);
      if (!conversation) return null;
      Object.assign(conversation, patch, { updatedAt: new Date().toISOString() });
      return { ...conversation };
    });
  },
  async markConversationRead(id) {
    await withDb(true, (db) => {
      const conversation = db.conversations.find((item) => item.id === id);
      if (!conversation) return;
      conversation.unreadCount = 0;
      for (const message of db.messages) {
        if (message.conversationId === id && message.authorRole === "client" && message.kind === "message") {
          message.delivery = "seen";
        }
      }
    });
  },
  async markStaffMessagesSeen(profileId) {
    let count = 0;
    await withDb(true, (db) => {
      for (const message of db.messages) {
        if (message.profileId === profileId && message.authorRole === "staff" && message.kind === "message" && message.delivery !== "seen") {
          message.delivery = "seen";
          count += 1;
        }
      }
    });
    return count;
  },
  async addMessage(input) {
    const message: Message = {
      ...input,
      id: randomUUID(),
      profileId: input.profileId,
      authorId: input.authorId,
      authorRole: input.authorRole,
      body: input.body,
      kind: input.kind,
      createdAt: new Date().toISOString(),
      conversationId: input.conversationId ?? null,
      delivery: input.delivery ?? null,
      attachments: input.attachments ?? [],
    };
    await withDb(true, (db) => {
      if (input.previousId && db.messages.some((row) => row.previousId === input.previousId)) {
        throw new Error("This request already changed. Refresh to see the latest status.");
      }
      attachConversation(db, message);
      db.messages.push(message);
    });
    return publicMessage(message);
  },
  async listFilings(returnId) {
    return withDb(false, (db) => db.filings.filter((item) => !returnId || item.returnId === returnId));
  },
  async saveFiling(input) {
    const region = input.jurisdiction === "federal" ? "" : input.region.trim().toUpperCase();
    const record = { ...input, region, id: randomUUID(), updatedAt: new Date().toISOString() };
    return withDb(true, (db) => {
      const existing = db.filings.find((item) => item.returnId === input.returnId && item.jurisdiction === input.jurisdiction && item.region.toLowerCase() === region.toLowerCase());
      if (existing) {
        Object.assign(existing, record, { id: existing.id });
        return existing;
      }
      db.filings.push(record);
      return record;
    });
  },
  async listAuthorizations(returnId) {
    return withDb(false, (db) => db.authorizations.filter((item) => !returnId || item.returnId === returnId));
  },
  async saveAuthorization(input) {
    return withDb(true, (db) => {
      const existing = db.authorizations.find((item) => item.returnId === input.returnId && item.signer === input.signer && item.returnVersion === input.returnVersion);
      const record = { ...input, id: existing?.id ?? randomUUID() };
      if (existing) Object.assign(existing, record);
      else db.authorizations.push(record);
      return record;
    });
  },
  async listInvoices(returnId) {
    return withDb(false, (db) => db.invoices.filter((item) => !returnId || item.returnId === returnId));
  },
  async saveInvoice(input) {
    return withDb(true, (db) => {
      const existing = db.invoices.find((item) => item.returnId === input.returnId);
      const record = { ...input, id: existing?.id ?? randomUUID(), updatedAt: new Date().toISOString() };
      if (existing) Object.assign(existing, record);
      else db.invoices.push(record);
      return record;
    });
  },
  async bumpReturnVersion(id) {
    return withDb(true, (db) => {
      const item = db.returns.find((row) => row.id === id);
      if (!item) return null;
      item.returnVersion = (item.returnVersion ?? 1) + 1;
      return item.returnVersion;
    });
  },
  async getIdentity(profileId) {
    return withDb(false, (db) => db.identityNotes.find((item) => item.profileId === profileId) ?? null);
  },
  async saveIdentity(input) {
    await withDb(true, (db) => {
      db.identityNotes = db.identityNotes.filter((item) => item.profileId !== input.profileId);
      db.identityNotes.push(input);
    });
    return input;
  },
  async listRequestStates() {
    return withDb(false, (db) => db.messages.flatMap((row) => {
      const requestState = normalizeRequestState(row.requestState);
      if (!requestState) return [];
      return [{ id: row.id, profileId: row.profileId, returnId: row.returnId ?? null, previousId: row.previousId ?? null, requestState, requestBlock: normalizeRequestBlock(row.requestBlock), body: row.body }];
    }));
  },
  async listTeamReturns() {
    return withDb(false, (db) => db.returns.map((item) => ({ ...item, ...asWorkflow(item), returnVersion: item.returnVersion ?? 1 })));
  },
  async updateWorkflow(id, workflow) {
    return withDb(true, db => {
      const item = db.returns.find(row => row.id === id);
      if (!item || (item.revision ?? 0) !== workflow.revision) return false;
      const stageEnteredAt = item.stage !== workflow.stage || !item.stageEnteredAt ? new Date().toISOString() : item.stageEnteredAt;
      Object.assign(item, workflow, { revision: workflow.revision + 1, stageEnteredAt });
      return true;
    });
  },
  async listReturns(profileId) {
    return withDb(false, db => db.returns.filter(item => item.profileId === profileId)
      .sort((a, b) => b.taxYear - a.taxYear || a.entity.localeCompare(b.entity))
      .map(({ id, profileId, taxYear, entity, taxpayerType, filingTypeId, returnVersion }) => ({ id, profileId, taxYear, entity, taxpayerType, filingTypeId, returnVersion: returnVersion ?? 1 })));
  },
  async createReturn(input) {
    await withDb(true, db => {
      const filingTypeId = input.filingTypeId || input.taxpayerType;
      const exists = db.returns.some(item => item.profileId === input.profileId &&
        item.taxYear === input.taxYear && (item.filingTypeId || item.taxpayerType) === filingTypeId &&
        item.entity.toLowerCase() === input.entity.toLowerCase());
      if (!exists) {
        db.returns.push({
          ...initialWorkflow,
          profileId: input.profileId,
          taxYear: input.taxYear,
          entity: input.entity,
          taxpayerType: input.taxpayerType,
          filingTypeId,
          source: input.source ?? "inquiry",
          services: input.services ?? [],
          id: randomUUID(),
          returnVersion: 1,
          stageEnteredAt: new Date().toISOString(),
        });
      }
    });
  },
  async getFilingCatalog() {
    return withDb(false, (db) => parseFilingCatalog(db.filingCatalog ?? defaultFilingCatalog()));
  },
  async saveFilingCatalog(catalog) {
    await withDb(true, (db) => {
      db.filingCatalog = parseFilingCatalog(catalog);
    });
  },
  async getOfficeHours() {
    return withDb(false, (db) => {
      const hours = db.officeHours ? parseOfficeHours(db.officeHours) : null;
      return { saved: hours !== null, hours: hours ?? defaultOfficeHours() };
    });
  },
  async saveOfficeHours(hours) {
    const parsed = parseOfficeHours(hours);
    if (!parsed) throw new Error("Could not read those hours.");
    await withDb(true, (db) => {
      db.officeHours = parsed;
    });
  },
  async getSignInMethods() {
    return withDb(false, (db) => readableSignInMethods(db.signInMethods));
  },
  async saveSignInMethods(methods) {
    const parsed = parseSignInMethods(methods);
    if (!parsed || signInMethodsError(parsed)) throw new Error("Turn on at least one way to sign in.");
    await withDb(true, (db) => {
      db.signInMethods = parsed;
    });
  },
  async listTasks() {
    return withDb(true, (db) => {
      seedTasks(db);
      return db.tasks;
    });
  },
  async setTaskStatus(id, status) {
    return withDb(true, (db) => {
      const task = db.tasks.find((item) => item.id === id);
      if (!task) return null;
      task.status = status;
      task.updatedAt = new Date().toISOString();
      return task;
    });
  },
  async saveTaskNote(id, note) {
    return withDb(true, (db) => {
      const task = db.tasks.find((item) => item.id === id);
      if (!task) return null;
      task.note = note;
      task.updatedAt = new Date().toISOString();
      return task;
    });
  },
  async isStaffAllowed(email) {
    return withDb(false, (db) => db.staffAllowlist.includes(email.toLowerCase()));
  },
  async createStaff({ email, name, staffRank = "staff" }) {
    return withDb(true, (db) => {
      const value = email.toLowerCase();
      const existing = db.profiles.find((item) => item.email === value);
      if (existing?.role === "client") {
        return null;
      }
      if (!db.staffAllowlist.includes(value)) {
        db.staffAllowlist.push(value);
      }
      if (existing) {
        if (name && !existing.name) {
          existing.name = name;
        }
        existing.staffRank = staffRank;
        return publicProfile(existing);
      }
      const profile = blankProfile(value, "staff", name);
      profile.staffRank = staffRank;
      db.profiles.push(profile);
      return publicProfile(profile);
    });
  },
  async updateTeammate(id, patch) {
    return withDb(true, (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      if (!profile || profile.role !== "staff") return null;
      const records = db.profiles.map((item) => ({
        id: item.id,
        role: item.role,
        email: item.email,
        name: item.name,
        staffRank: item.staffRank ?? startingRank(item.email),
        staffStatus: item.staffStatus ?? "active",
      }));
      const returns = db.returns.map((item) => ({ owner: item.owner ?? null, reviewerId: item.reviewerId ?? null }));
      const conversations = db.conversations.map((item) => ({ assigneeId: item.assigneeId }));
      const result = applyTeammateUpdate(
        { profiles: records, returns, conversations, staffAllowlist: db.staffAllowlist },
        id,
        patch,
        staffEmails(),
      );
      if (result !== "ok") return null;
      const saved = records.find((item) => item.id === id);
      if (!saved) return null;
      profile.name = saved.name;
      profile.staffRank = saved.staffRank;
      profile.staffStatus = saved.staffStatus;
      db.returns.forEach((row, index) => {
        row.owner = returns[index].owner;
        row.reviewerId = returns[index].reviewerId;
      });
      db.conversations.forEach((row, index) => {
        row.assigneeId = conversations[index].assigneeId;
      });
      return publicProfile(profile);
    });
  },
  async setFileFlags(id, flags) {
    return withDb(true, (db) => {
      const profile = db.profiles.find((item) => item.id === id);
      if (!profile) return null;
      if (flags.starred !== undefined) profile.starred = flags.starred;
      if (flags.snoozedUntil !== undefined) profile.snoozedUntil = flags.snoozedUntil;
      return publicProfile(profile);
    });
  },
  async listTags() {
    return withDb(false, localListTags);
  },
  async saveTag(name, id) {
    return withDb(true, (db) => localSaveTag(db, name, id));
  },
  async ensureTag(name) {
    return withDb(true, (db) => localEnsureTag(db, name));
  },
  async deleteTag(id) {
    return withDb(true, (db) => localDeleteTag(db, id));
  },
  async listReturnTags() {
    return withDb(false, localListReturnTags);
  },
  async addReturnTag(returnId, tagId) {
    return withDb(true, (db) => localAddReturnTag(db, returnId, tagId));
  },
  async removeReturnTag(returnId, tagId) {
    return withDb(true, (db) => localRemoveReturnTag(db, returnId, tagId));
  },
  async listAutomations() {
    return withDb(false, localListAutomations);
  },
  async saveAutomation(rule) {
    await withDb(true, (db) => localSaveAutomation(db, rule));
  },
  async deleteAutomation(id) {
    await withDb(true, (db) => localDeleteAutomation(db, id));
  },
  async setAutomationEnabled(id, enabled) {
    await withDb(true, (db) => localSetAutomationEnabled(db, id, enabled));
  },
  async automationFired(automationId, returnId, triggerKey) {
    return withDb(false, (db) => localAutomationFired(db, automationId, returnId, triggerKey));
  },
  async recordAutomationFire(automationId, returnId, triggerKey) {
    await withDb(true, (db) => localRecordFire(db, automationId, returnId, triggerKey));
  },
  async stampStageEntered(id) {
    return withDb(true, (db) => {
      const item = db.returns.find((row) => row.id === id);
      if (!item) return new Date().toISOString();
      if (!item.stageEnteredAt) item.stageEnteredAt = new Date().toISOString();
      return item.stageEnteredAt;
    });
  },
  async markPortalAccepted(profileId) {
    return withDb(true, (db) => {
      const profile = db.profiles.find((item) => item.id === profileId);
      if (!profile || profile.portalAcceptedAt) return false;
      profile.portalAcceptedAt = new Date().toISOString();
      return true;
    });
  },
};

type ProfileRow = {
  id: string;
  email: string;
  role: Role;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxpayer_type: TaxpayerType;
  filing_types?: string[] | null;
  tax_id_encrypted: string | null;
  tax_id_last4: string | null;
  spouse_name: string;
  starred?: boolean | null;
  snoozed_until?: string | null;
  tax_years: string;
  avatar_path?: string | null;
  portal_accepted_at?: string | null;
  staff_rank?: StaffRank | null;
  staff_status?: StaffStatus | null;
  created_at: string;
};

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    taxpayerType: row.taxpayer_type,
    filingTypes: Array.isArray(row.filing_types) ? orderedFilingTypes(row.filing_types) : undefined,
    taxIdLast4: row.tax_id_last4,
    spouseName: row.spouse_name,
    taxYears: row.tax_years,
    createdAt: row.created_at,
    starred: Boolean(row.starred),
    snoozedUntil: row.snoozed_until ?? null,
    avatarPath: row.avatar_path ?? null,
    portalAcceptedAt: row.portal_accepted_at ?? null,
    staffRank: row.staff_rank === "owner" || row.staff_rank === "staff" ? row.staff_rank : startingRank(row.email),
    staffStatus: row.staff_status === "inactive" ? "inactive" : "active",
  };
}

function supabaseStore(client: SupabaseClient): Store {
  const bucket = "portal-files";
  return {
    async ensureStaff() {
      for (const email of staffEmails()) {
        const { data } = await client.from("profiles").select("id").eq("email", email).maybeSingle();
        if (!data) {
          await client.from("profiles").insert({
            email,
            role: "staff",
            name: email === "taxhelping2day@gmail.com" ? "Laura Wallace" : "",
            staff_rank: startingRank(email),
            staff_status: "active",
          });
        }
      }
    },
    async getProfileByEmail(email) {
      const { data } = await client.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
      return data ? fromRow(data as ProfileRow) : null;
    },
    async getProfile(id) {
      const { data } = await client.from("profiles").select("*").eq("id", id).maybeSingle();
      return data ? fromRow(data as ProfileRow) : null;
    },
    async getTaxId(id) {
      const { data } = await client.from("profiles").select("tax_id_encrypted").eq("id", id).maybeSingle();
      const encrypted = (data as { tax_id_encrypted: string | null } | null)?.tax_id_encrypted;
      return encrypted ? decryptText(encrypted) : null;
    },
    async listProfiles() {
      const { data, error } = await client.from("profiles").select("*").order("created_at");
      if (error) {
        throw new Error(error.message);
      }
      return (data as ProfileRow[]).map(fromRow);
    },
    async createClient({ email, name }) {
      const existing = await this.getProfileByEmail(email);
      if (existing) {
        if (name && !existing.name) {
          await client.from("profiles").update({ name }).eq("id", existing.id);
          return { ...existing, name };
        }
        return existing;
      }
      const { data, error } = await client
        .from("profiles")
        .insert({ email: email.toLowerCase(), role: "client", name })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return fromRow(data as ProfileRow);
    },
    async updateProfile(id, patch) {
      const update: Record<string, string | string[] | null> = {
        name: patch.name,
        phone: patch.phone,
        address: patch.address,
        city: patch.city,
        state: patch.state,
        zip: patch.zip,
        taxpayer_type: patch.taxpayerType,
        ...(patch.filingTypes !== undefined ? { filing_types: orderedFilingTypes(patch.filingTypes) } : {}),
        spouse_name: patch.spouseName,
        tax_years: patch.taxYears,
      };
      if (patch.taxId) {
        const digits = patch.taxId.replace(/\D/g, "");
        update.tax_id_encrypted = encryptText(digits);
        update.tax_id_last4 = last4(digits);
      }
      const { data, error } = await client.from("profiles").update(update).eq("id", id).select("*").single();
      if (error) {
        throw new Error(error.message);
      }
      return fromRow(data as ProfileRow);
    },
    async saveAvatar(input) {
      const contentType = avatarContentType(input.bytes, input.contentType);
      if (!contentType) throw new Error("Use a JPG, PNG, or WebP image under 2.5 MB.");
      const relative = avatarStorageKey(input.profileId, avatarExtension(contentType));
      const existing = await client.from("profiles").select("avatar_path").eq("id", input.profileId).maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      const previous = safeAvatarPath((existing.data as { avatar_path?: string | null } | null)?.avatar_path);
      const upload = await client.storage.from(bucket).upload(relative, input.bytes, { contentType, upsert: true });
      if (upload.error) throw new Error(upload.error.message);
      if (previous && previous !== relative) await client.storage.from(bucket).remove([previous]);
      const saved = await client.from("profiles").update({ avatar_path: relative }).eq("id", input.profileId).select("*").single();
      if (saved.error) throw new Error(saved.error.message);
      return fromRow(saved.data as ProfileRow);
    },
    async clearAvatar(profileId) {
      const existing = await client.from("profiles").select("avatar_path").eq("id", profileId).maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      const previous = safeAvatarPath((existing.data as { avatar_path?: string | null } | null)?.avatar_path);
      if (previous) await client.storage.from(bucket).remove([previous]);
      const saved = await client.from("profiles").update({ avatar_path: null }).eq("id", profileId).select("*").maybeSingle();
      if (saved.error) throw new Error(saved.error.message);
      return saved.data ? fromRow(saved.data as ProfileRow) : null;
    },
    async readAvatar(profileId) {
      const existing = await client.from("profiles").select("avatar_path").eq("id", profileId).maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      const relative = safeAvatarPath((existing.data as { avatar_path?: string | null } | null)?.avatar_path);
      if (!relative) return null;
      const file = await client.storage.from(bucket).download(relative);
      if (file.error || !file.data) return null;
      return { contentType: avatarMime(relative), bytes: Buffer.from(await file.data.arrayBuffer()) };
    },
    async issueToken(profileId) {
      const raw = randomBytes(32).toString("hex");
      const { error } = await client.from("magic_tokens").insert({
        profile_id: profileId,
        token_hash: hashToken(raw),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      if (error) {
        throw new Error(error.message);
      }
      return raw;
    },
    async consumeToken(raw) {
      const { data } = await client.from("magic_tokens").select("*").eq("token_hash", hashToken(raw)).maybeSingle();
      const token = data as { id: string; profile_id: string; expires_at: string; used_at: string | null } | null;
      if (!token || token.used_at || new Date(token.expires_at).getTime() < Date.now()) {
        return null;
      }
      await client.from("magic_tokens").update({ used_at: new Date().toISOString() }).eq("id", token.id);
      return this.getProfile(token.profile_id);
    },
    async listDocuments(profileId) {
      const { data, error } = await client.from("documents").select("*").eq("profile_id", profileId);
      if (error) {
        throw new Error(error.message);
      }
      return (data as Array<Record<string, string>>).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        kind: row.kind as DocumentKind,
        filename: row.filename,
        contentType: row.content_type,
        createdAt: row.created_at,
      }));
    },
    async addDocument(input) {
      const id = randomUUID();
      const storagePath = `${input.profileId}/${id}`;
      const upload = await client.storage.from(bucket).upload(storagePath, input.bytes, {
        contentType: input.contentType,
        upsert: false,
      });
      if (upload.error) {
        throw new Error(upload.error.message);
      }
      const { data, error } = await client
        .from("documents")
        .insert({
          id,
          profile_id: input.profileId,
          kind: input.kind,
          filename: input.filename,
          content_type: input.contentType,
          storage_path: storagePath,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      const row = data as Record<string, string>;
      return {
        id: row.id,
        profileId: row.profile_id,
        kind: row.kind as DocumentKind,
        filename: row.filename,
        contentType: row.content_type,
        createdAt: row.created_at,
      };
    },
    async readDocument(id) {
      const { data } = await client.from("documents").select("*").eq("id", id).maybeSingle();
      if (!data) {
        return null;
      }
      const row = data as Record<string, string>;
      const file = await client.storage.from(bucket).download(row.storage_path);
      if (file.error || !file.data) {
        throw new Error(file.error?.message ?? "File missing.");
      }
      const bytes = Buffer.from(await file.data.arrayBuffer());
      return {
        record: {
          id: row.id,
          profileId: row.profile_id,
          kind: row.kind as DocumentKind,
          filename: row.filename,
          contentType: row.content_type,
          createdAt: row.created_at,
        },
        bytes,
      };
    },
    async listSignatures(profileId) {
      const { data, error } = await client.from("signatures").select("*").eq("profile_id", profileId).order("signed_at", {ascending:false}).order("id",{ascending:false});
      if (error) {
        throw new Error(error.message);
      }
      return (data as Array<Record<string, string>>).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        kind: row.kind as SignatureKind,
        signedAt: row.signed_at,
        ip: row.ip,
        userAgent: row.user_agent,
      }));
    },
    async addSignature(input) {
      const id = randomUUID();
      const storagePath = `${input.profileId}/signed-${input.kind}-${id}.pdf`;
      const upload = await client.storage.from(bucket).upload(storagePath, input.bytes, {
        contentType: "application/pdf",
      });
      if (upload.error) {
        throw new Error(upload.error.message);
      }
      const { data, error } = await client
        .from("signatures")
        .insert({
          id,
          profile_id: input.profileId,
          kind: input.kind,
          ip: input.ip,
          user_agent: input.userAgent,
          storage_path: storagePath,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      const row = data as Record<string, string>;
      return {
        id: row.id,
        profileId: row.profile_id,
        kind: row.kind as SignatureKind,
        signedAt: row.signed_at,
        ip: row.ip,
        userAgent: row.user_agent,
      };
    },
    async readSignature(id) {
      const { data } = await client.from("signatures").select("*").eq("id", id).maybeSingle();
      if (!data) {
        return null;
      }
      const row = data as Record<string, string>;
      const file = await client.storage.from(bucket).download(row.storage_path);
      if (file.error || !file.data) {
        throw new Error(file.error?.message ?? "File missing.");
      }
      return {
        record: {
          id: row.id,
          profileId: row.profile_id,
          kind: row.kind as SignatureKind,
          signedAt: row.signed_at,
          ip: row.ip,
          userAgent: row.user_agent,
        },
        bytes: Buffer.from(await file.data.arrayBuffer()),
      };
    },
    async listMessages(profileId) {
      const inbox = await this.listInbox();
      return inbox.messages.filter((item) => item.profileId === profileId);
    },
    async listInbox() {
      const profiles = await this.listProfiles();
      const { data, error } = await client.from("conversations").select("*");
      if (error) throw new Error(error.message);
      let conversations = ((data ?? []) as Record<string, unknown>[]).map(conversationFromSupabase);
      const missing = profiles.filter((profile) => profile.role === "client" && !conversations.some((item) => item.profileId === profile.id));
      if (missing.length > 0) {
        const inserted = await client
          .from("conversations")
          .insert(missing.map((profile) => ({
            profile_id: profile.id,
            subject: profile.name || profile.email,
            channel: "chat",
            status: profile.snoozedUntil && new Date(profile.snoozedUntil).getTime() > Date.now() ? "snoozed" : "open",
            priority: "none",
            starred: profile.starred,
            suggestions: defaultSuggestions,
          })))
          .select("*");
        if (inserted.error) throw new Error(inserted.error.message);
        const created = ((inserted.data ?? []) as Record<string, unknown>[]).map(conversationFromSupabase);
        conversations = [...conversations, ...created];
        for (const conversation of created) {
          const linked = await client.from("messages").update({ conversation_id: conversation.id }).eq("profile_id", conversation.profileId).is("conversation_id", null);
          if (linked.error) throw new Error(linked.error.message);
        }
      }
      const messages: Message[] = [];
      for (let offset = 0; ; offset += 500) {
        const page = await client.from("messages").select("*").order("created_at").range(offset, offset + 499);
        if (page.error) throw new Error(page.error.message);
        messages.push(...((page.data ?? []) as Record<string, unknown>[]).map(messageFromSupabase));
        if ((page.data ?? []).length < 500) break;
      }
      return { conversations, messages };
    },
    async getConversation(id) {
      const { data, error } = await client.from("conversations").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? conversationFromSupabase(data as Record<string, unknown>) : null;
    },
    async createConversation(input) {
      const profile = await this.getProfile(input.profileId);
      const conversation = blankConversation(
        profile ?? { id: input.profileId, name: "", email: input.subject, starred: false, snoozedUntil: null },
        input,
      );
      const { data, error } = await client.from("conversations").insert({
        id: conversation.id,
        profile_id: conversation.profileId,
        subject: conversation.subject,
        channel: conversation.channel,
        status: conversation.status,
        priority: conversation.priority,
        assignee_id: conversation.assigneeId,
        team_inbox: conversation.teamInbox,
        tags: conversation.tags,
        unread_count: conversation.unreadCount,
        starred: conversation.starred,
        mentioned: conversation.mentioned,
        created_by_me: conversation.createdByMe,
        is_spam: conversation.isSpam,
        suggestions: conversation.suggestions,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return conversationFromSupabase(data as Record<string, unknown>);
    },
    async updateConversation(id, patch) {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.subject !== undefined) update.subject = patch.subject;
      if (patch.channel !== undefined) update.channel = patch.channel;
      if (patch.status !== undefined) update.status = patch.status;
      if (patch.priority !== undefined) update.priority = patch.priority;
      if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId;
      if (patch.teamInbox !== undefined) update.team_inbox = patch.teamInbox;
      if (patch.tags !== undefined) update.tags = patch.tags;
      if (patch.unreadCount !== undefined) update.unread_count = patch.unreadCount;
      if (patch.starred !== undefined) update.starred = patch.starred;
      if (patch.mentioned !== undefined) update.mentioned = patch.mentioned;
      if (patch.createdByMe !== undefined) update.created_by_me = patch.createdByMe;
      if (patch.isSpam !== undefined) update.is_spam = patch.isSpam;
      if (patch.suggestions !== undefined) update.suggestions = patch.suggestions;
      const { data, error } = await client.from("conversations").update(update).eq("id", id).select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data ? conversationFromSupabase(data as Record<string, unknown>) : null;
    },
    async markConversationRead(id) {
      const cleared = await client.from("conversations").update({ unread_count: 0 }).eq("id", id);
      if (cleared.error) throw new Error(cleared.error.message);
      const seen = await client.from("messages").update({ delivery: "seen" }).eq("conversation_id", id).eq("author_role", "client").eq("kind", "message");
      if (seen.error) throw new Error(seen.error.message);
    },
    async markStaffMessagesSeen(profileId) {
      const seen = await client
        .from("messages")
        .update({ delivery: "seen" })
        .eq("profile_id", profileId)
        .eq("author_role", "staff")
        .eq("kind", "message")
        .or("delivery.is.null,delivery.eq.sent,delivery.eq.not-seen")
        .select("id");
      if (seen.error) throw new Error(seen.error.message);
      return seen.data?.length ?? 0;
    },
    async addMessage(input) {
      const conversationId = await ensureConversationId(client, input.profileId, input.conversationId);
      const { data, error } = await client
        .from("messages")
        .insert({
          profile_id: input.profileId,
          author_id: input.authorId,
          author_role: input.authorRole,
          previous_id: input.previousId, request_state: input.requestState, request_block: input.requestBlock ?? null,
          return_id: input.returnId, document_id: input.documentId, signature_id: input.signatureId,
          conversation_id: conversationId,
          delivery: input.delivery ?? null,
          attachments: input.attachments ?? [],
          body: input.body,
          kind: input.kind,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      const now = new Date().toISOString();
      if (input.authorRole === "client" && input.kind === "message") {
        const current = await client.from("conversations").select("unread_count").eq("id", conversationId).maybeSingle();
        if (current.error) throw new Error(current.error.message);
        const unread = Number((current.data as { unread_count?: number } | null)?.unread_count ?? 0) + 1;
        const bumped = await client.from("conversations").update({ unread_count: unread, updated_at: now }).eq("id", conversationId);
        if (bumped.error) throw new Error(bumped.error.message);
      } else {
        const touched = await client.from("conversations").update({ updated_at: now }).eq("id", conversationId);
        if (touched.error) throw new Error(touched.error.message);
      }
      return messageFromSupabase(data as Record<string, unknown>);
    },
    async getIdentity(profileId) {
      const { data } = await client.from("identity_notes").select("*").eq("profile_id", profileId).maybeSingle();
      if (!data) {
        return null;
      }
      const row = data as Record<string, string | boolean | null>;
      return {
        profileId: String(row.profile_id),
        attested: Boolean(row.attested),
        note: String(row.note ?? ""),
        attestedAt: row.attested_at ? String(row.attested_at) : null,
        attestedBy: row.attested_by ? String(row.attested_by) : null,
      };
    },
    async saveIdentity(input) {
      const { error } = await client.from("identity_notes").upsert({
        profile_id: input.profileId,
        attested: input.attested,
        note: input.note,
        attested_at: input.attestedAt,
        attested_by: input.attestedBy,
      });
      if (error) {
        throw new Error(error.message);
      }
      return input;
    },
    async listRequestStates() {
      const rows: Pick<Message, "id" | "profileId" | "returnId" | "previousId" | "requestState" | "requestBlock" | "body">[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from("messages")
          .select("id, profileId:profile_id, returnId:return_id, previousId:previous_id, requestState:request_state, requestBlock:request_block, body")
          .not("request_state", "is", null).order("id").range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data as Array<Record<string, string | null>>).flatMap((row) => {
          const requestState = normalizeRequestState(row.requestState);
          if (!requestState) return [];
          return [{
            id: String(row.id),
            profileId: String(row.profileId),
            returnId: row.returnId,
            previousId: row.previousId,
            requestState,
            requestBlock: normalizeRequestBlock(row.requestBlock),
            body: String(row.body ?? ""),
          }];
        }));
        if (data.length < 500) return rows;
      }
    },
    async listFilings(returnId) {
      const rows: FilingRecord[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = client.from("filing_ledgers")
          .select("id, returnId:return_id, jurisdiction, region, status, note, updatedAt:updated_at")
          .order("id").range(offset, offset + 499);
        if (returnId) query = query.eq("return_id", returnId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        rows.push(...(data as FilingRecord[]));
        if (data.length < 500) return rows;
      }
    },
    async saveFiling(input) {
      const region = input.jurisdiction === "federal" ? "" : input.region.trim().toUpperCase();
      const { data, error } = await client.from("filing_ledgers").upsert({
        return_id: input.returnId, jurisdiction: input.jurisdiction, region,
        status: input.status, note: input.note, updated_at: new Date().toISOString(),
      }, { onConflict: "return_id,jurisdiction,region" }).select("id, returnId:return_id, jurisdiction, region, status, note, updatedAt:updated_at").single();
      if (error) throw new Error(error.message);
      return data as FilingRecord;
    },
    async listAuthorizations(returnId) {
      const rows: EfileAuthorization[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = client.from("efile_authorizations")
          .select("id, returnId:return_id, signer, returnVersion:return_version, method, status, signedAt:signed_at, evidence")
          .order("id").range(offset, offset + 499);
        if (returnId) query = query.eq("return_id", returnId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        rows.push(...(data as EfileAuthorization[]));
        if (data.length < 500) return rows;
      }
    },
    async saveAuthorization(input) {
      const { data, error } = await client.from("efile_authorizations").upsert({
        return_id: input.returnId, signer: input.signer, return_version: input.returnVersion,
        method: input.method, status: input.status, signed_at: input.signedAt, evidence: input.evidence,
      }, { onConflict: "return_id,signer,return_version" }).select("id, returnId:return_id, signer, returnVersion:return_version, method, status, signedAt:signed_at, evidence").single();
      if (error) throw new Error(error.message);
      return data as EfileAuthorization;
    },
    async listInvoices(returnId) {
      const rows: Invoice[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = client.from("invoices")
          .select("id, returnId:return_id, amountCents:amount_cents, status, instructions, updatedAt:updated_at")
          .order("id").range(offset, offset + 499);
        if (returnId) query = query.eq("return_id", returnId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        rows.push(...(data as Invoice[]));
        if (data.length < 500) return rows;
      }
    },
    async saveInvoice(input) {
      const { data, error } = await client.from("invoices").upsert({
        return_id: input.returnId,
        amount_cents: input.amountCents,
        status: input.status,
        instructions: input.instructions,
        updated_at: new Date().toISOString(),
      }, { onConflict: "return_id" }).select("id, returnId:return_id, amountCents:amount_cents, status, instructions, updatedAt:updated_at").single();
      if (error) throw new Error(error.message);
      return data as Invoice;
    },
    async bumpReturnVersion(id) {
      const { data, error } = await client.from("tax_returns").select("return_version").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const returnVersion = Number(data.return_version ?? 1) + 1;
      const updated = await client.from("tax_returns").update({ return_version: returnVersion }).eq("id", id).eq("return_version", Number(data.return_version ?? 1)).select("return_version");
      if (updated.error) throw new Error(updated.error.message);
      return updated.data.length === 1 ? returnVersion : null;
    },
    async listTeamReturns() {
      const rows: TeamReturn[] = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await client.from("tax_returns")
          .select("id, profileId:profile_id, taxYear:tax_year, entity, taxpayerType:taxpayer_type, filingTypeId:filing_type_id, stage, owner:owner_id, due:due_date, nextAction:next_action, waitingOn:waiting_on, source, services, reviewerId:reviewer_id, reviewedAt:reviewed_at, deliveredAt:delivered_at, archivedAt:archived_at, returnVersion:return_version, revision, desk, stageEnteredAt:stage_entered_at")
          .order("id").range(start, start + 499);
        if (error) throw new Error(error.message);
        rows.push(...(data as TeamReturn[]).map((item) => ({ ...item, ...asWorkflow(item), returnVersion: item.returnVersion ?? 1 })));
        if (data.length < 500) return rows;
      }
    },
    async updateWorkflow(id, workflow) {
      const current = await client.from("tax_returns").select("stage, stage_entered_at").eq("id", id).eq("revision", workflow.revision).maybeSingle();
      if (current.error) throw new Error(current.error.message);
      const row = current.data as { stage: string; stage_entered_at: string | null } | null;
      if (!row) return false;
      const stageEnteredAt = row.stage !== workflow.stage || !row.stage_entered_at ? new Date().toISOString() : row.stage_entered_at;
      const { data, error } = await client.from("tax_returns").update({
        stage: workflow.stage, owner_id: workflow.owner, due_date: workflow.due,
        next_action: workflow.nextAction, waiting_on: workflow.waitingOn, source: workflow.source,
        services: workflow.services, ...(workflow.taxpayerType ? { taxpayer_type: workflow.taxpayerType } : {}), reviewer_id: workflow.reviewerId, reviewed_at: workflow.reviewedAt,
        delivered_at: workflow.deliveredAt, archived_at: workflow.archivedAt, desk: workflow.desk, revision: workflow.revision + 1,
        stage_entered_at: stageEnteredAt,
      }).eq("id", id).eq("revision", workflow.revision).select("id");
      if (error) throw new Error(error.message);
      return data.length === 1;
    },
    async listReturns(profileId) {
      const { data, error } = await client.from("tax_returns")
        .select("id, profileId:profile_id, taxYear:tax_year, entity, taxpayerType:taxpayer_type, filingTypeId:filing_type_id, returnVersion:return_version")
        .eq("profile_id", profileId).order("tax_year", { ascending: false }).order("entity");
      if (error) throw new Error(error.message);
      return (data as TaxReturn[]).map((item) => ({ ...item, returnVersion: item.returnVersion ?? 1 }));
    },
    async createReturn(input) {
      const { error } = await client.from("tax_returns").insert({
        profile_id: input.profileId, tax_year: input.taxYear,
        entity: input.entity, taxpayer_type: input.taxpayerType,
        filing_type_id: input.filingTypeId || input.taxpayerType,
        stage: "lead", source: input.source ?? "inquiry", services: input.services ?? [],
        stage_entered_at: new Date().toISOString(),
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    },
    async getFilingCatalog() {
      const { data, error } = await client.from("filing_catalog").select("catalog").eq("id", "firm").maybeSingle();
      if (error) throw new Error(error.message);
      return data?.catalog ? parseFilingCatalog(data.catalog) : defaultFilingCatalog();
    },
    async saveFilingCatalog(catalog) {
      const parsed = parseFilingCatalog(catalog);
      const { error } = await client.from("filing_catalog").upsert({ id: "firm", catalog: parsed, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },
    async getOfficeHours() {
      const { data, error } = await client.from("office_hours").select("hours").eq("id", "firm").maybeSingle();
      if (error) throw new Error(error.message);
      const hours = data?.hours ? parseOfficeHours(data.hours) : null;
      return { saved: hours !== null, hours: hours ?? defaultOfficeHours() };
    },
    async saveOfficeHours(hours) {
      const parsed = parseOfficeHours(hours);
      if (!parsed) throw new Error("Could not read those hours.");
      const { error } = await client.from("office_hours").upsert({ id: "firm", hours: parsed, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },
    async getSignInMethods() {
      const { data, error } = await client.from("sign_in_methods").select("methods").eq("id", "firm").maybeSingle();
      if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") return defaultSignInMethods();
        throw new Error(error.message);
      }
      return readableSignInMethods(data?.methods);
    },
    async saveSignInMethods(methods) {
      const parsed = parseSignInMethods(methods);
      if (!parsed || signInMethodsError(parsed)) throw new Error("Turn on at least one way to sign in.");
      const { error } = await client.from("sign_in_methods").upsert({ id: "firm", methods: parsed, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },
    async listTasks() {
      const profiles = await this.listProfiles();
      const { data, error } = await client.from("tasks").select("*");
      if (error) {
        throw new Error(error.message);
      }
      const existing = ((data ?? []) as Array<Record<string, string>>).map(taskFromRow);
      const missing = profiles
        .filter((profile) => profile.role === "client")
        .flatMap((profile) =>
          taskKinds
            .filter((kind) => !existing.some((task) => task.profileId === profile.id && task.kind === kind))
            .map((kind) => ({ profile_id: profile.id, kind, status: "open", note: "" })),
        );
      if (missing.length === 0) {
        return existing;
      }
      const { data: inserted, error: insertError } = await client.from("tasks").insert(missing).select("*");
      if (insertError) {
        throw new Error(insertError.message);
      }
      return [...existing, ...((inserted ?? []) as Array<Record<string, string>>).map(taskFromRow)];
    },
    async setTaskStatus(id, status) {
      const { data, error } = await client
        .from("tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? taskFromRow(data as Record<string, string>) : null;
    },
    async saveTaskNote(id, note) {
      const { data, error } = await client
        .from("tasks")
        .update({ note, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? taskFromRow(data as Record<string, string>) : null;
    },
    async isStaffAllowed(email) {
      const { data } = await client.from("staff_allowlist").select("email").eq("email", email.toLowerCase()).maybeSingle();
      return Boolean(data);
    },
    async createStaff({ email, name, staffRank = "staff" }) {
      const value = email.toLowerCase();
      const existing = await this.getProfileByEmail(value);
      if (existing?.role === "client") {
        return null;
      }
      const { error: allowError } = await client.from("staff_allowlist").upsert({ email: value });
      if (allowError) {
        throw new Error(allowError.message);
      }
      if (existing) {
        const nextName = name && !existing.name ? name : existing.name;
        const { error } = await client.from("profiles").update({ name: nextName, staff_rank: staffRank }).eq("id", existing.id);
        if (error) throw new Error(error.message);
        return { ...existing, name: nextName, staffRank };
      }
      const { data, error } = await client.from("profiles").insert({
        email: value,
        role: "staff",
        name,
        staff_rank: staffRank,
        staff_status: "active",
      }).select("*").single();
      if (error) {
        throw new Error(error.message);
      }
      return fromRow(data as ProfileRow);
    },
    async updateTeammate(id, patch) {
      const existing = await this.getProfile(id);
      if (!existing || existing.role !== "staff") return null;
      const becomingInactive = existing.staffStatus !== "inactive" && patch.staffStatus === "inactive";
      const { data, error } = await client.from("profiles").update({
        name: patch.name,
        staff_rank: patch.staffRank,
        staff_status: patch.staffStatus,
      }).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      if (becomingInactive) {
        const ownerClear = await client.from("tax_returns").update({ owner_id: null }).eq("owner_id", id);
        if (ownerClear.error) throw new Error(ownerClear.error.message);
        const reviewerClear = await client.from("tax_returns").update({ reviewer_id: null }).eq("reviewer_id", id);
        if (reviewerClear.error) throw new Error(reviewerClear.error.message);
        const assigneeClear = await client.from("conversations").update({ assignee_id: null }).eq("assignee_id", id);
        if (assigneeClear.error) throw new Error(assigneeClear.error.message);
      }
      if (patch.staffStatus === "active" && !staffEmails().includes(existing.email.toLowerCase())) {
        const { error: allowError } = await client.from("staff_allowlist").upsert({ email: existing.email.toLowerCase() });
        if (allowError) throw new Error(allowError.message);
      }
      return fromRow(data as ProfileRow);
    },
    async setFileFlags(id, flags) {
      const update: { starred?: boolean; snoozed_until?: string | null } = {};
      if (flags.starred !== undefined) update.starred = flags.starred;
      if (flags.snoozedUntil !== undefined) update.snoozed_until = flags.snoozedUntil;
      const { data, error } = await client.from("profiles").update(update).eq("id", id).select("*").maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? fromRow(data as ProfileRow) : null;
    },
    async listTags() {
      return remoteListTags(client);
    },
    async saveTag(name, id) {
      return remoteSaveTag(client, name, id);
    },
    async ensureTag(name) {
      return remoteEnsureTag(client, name);
    },
    async deleteTag(id) {
      return remoteDeleteTag(client, id);
    },
    async listReturnTags() {
      return remoteListReturnTags(client);
    },
    async addReturnTag(returnId, tagId) {
      return remoteAddReturnTag(client, returnId, tagId);
    },
    async removeReturnTag(returnId, tagId) {
      return remoteRemoveReturnTag(client, returnId, tagId);
    },
    async listAutomations() {
      return remoteListAutomations(client);
    },
    async saveAutomation(rule) {
      await remoteSaveAutomation(client, rule);
    },
    async deleteAutomation(id) {
      await remoteDeleteAutomation(client, id);
    },
    async setAutomationEnabled(id, enabled) {
      await remoteSetAutomationEnabled(client, id, enabled);
    },
    async automationFired(automationId, returnId, triggerKey) {
      return remoteAutomationFired(client, automationId, returnId, triggerKey);
    },
    async recordAutomationFire(automationId, returnId, triggerKey) {
      await remoteRecordFire(client, automationId, returnId, triggerKey);
    },
    async stampStageEntered(id) {
      const current = await client.from("tax_returns").select("stage_entered_at").eq("id", id).maybeSingle();
      if (current.error) throw new Error(current.error.message);
      const existing = (current.data as { stage_entered_at: string | null } | null)?.stage_entered_at;
      if (existing) return existing;
      const at = new Date().toISOString();
      const saved = await client.from("tax_returns").update({ stage_entered_at: at }).eq("id", id);
      if (saved.error) throw new Error(saved.error.message);
      return at;
    },
    async markPortalAccepted(profileId) {
      const at = new Date().toISOString();
      const { data, error } = await client.from("profiles").update({ portal_accepted_at: at }).eq("id", profileId).is("portal_accepted_at", null).select("id");
      if (error) throw new Error(error.message);
      return data.length === 1;
    },
  };
}

async function ensureConversationId(client: SupabaseClient, profileId: string, conversationId?: string) {
  if (conversationId) return conversationId;
  const open = await client
    .from("conversations")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_spam", false)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (open.error) throw new Error(open.error.message);
  const existing = (open.data?.[0] as { id: string } | undefined)?.id;
  if (existing) return existing;
  const profile = await client.from("profiles").select("name, email, starred, snoozed_until").eq("id", profileId).maybeSingle();
  if (profile.error) throw new Error(profile.error.message);
  const row = profile.data as { name?: string; email?: string; starred?: boolean; snoozed_until?: string | null } | null;
  const snoozed = Boolean(row?.snoozed_until && new Date(row.snoozed_until).getTime() > Date.now());
  const inserted = await client.from("conversations").insert({
    profile_id: profileId,
    subject: row?.name || row?.email || "Conversation",
    channel: "chat",
    status: snoozed ? "snoozed" : "open",
    priority: "none",
    starred: Boolean(row?.starred),
    suggestions: defaultSuggestions,
  }).select("id").single();
  if (inserted.error) throw new Error(inserted.error.message);
  return (inserted.data as { id: string }).id;
}

function messageFromSupabase(row: Record<string, unknown>): Message {
  const kind = row.kind === "note" || row.kind === "event" ? row.kind : "message";
  const authorRole = row.author_role === "staff" ? "staff" : "client";
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    authorId: String(row.author_id),
    authorRole,
    previousId: row.previous_id ? String(row.previous_id) : null,
    requestState: normalizeRequestState(row.request_state == null ? null : String(row.request_state)),
    requestBlock: normalizeRequestBlock(row.request_block == null ? null : String(row.request_block)),
    returnId: row.return_id ? String(row.return_id) : null,
    documentId: row.document_id ? String(row.document_id) : null,
    signatureId: row.signature_id ? String(row.signature_id) : null,
    body: String(row.body ?? ""),
    kind,
    createdAt: String(row.created_at),
    conversationId: row.conversation_id ? String(row.conversation_id) : null,
    delivery: parseDelivery(row.delivery),
    attachments: parseAttachments(row.attachments),
  };
}

function taskFromRow(row: Record<string, string>): ClientTask {
  return {
    id: row.id,
    profileId: row.profile_id,
    kind: row.kind as TaskKind,
    status: row.status === "done" ? "done" : "open",
    note: row.note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) {
    return cached;
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    cached = supabaseStore(createClient(url, key, { auth: { persistSession: false } }));
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("Configure Supabase before running the production portal.");
    cached = localStore;
  }
  return cached;
}
