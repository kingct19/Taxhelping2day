import { missingOrganizer } from "@/lib/engagement";
import type { ReturnDesk } from "@/lib/return-desk";
import { clientOwes, requestBlockLabel, requestLabel, staffOwes, type RequestThread } from "@/lib/request-thread";
import { requestTone, type StatusTone } from "@/lib/status-tone";
import type { Stage } from "@/lib/return-workflow";
import type { DocumentKind, DocumentRecord, Message, SignatureRecord, TaxpayerType } from "@/lib/types";

export type DocumentCategory = "file" | "missing" | "review" | "waiting";
export type DocumentGroup = "source" | "workpaper" | "signed";

export type DocumentRequestAction = {
  previousId: string;
  detail: string;
  blockLabel: string | null;
  staffOwes: boolean;
  clientOwes: boolean;
  canRemind: boolean;
};

export type DocumentEntry = {
  id: string;
  label: string;
  meta: string;
  status: string;
  tone: StatusTone;
  category: DocumentCategory;
  previewHref: string | null;
  downloadHref: string | null;
  contentType: string | null;
  reviewed: boolean;
  fileId: string | null;
  request: DocumentRequestAction | null;
  group: DocumentGroup;
  uploader: string | null;
  history: string[];
};

function documentKindLabel(kind: DocumentKind): string {
  switch (kind) {
    case "w2":
      return "W-2";
    case "1099":
      return "1099";
    case "prior_return":
      return "Prior return";
    case "photo_id":
      return "Photo ID";
    case "other":
      return "File";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function signatureLabel(kind: SignatureRecord["kind"]): string {
  switch (kind) {
    case "poa":
      return "Power of attorney";
    case "engagement":
      return "Engagement letter";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function when(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function documentEntries(input: {
  returnId: string;
  stage: Stage;
  taxpayerType: TaxpayerType;
  documents: DocumentRecord[];
  signatures: SignatureRecord[];
  threads: RequestThread[];
  messages: Message[];
  authors: Map<string, string>;
  canRemind: boolean;
  desk?: Pick<ReturnDesk, "intakeAnswered" | "filingNeeds">;
}): DocumentEntry[] {
  const reviewed = new Set(
    input.messages
      .filter((entry) => entry.returnId === input.returnId)
      .flatMap((entry) => [entry.documentId, entry.signatureId].filter((id): id is string => Boolean(id))),
  );
  const documents = input.documents.filter((doc) => {
    if (doc.returnId && doc.returnId !== input.returnId) return false;
    return !input.messages.some((row) => row.documentId === doc.id && row.requestState && row.returnId && row.returnId !== input.returnId);
  });
  const claimed = new Set<string>();
  const rows: DocumentEntry[] = [];

  function uploaderFor(documentId: string | null): string | null {
    if (!documentId) return null;
    const upload = input.messages.find((row) => row.documentId === documentId && row.body.startsWith("Uploaded"));
    if (!upload) return "Uploader unknown";
    return input.authors.get(upload.authorId) || "Uploader unknown";
  }

  function historyFor(documentId: string | null, threadId: string | null): string[] {
    return input.messages
      .filter((row) => {
        if (row.returnId !== input.returnId) return false;
        if (documentId && row.documentId === documentId) return true;
        if (threadId && (row.id === threadId || row.previousId === threadId)) return true;
        return false;
      })
      .slice(-4)
      .map((row) => row.body);
  }

  for (const thread of input.threads) {
    const state = thread.latest.requestState;
    if (!state) continue;
    const documentId = thread.latest.documentId ?? null;
    if (documentId) claimed.add(documentId);
    const owesStaff = staffOwes(state);
    const owesClient = clientOwes(state);
    const category: DocumentCategory = owesStaff ? "review" : owesClient ? (documentId ? "waiting" : "missing") : "file";
    const document = documentId ? documents.find((item) => item.id === documentId) : undefined;
    rows.push({
      id: `request:${thread.root.id}`,
      label: thread.root.body,
      meta: document ? `${documentKindLabel(document.kind)} · ${when(document.createdAt)}` : "No file yet",
      status: requestLabel(state, true),
      tone: requestTone(state),
      category,
      previewHref: document ? `/files/documents/${document.id}?preview=1` : null,
      downloadHref: document ? `/files/documents/${document.id}` : null,
      contentType: document?.contentType ?? null,
      reviewed: document ? reviewed.has(document.id) : false,
      fileId: document?.id ?? null,
      group: "source",
      uploader: uploaderFor(document?.id ?? null),
      history: historyFor(document?.id ?? null, thread.root.id),
      request: {
        previousId: thread.latest.id,
        detail: thread.latest.id === thread.root.id ? "" : thread.latest.body,
        blockLabel: thread.root.requestBlock ? requestBlockLabel(thread.root.requestBlock) : null,
        staffOwes: owesStaff,
        clientOwes: owesClient,
        canRemind: input.canRemind && owesClient,
      },
    });
  }

  for (const document of documents) {
    if (claimed.has(document.id)) continue;
    rows.push({
      id: `file:${document.id}`,
      label: document.filename,
      meta: `${documentKindLabel(document.kind)} · ${when(document.createdAt)}`,
      status: "On file",
      tone: "neutral",
      category: "file",
      previewHref: `/files/documents/${document.id}?preview=1`,
      downloadHref: `/files/documents/${document.id}`,
      contentType: document.contentType,
      reviewed: reviewed.has(document.id),
      fileId: document.id,
      group: document.kind === "other" ? "workpaper" : "source",
      uploader: uploaderFor(document.id),
      history: historyFor(document.id, null),
      request: null,
    });
  }

  for (const signature of input.signatures) {
    rows.push({
      id: `signature:${signature.id}`,
      label: `${signatureLabel(signature.kind)} · signed ${signature.signedAt.slice(0, 10)}`,
      meta: `PDF · ${when(signature.signedAt)}`,
      status: "Signed",
      tone: "success",
      category: "file",
      previewHref: `/files/signatures/${signature.id}?preview=1`,
      downloadHref: `/files/signatures/${signature.id}`,
      contentType: "application/pdf",
      reviewed: reviewed.has(signature.id),
      fileId: signature.id,
      group: "signed",
      uploader: null,
      history: [],
      request: null,
    });
  }

  for (const title of missingOrganizer(input.taxpayerType, input.threads, input.desk)) {
      rows.push({
        id: `organizer:${title}`,
        label: title,
        meta: "Organizer",
        status: "Not requested",
        tone: "warning",
        category: "missing",
        previewHref: null,
        downloadHref: null,
        contentType: null,
        reviewed: false,
        fileId: null,
        group: "source",
        uploader: null,
        history: [],
        request: null,
      });
  }

  return rows;
}
