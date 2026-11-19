import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { firm } from "@/lib/firm";
import { taxFormFor, type Profile, type SignatureKind } from "@/lib/types";

const prefix = "topmostSubform[0]";

function fill(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string) {
  try {
    form.getTextField(name).setText(value.slice(0, 80));
  } catch {
    return;
  }
}

export async function buildSignedPdf(input: {
  kind: SignatureKind;
  profile: Profile;
  taxId: string | null;
  signaturePng: Buffer;
  signedAt: Date;
  ip: string;
  userAgent: string;
}): Promise<Uint8Array> {
  if (input.kind === "poa") {
    return buildPoa(input);
  }
  return buildEngagement(input);
}

async function buildEngagement(input: {
  profile: Profile;
  signaturePng: Buffer;
  signedAt: Date;
  ip: string;
  userAgent: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const png = await pdf.embedPng(input.signaturePng);
  page.drawText("DRAFT ENGAGEMENT LETTER", { x: 54, y: 740, size: 16, font: bold, color: rgb(0.07, 0.07, 0.07) });
  page.drawText("Replace this wording with the firm's letter before tax season.", {
    x: 54,
    y: 718,
    size: 10,
    font,
    color: rgb(0.4, 0.25, 0.05),
  });
  const lines = [
    firm.legalName,
    firm.serviceLine,
    "",
    `Client: ${input.profile.name || input.profile.email}`,
    `Email: ${input.profile.email}`,
    "",
    `${input.profile.name || "The client"} engages ${firm.legalName} to prepare the tax return`,
    "described in the client profile and to collect the documents needed for that work.",
    "This draft does not set a fee. The firm will replace it with the engagement letter",
    "clients sign for the season.",
    "",
    "The client agrees to provide complete and accurate information. The firm will keep",
    "uploaded documents for the engagement and will not send them to an AI service.",
  ];
  let y = 680;
  for (const line of lines) {
    page.drawText(line, { x: 54, y, size: 12, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 18;
  }
  page.drawText("Signature", { x: 54, y: y - 12, size: 11, font: bold });
  page.drawImage(png, { x: 54, y: y - 80, width: 180, height: 48 });
  page.drawText(input.signedAt.toISOString(), { x: 260, y: y - 40, size: 10, font });
  drawAudit(page, font, input, 120);
  return pdf.save();
}

async function buildPoa(input: {
  profile: Profile;
  taxId: string | null;
  signaturePng: Buffer;
  signedAt: Date;
  ip: string;
  userAgent: string;
}): Promise<Uint8Array> {
  const bytes = await readFile(path.join(process.cwd(), "assets/forms/f2848.pdf"));
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const address = [input.profile.address, input.profile.city, input.profile.state, input.profile.zip]
    .filter(Boolean)
    .join(", ");
  fill(form, `${prefix}.Page1[0].TaxpayerName[0]`, input.profile.name);
  fill(form, `${prefix}.Page1[0].TaxpayerAddress[0]`, address);
  fill(form, `${prefix}.Page1[0].TaxpayerTelephone[0]`, input.profile.phone);
  if (input.profile.taxpayerType === "individual" && input.taxId) {
    fill(form, `${prefix}.Page1[0].TaxpayerIDSSN[0]`, input.taxId);
  }
  if (input.profile.taxpayerType !== "individual" && input.taxId) {
    fill(form, `${prefix}.Page1[0].TaxpayerIDEIN[0]`, input.taxId);
  }
  fill(form, `${prefix}.Page1[0].RepresentativesName1[0]`, firm.representative);
  fill(form, `${prefix}.Page1[0].RepresentativesAddress1[0]`, `${firm.legalName}, ${firm.representativeAddress}`);
  fill(form, `${prefix}.Page1[0].TelephoneNo1[0]`, firm.phone);
  fill(form, `${prefix}.Page1[0].Table_Line3[0].BodyRow1[0].Description1[0]`, "Income tax");
  fill(form, `${prefix}.Page1[0].Table_Line3[0].BodyRow1[0].TaxForm1[0]`, taxFormFor(input.profile.taxpayerType));
  fill(form, `${prefix}.Page1[0].Table_Line3[0].BodyRow1[0].Years1[0]`, input.profile.taxYears);
  fill(form, `${prefix}.Page2[0].PrintNameTaxpayer[0]`, input.profile.name);
  fill(form, `${prefix}.Page2[0].Table_PartII[0].BodyRow1[0].Designation1[0]`, firm.designation);
  fill(form, `${prefix}.Page2[0].Table_PartII[0].BodyRow1[0].Jurisdiction1[0]`, "IRS");
  try {
    form.flatten();
  } catch {
    // The IRS file mixes XFA and AcroForm data. Keep the filled fields if flatten fails.
  }
  const png = await pdf.embedPng(input.signaturePng);
  const page = pdf.getPages()[1];
  page.drawImage(png, { x: 36, y: 548, width: 170, height: 36 });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(input.signedAt.toLocaleDateString("en-US"), {
    x: 220,
    y: 558,
    size: 9,
    font,
  });
  const audit = pdf.addPage([612, 792]);
  audit.drawText("Electronic signature record", { x: 54, y: 740, size: 16, font });
  drawAudit(audit, font, input, 700);
  audit.drawText("Staff uploads this file at IRS.gov/Submit2848. The portal does not submit it.", {
    x: 54,
    y: 560,
    size: 11,
    font,
  });
  audit.drawText("Representative address uses the public Hamilton listing until the firm confirms it.", {
    x: 54,
    y: 540,
    size: 11,
    font,
  });
  return pdf.save();
}

function drawAudit(
  page: ReturnType<PDFDocument["getPages"]>[number],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  input: { profile: Profile; signedAt: Date; ip: string; userAgent: string },
  startY: number,
) {
  const lines = [
    `Signer email: ${input.profile.email}`,
    `Signed at: ${input.signedAt.toISOString()}`,
    `IP address: ${input.ip}`,
    `Browser: ${input.userAgent.slice(0, 140)}`,
  ];
  let y = startY;
  for (const line of lines) {
    page.drawText(line, { x: 54, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 16;
  }
}
