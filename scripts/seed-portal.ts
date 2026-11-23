import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getStore } from "../lib/store";
import type { FilingJurisdiction, FilingStatus, RequestBlock, TaxpayerType } from "../lib/types";
import type { Stage } from "../lib/return-workflow";

const domain = "preview.taxhelping2day.test";
const dbPath = path.join(process.cwd(), "data", "db.json");

async function blankPdf(title: string): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  page.drawText(title, { x: 48, y: 740, size: 16, font: await pdf.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await pdf.save());
}

async function wipeSamples() {
  let raw: string;
  try {
    raw = await readFile(dbPath, "utf8");
  } catch {
    return;
  }
  const db = JSON.parse(raw) as {
    profiles?: { id: string; email: string }[];
    returns?: { id: string; profileId: string }[];
    documents?: { profileId: string }[];
    signatures?: { profileId: string }[];
    messages?: { profileId: string }[];
    tasks?: { profileId: string }[];
    filings?: { returnId: string }[];
    authorizations?: { returnId: string }[];
    invoices?: { returnId: string }[];
  };
  const profileIds = new Set((db.profiles ?? []).filter((profile) => profile.email.endsWith(`@${domain}`)).map((profile) => profile.id));
  const returnIds = new Set((db.returns ?? []).filter((item) => profileIds.has(item.profileId)).map((item) => item.id));
  const keep = <T extends { profileId?: string; returnId?: string }>(rows: T[] | undefined, key: "profileId" | "returnId", ids: Set<string>) =>
    (rows ?? []).filter((row) => !ids.has(String(row[key] ?? "")));
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify({
    ...db,
    profiles: (db.profiles ?? []).filter((profile) => !profileIds.has(profile.id)),
    returns: keep(db.returns, "profileId", profileIds),
    documents: keep(db.documents, "profileId", profileIds),
    signatures: keep(db.signatures, "profileId", profileIds),
    messages: keep(db.messages, "profileId", profileIds),
    tasks: keep(db.tasks, "profileId", profileIds),
    filings: keep(db.filings, "returnId", returnIds),
    authorizations: keep(db.authorizations, "returnId", returnIds),
    invoices: keep(db.invoices, "returnId", returnIds),
  }, null, 2));
}

async function main() {
  await wipeSamples();
  const store = getStore();
  await store.ensureStaff();
  const owner = (await store.listProfiles()).find((profile) => profile.role === "staff");
  if (!owner) throw new Error("No staff profile to own the sample returns.");
  const ownerId = owner.id;

  async function person(slug: string, name: string) {
    return store.createClient({ email: `${slug}@${domain}`, name });
  }

  async function details(id: string, name: string, spouseName = "") {
    await store.updateProfile(id, {
      name, phone: "(254) 555-0148", address: "18 Pecan St", city: "Hamilton", state: "TX", zip: "76531",
      taxpayerType: "individual" satisfies TaxpayerType, spouseName, taxYears: "2025", taxId: "423881234",
    });
  }

  async function taxReturn(profileId: string, entity: string) {
    await store.createReturn({ profileId, taxYear: 2025, entity, taxpayerType: "individual" });
    const item = (await store.listTeamReturns()).find((row) => row.profileId === profileId && row.entity === entity);
    if (!item) throw new Error(`Missing return for ${entity}`);
    return item;
  }

  async function stage(returnId: string, next: { stage: Stage; due: string | null; nextAction: string; waitingOn?: "client" | "staff" | null; services?: ("tax_return")[] }) {
    const item = (await store.listTeamReturns()).find((row) => row.id === returnId);
    if (!item) throw new Error("Return missing.");
    const saved = await store.updateWorkflow(returnId, {
      ...item,
      ...next,
      owner: ownerId,
      waitingOn: next.waitingOn ?? null,
      services: next.services ?? item.services,
    });
    if (!saved) throw new Error("Could not save the sample handoff.");
  }

  async function signedEngagement(profileId: string) {
    await store.addSignature({ profileId, kind: "engagement", ip: "127.0.0.1", userAgent: "sample", bytes: await blankPdf("Engagement letter") });
  }

  async function intakeDocs(profileId: string) {
    await store.addDocument({ profileId, kind: "photo_id", filename: "photo-id.pdf", contentType: "application/pdf", bytes: await blankPdf("Photo ID") });
    await store.addDocument({ profileId, kind: "prior_return", filename: "2024-return.pdf", contentType: "application/pdf", bytes: await blankPdf("2024 return") });
  }

  async function ask(profileId: string, returnId: string, body: string, block: RequestBlock) {
    return store.addMessage({
      profileId, returnId, authorId: ownerId, authorRole: "staff", kind: "message", body, requestState: "open", requestBlock: block,
    });
  }

  const ava = await person("ava.morales", "Ava Morales");
  const avaReturn = await taxReturn(ava.id, "Morales, Ava");
  await stage(avaReturn.id, { stage: "lead", due: "2026-11-30", nextAction: "Collect Ava's details" });

  const ben = await person("ben.carter", "Ben Carter");
  await details(ben.id, "Ben Carter");
  const benReturn = await taxReturn(ben.id, "Carter, Ben");
  await stage(benReturn.id, { stage: "onboarding", due: "2026-11-22", nextAction: "Send Ben the engagement letter" });

  const chris = await person("chris.okonkwo", "Chris Okonkwo");
  await details(chris.id, "Chris Okonkwo", "Dana Okonkwo");
  await signedEngagement(chris.id);
  await intakeDocs(chris.id);
  const chrisReturn = await taxReturn(chris.id, "Okonkwo, Chris and Dana");
  const w2 = await ask(chris.id, chrisReturn.id, "Send every 2025 W-2.", "start");
  await store.addMessage({
    profileId: chris.id, returnId: chrisReturn.id, previousId: w2.id, authorId: ownerId, authorRole: "staff", kind: "event",
    requestState: "replacement", requestBlock: "start", body: "Replacement requested: The photo is cut off. Send all of the W-2, including the wage box.",
  });
  await stage(chrisReturn.id, { stage: "documents", due: "2026-11-25", nextAction: "Send every 2025 W-2.", waitingOn: "client", services: ["tax_return"] });

  const elena = await person("elena.vasquez", "Elena Vasquez");
  await details(elena.id, "Elena Vasquez");
  await signedEngagement(elena.id);
  await intakeDocs(elena.id);
  const elenaReturn = await taxReturn(elena.id, "Vasquez, Elena");
  const brokerage = await ask(elena.id, elenaReturn.id, "Send the 2025 brokerage 1099.", "filing");
  const uploaded = await store.addDocument({ profileId: elena.id, kind: "1099", filename: "brokerage-1099.pdf", contentType: "application/pdf", bytes: await blankPdf("2025 brokerage 1099") });
  await store.addMessage({
    profileId: elena.id, returnId: elenaReturn.id, previousId: brokerage.id, documentId: uploaded.id, authorId: elena.id, authorRole: "client",
    kind: "event", requestState: "responded", requestBlock: "filing", body: "Uploaded brokerage-1099.pdf for review.",
  });
  await stage(elenaReturn.id, { stage: "documents", due: "2026-11-20", nextAction: "Review Elena's 1099", waitingOn: "staff", services: ["tax_return"] });

  const frank = await person("frank.nguyen", "Frank Nguyen");
  await details(frank.id, "Frank Nguyen");
  await signedEngagement(frank.id);
  await intakeDocs(frank.id);
  const frankReturn = await taxReturn(frank.id, "Nguyen, Frank");
  await store.saveFiling({ returnId: frankReturn.id, jurisdiction: "federal" satisfies FilingJurisdiction, region: "", status: "draft" satisfies FilingStatus, note: "Draft shows a $1,240 refund. Read it before we ask you to sign." });
  await stage(frankReturn.id, { stage: "approval", due: "2026-11-28", nextAction: "Send the federal draft", services: ["tax_return"] });

  const gina = await person("gina.patel", "Gina Patel");
  await details(gina.id, "Gina Patel", "Hugo Patel");
  await signedEngagement(gina.id);
  await intakeDocs(gina.id);
  const ginaReturn = await taxReturn(gina.id, "Patel, Gina and Hugo");
  const version = await store.bumpReturnVersion(ginaReturn.id);
  if (version !== 2) throw new Error("Expected the Patel return to be on version 2.");
  for (const signer of ["taxpayer", "spouse"] as const) {
    await store.saveAuthorization({ returnId: ginaReturn.id, signer, returnVersion: version, method: null, status: "needed", signedAt: null, evidence: "" });
  }
  await stage(ginaReturn.id, { stage: "approval", due: "2026-12-02", nextAction: "Collect Form 8879 before e-file", services: ["tax_return"] });

  const ivy = await person("ivy.brooks", "Ivy Brooks");
  await details(ivy.id, "Ivy Brooks");
  await signedEngagement(ivy.id);
  await intakeDocs(ivy.id);
  const ivyReturn = await taxReturn(ivy.id, "Brooks, Ivy");
  await store.saveFiling({ returnId: ivyReturn.id, jurisdiction: "federal", region: "", status: "transmitted", note: "Transmitted November 12. Acknowledgement has not come back." });
  await store.saveFiling({ returnId: ivyReturn.id, jurisdiction: "state", region: "TX", status: "rejected", note: "Texas rejected the withholding figure." });
  await stage(ivyReturn.id, { stage: "filing", due: "2026-11-21", nextAction: "Correct the rejected Texas return", services: ["tax_return"] });

  const jordan = await person("jordan.hale", "Jordan Hale");
  await details(jordan.id, "Jordan Hale");
  await signedEngagement(jordan.id);
  await intakeDocs(jordan.id);
  const jordanReturn = await taxReturn(jordan.id, "Hale, Jordan");
  await stage(jordanReturn.id, { stage: "preparation", due: "2026-12-05", nextAction: "Prepare Jordan's return", services: ["tax_return"] });

  console.log("Sample clients are ready. Open /returns/samples while signed in as staff.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
