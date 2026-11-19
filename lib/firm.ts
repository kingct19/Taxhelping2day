export const siteUrl = "https://taxhelping2day.com";

export const firm = {
  name: "TaxHelping2Day",
  legalName: "TaxHelping2Day LLC",
  representative: "Laura Wallace, EA",
  phone: "(254) 784-9272",
  phoneHref: "tel:+12547849272",
  email: "taxhelping2day@gmail.com",
  domain: "taxhelping2day.com",
  url: siteUrl,
  serviceLine: "Tax Preparation & Financial Management Services",
  intro:
    "A private tax practice in Hamilton, Texas. We prepare returns, keep the books, and represent clients before the IRS.",
  mailingAddress: "PO Box 30",
  city: "Hamilton",
  region: "TX",
  postalCode: "76531",
  facebook: "https://www.facebook.com/TaxHelping2Day",
  instagram: "https://www.instagram.com/taxhelping2dayllc",
  mission:
    "We are a private tax practice with a sincere mission to HELP individuals, businesses and non-profits. We provide caring and affordable services 2Day and everyday.",
  representativeAddress: "115 N Rice St, Hamilton, TX 76531",
  designation: "c",
  designationLabel: "Enrolled Agent",
};

export function staffEmails(): string[] {
  const raw = process.env.STAFF_EMAILS ?? `${firm.email},chandler@studiosozo.dev,kingchandler19@gmail.com`;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
