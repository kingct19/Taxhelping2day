import { avatarUrl } from "@/lib/avatar";
import { advanceBlocker, sendBackBlocker } from "@/lib/engagement";
import { staffNext } from "@/lib/next-action";
import { requestThreads } from "@/lib/request-thread";
import { nextStage, sendBackTarget, type Stage, type WaitingOn } from "@/lib/return-workflow";
import { getStore } from "@/lib/store";
import type { TaxpayerType } from "@/lib/types";

export type DeskReturn = {
  id: string;
  profileId: string;
  revision: number;
  stage: Stage;
  clientName: string;
  clientEmail: string;
  avatar: string | null;
  entity: string;
  taxpayerType: TaxpayerType;
  taxYear: number;
  headline: string;
  step: string;
  detail: string;
  due: string | null;
  overdue: boolean;
  waitingOn: WaitingOn;
  ownerId: string | null;
  ownerName: string;
  nextAction: string;
  urgency: number;
  forward: Stage | null;
  back: Stage | null;
  forwardBlock: string | null;
  backBlock: string | null;
};

function todayStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export async function loadDeskReturns(): Promise<DeskReturn[]> {
  const store = getStore();
  const [returns, profiles, filings, authorizations, invoices] = await Promise.all([
    store.listTeamReturns(),
    store.listProfiles(),
    store.listFilings(),
    store.listAuthorizations(),
    store.listInvoices(),
  ]);
  const people = new Map(profiles.map((person) => [person.id, person]));
  const clientIds = [...new Set(returns.map((item) => item.profileId))];
  const packs = await Promise.all(
    clientIds.map(async (id) => {
      const [signatures, messages] = await Promise.all([store.listSignatures(id), store.listMessages(id)]);
      return [id, { signatures, messages }] as const;
    }),
  );
  const byClient = new Map(packs);
  const today = todayStamp();
  const nameOf = (id: string | null) => {
    if (!id) return "";
    const person = people.get(id);
    return person?.name || person?.email || "";
  };

  return returns
    .map((item) => {
      const profile = people.get(item.profileId);
      const clientName = profile?.name || profile?.email || "Unnamed customer";
      const pack = byClient.get(item.profileId);
      const threads = requestThreads((pack?.messages ?? []).filter((row) => row.returnId === item.id));
      const returnFilings = filings.filter((row) => row.returnId === item.id);
      const next = staffNext({
        name: clientName,
        due: item.due,
        stage: item.stage,
        threads,
        filings: returnFilings,
        authorizations: authorizations.filter((row) => row.returnId === item.id),
        returnVersion: item.returnVersion,
      });
      const forward = nextStage(item.stage);
      const back = sendBackTarget(item.stage);
      const gate = profile
        ? {
            workflow: item,
            profile,
            signatures: pack?.signatures ?? [],
            threads,
            authorizations: authorizations.filter((row) => row.returnId === item.id),
            invoice: invoices.find((row) => row.returnId === item.id) ?? null,
            filings: returnFilings,
          }
        : null;
      return {
        id: item.id,
        profileId: item.profileId,
        revision: item.revision,
        stage: item.stage,
        clientName,
        clientEmail: profile?.email ?? "",
        avatar: avatarUrl(item.profileId, profile?.avatarPath),
        entity: item.entity,
        taxpayerType: item.taxpayerType,
        taxYear: item.taxYear,
        headline: next.urgency < 7 ? next.headline : item.nextAction.trim() || next.headline,
        step: next.headline,
        detail: next.detail,
        due: item.due,
        overdue: Boolean(item.due && item.due < today && item.stage !== "delivery" && item.stage !== "renewal"),
        waitingOn: item.waitingOn,
        ownerId: item.owner,
        ownerName: nameOf(item.owner) || "Unassigned",
        nextAction: item.nextAction,
        urgency: next.urgency,
        forward,
        back,
        forwardBlock: gate ? (forward ? advanceBlocker(gate) : null) : "The contact for this return is missing.",
        backBlock: back ? sendBackBlocker(item.stage, returnFilings) : null,
      };
    })
    .sort((a, b) => a.urgency - b.urgency || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.clientName.localeCompare(b.clientName));
}
