import type { CatalogLists, SeasonStage } from "@/lib/season";
import { documentRequests, documentsForId } from "@/lib/season";
import type { ReturnDesk } from "@/lib/return-desk";
import type { TeamReturn, Workflow } from "@/lib/return-workflow";
import { nextStage, sendBackTarget } from "@/lib/return-workflow";
import type { RequestThread } from "@/lib/request-thread";
import { isTaxpayerType, type EfileAuthorization, type FilingRecord, type Invoice, type Profile, type SignatureRecord } from "@/lib/types";

export const letterPhases = ["unsigned", "sent", "opened", "signed", "declined"] as const;
export type LetterPhase = (typeof letterPhases)[number];

export type GateInput = {
  workflow: TeamReturn;
  profile: Profile;
  signatures: SignatureRecord[];
  threads: RequestThread[];
  authorizations: EfileAuthorization[];
  invoice: Invoice | null;
  filings: FilingRecord[];
  note?: string;
  catalog?: CatalogLists;
  letter?: LetterPhase;
};

export function organizerBody(title: string, detail: string): string {
  return `Organizer: ${title}. ${detail}`.slice(0, 1000);
}

export function isOrganizerItem(body: string, title: string): boolean {
  return body === title || body.startsWith(`Organizer: ${title}.`);
}

export function requestsFor(type: string, desk?: Pick<ReturnDesk, "intakeAnswered" | "filingNeeds">, catalog?: CatalogLists) {
  if (desk?.intakeAnswered) return documentsForId(type, catalog);
  return isTaxpayerType(type) ? documentRequests(type) : [];
}

export function intakeBlocker(
  type: string,
  threads: RequestThread[],
  desk?: Pick<ReturnDesk, "intakeAnswered" | "filingNeeds">,
  until = "preparation",
  catalog?: CatalogLists,
): string | null {
  const required = requestsFor(type, desk, catalog).filter((item) => item.required);
  for (const request of required) {
    const thread = threads.find((item) => isOrganizerItem(item.root.body, request.title));
    const state = thread?.latest.requestState;
    if (state !== "accepted" && state !== "waived") {
      return `Accept or waive ${request.title} before ${until}.`;
    }
  }
  return null;
}

export function missingOrganizer(type: string, threads: RequestThread[], desk?: Pick<ReturnDesk, "intakeAnswered" | "filingNeeds">, catalog?: CatalogLists): string[] {
  return requestsFor(type, desk, catalog)
    .filter((request) => request.required && !threads.some((thread) => isOrganizerItem(thread.root.body, request.title)))
    .map((request) => request.title);
}

export function advanceBlocker(input: GateInput): string | null {
  const { workflow, profile, signatures, threads, authorizations, invoice, filings, note } = input;
  switch (workflow.stage) {
    case "lead":
      if (!profile.name.trim() || !profile.email.includes("@")) return "The contact needs a name and email.";
      return null;
    case "onboarding":
      if (!profile.name.trim() || !profile.address.trim() || !profile.taxIdLast4) {
        return "The profile needs a name, address, and the last four of the tax ID.";
      }
      if (!workflow.services.includes("tax_return")) return "Select tax return before collecting documents.";
      if (!workflow.desk.intakeAnswered) return "Choose the filing type before collecting documents.";
      return null;
    case "documents": {
      const intake = intakeBlocker(workflow.filingTypeId || workflow.taxpayerType, threads, workflow.desk, "preparation", input.catalog);
      if (intake) return intake;
      if (!signatures.some((item) => item.kind === "engagement")) return "The engagement letter is not signed.";
      return null;
    }
    case "preparation":
      return null;
    case "review":
      if (!note?.trim()) return "Record the reviewer note.";
      return null;
    case "approval": {
      const version = authorizations.filter((item) => item.returnVersion === workflow.returnVersion);
      const pending = version.some((item) => item.status === "needed");
      const signed = version.some((item) => item.status === "signed");
      if (!signed || pending) return "Form 8879 for this version is not signed.";
      if (!invoice || (invoice.status !== "sent" && invoice.status !== "paid" && invoice.status !== "waived")) {
        return "Send, pay, or waive the invoice before filing.";
      }
      return null;
    }
    case "filing":
      if (!filings.some((item) => item.status === "accepted")) return "Record an accepted filing acknowledgement before delivery.";
      return null;
    case "delivery":
      if (!invoice || (!invoice.instructions.trim() && invoice.status !== "waived")) {
        return "Add payment instructions on the invoice.";
      }
      return null;
    case "renewal":
      return nextStage(workflow.stage) ? null : "Open the next tax year from this file.";
    case "canceled":
      return "The client cancelled this return.";
    default: {
      const exhaustive: never = workflow.stage;
      return exhaustive;
    }
  }
}

export function sendBackBlocker(stage: Workflow["stage"], filings: FilingRecord[]): string | null {
  if (!sendBackTarget(stage)) return "This stage cannot be sent back.";
  if (stage === "filing" && !filings.some((item) => item.status === "rejected")) {
    return "Record the rejection before sending the file back to preparation.";
  }
  return null;
}

export function clientStepFor(stage: Workflow["stage"], season: SeasonStage): number {
  switch (stage) {
    case "lead":
      return 0;
    case "onboarding":
      if (season === "scope") return 1;
      if (season === "documents") return 2;
      if (season === "letter" || season === "ready") return 3;
      return 0;
    case "documents":
      if (season === "letter" || season === "ready") return 3;
      return 2;
    case "preparation":
    case "review":
      return 3;
    case "approval":
      return 4;
    case "filing":
      return 5;
    case "delivery":
    case "renewal":
      return 6;
    case "canceled":
      return 0;
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}
