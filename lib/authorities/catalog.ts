import { areas } from "@/lib/site-content";
import packIndex from "@/lib/authorities/state-decisions/index.json";

type StatePackRecord = {
  count: number;
  asOf: string;
  office: string;
};

const statePacks = packIndex as Record<string, StatePackRecord>;

export type AuthorityRef = {
  cite: string;
  title: string;
  href: string;
};

export const authorityGroups = [
  { id: "primary", label: "Primary law" },
  { id: "regulations", label: "Regulations" },
  { id: "courts", label: "Courts" },
  { id: "irs", label: "IRS" },
  { id: "legislative", label: "Legislative materials" },
  { id: "treaties", label: "Treaty materials" },
  { id: "state-rules", label: "State administrative rules" },
  { id: "state-courts", label: "State courts" },
  { id: "cities", label: "City administrative rules" },
  { id: "research", label: "Other federal sources" },
  { id: "firm", label: "The firm" },
] as const;

export type AuthorityGroupId = (typeof authorityGroups)[number]["id"];

export type AuthorityShelf = {
  id: string;
  group: AuthorityGroupId;
  label: string;
  summary: string;
  corpus?: "irc" | "regulations" | "rules" | "opinions" | "publications" | "irm" | "aod" | "practice-units" | "guides" | "faqs" | "rates" | "bulletins" | "treaties" | "explanations" | "counsel";
  live?: "opinions" | "orders" | "federal";
  pack?: string;
  items?: AuthorityRef[];
};

const moreStates: AuthorityRef[] = [
  { cite: "Alaska", title: "Alaska Department of Revenue", href: "https://tax.alaska.gov/" },
  { cite: "Colorado", title: "Colorado Department of Revenue", href: "https://tax.colorado.gov/" },
  { cite: "Connecticut", title: "Connecticut Department of Revenue Services", href: "https://portal.ct.gov/drs" },
  { cite: "Delaware", title: "Delaware Division of Revenue", href: "https://revenue.delaware.gov/" },
  { cite: "District of Columbia", title: "Office of Tax and Revenue", href: "https://otr.cfo.dc.gov/" },
  { cite: "Georgia", title: "Georgia Department of Revenue", href: "https://dor.georgia.gov/" },
  { cite: "Hawaii", title: "Hawaii Department of Taxation", href: "https://tax.hawaii.gov/" },
  { cite: "Idaho", title: "Idaho State Tax Commission", href: "https://tax.idaho.gov/" },
  { cite: "Illinois", title: "Illinois Department of Revenue", href: "https://tax.illinois.gov/" },
  { cite: "Indiana", title: "Indiana Department of Revenue", href: "https://www.in.gov/dor/" },
  { cite: "Iowa", title: "Iowa Department of Revenue", href: "https://tax.iowa.gov/" },
  { cite: "Kentucky", title: "Kentucky Department of Revenue", href: "https://revenue.ky.gov/" },
  { cite: "Louisiana", title: "Louisiana Department of Revenue", href: "https://revenue.louisiana.gov/" },
  { cite: "Maine", title: "Maine Revenue Services", href: "https://www.maine.gov/revenue/" },
  { cite: "Maryland", title: "Comptroller of Maryland", href: "https://www.marylandtaxes.gov/" },
  { cite: "Massachusetts", title: "Massachusetts Department of Revenue", href: "https://www.mass.gov/orgs/massachusetts-department-of-revenue" },
  { cite: "Michigan", title: "Michigan Department of Treasury", href: "https://www.michigan.gov/taxes" },
  { cite: "Minnesota", title: "Minnesota Department of Revenue", href: "https://www.revenue.state.mn.us/" },
  { cite: "Mississippi", title: "Mississippi Department of Revenue", href: "https://www.dor.ms.gov/" },
  { cite: "Missouri", title: "Missouri Department of Revenue", href: "https://dor.mo.gov/" },
  { cite: "Montana", title: "Montana Department of Revenue", href: "https://mtrevenue.gov/" },
  { cite: "Nebraska", title: "Nebraska Department of Revenue", href: "https://revenue.nebraska.gov/" },
  { cite: "Nevada", title: "Nevada Department of Taxation", href: "https://tax.nv.gov/" },
  { cite: "New Hampshire", title: "New Hampshire Department of Revenue Administration", href: "https://www.revenue.nh.gov/" },
  { cite: "New Jersey", title: "New Jersey Division of Taxation", href: "https://www.nj.gov/treasury/taxation/" },
  { cite: "New Mexico", title: "New Mexico Taxation and Revenue Department", href: "https://www.tax.newmexico.gov/" },
  { cite: "North Carolina", title: "North Carolina Department of Revenue", href: "https://www.ncdor.gov/" },
  { cite: "North Dakota", title: "North Dakota Office of State Tax Commissioner", href: "https://www.tax.nd.gov/" },
  { cite: "Ohio", title: "Ohio Department of Taxation", href: "https://tax.ohio.gov/" },
  { cite: "Oregon", title: "Oregon Department of Revenue", href: "https://www.oregon.gov/dor/" },
  { cite: "Pennsylvania", title: "Pennsylvania Department of Revenue", href: "https://www.revenue.pa.gov/" },
  { cite: "Rhode Island", title: "Rhode Island Division of Taxation", href: "https://tax.ri.gov/" },
  { cite: "South Carolina", title: "South Carolina Department of Revenue", href: "https://dor.sc.gov/" },
  { cite: "South Dakota", title: "South Dakota Department of Revenue", href: "https://dor.sd.gov/" },
  { cite: "Utah", title: "Utah State Tax Commission", href: "https://tax.utah.gov/" },
  { cite: "Vermont", title: "Vermont Department of Taxes", href: "https://tax.vermont.gov/" },
  { cite: "Washington", title: "Washington Department of Revenue", href: "https://dor.wa.gov/" },
  { cite: "West Virginia", title: "West Virginia Tax Division", href: "https://tax.wv.gov/" },
  { cite: "Wisconsin", title: "Wisconsin Department of Revenue", href: "https://www.revenue.wi.gov/" },
  { cite: "Wyoming", title: "Wyoming Department of Revenue", href: "https://revenue.wyo.gov/" },
];

function stateItems(): AuthorityRef[] {
  const served = areas.map((area) => ({
    cite: area.name,
    title: area.agencyName,
    href: area.agencyUrl,
  }));
  const names = new Set(served.map((item) => item.cite));
  return [...served, ...moreStates.filter((item) => !names.has(item.cite))].sort((a, b) => a.cite.localeCompare(b.cite));
}

const stateCourts: AuthorityRef[] = [
  { cite: "Alabama", title: "Alabama Administrative Office of Courts", href: "https://www.alacourt.gov/" },
  { cite: "Alaska", title: "Alaska Court System", href: "https://courts.alaska.gov/" },
  { cite: "Arizona", title: "Arizona Judicial Branch", href: "https://www.azcourts.gov/" },
  { cite: "Arkansas", title: "Arkansas Judiciary", href: "https://www.arcourts.gov/" },
  { cite: "California", title: "California Courts", href: "https://www.courts.ca.gov/" },
  { cite: "Colorado", title: "Colorado Judicial Branch", href: "https://www.courts.state.co.us/" },
  { cite: "Connecticut", title: "Connecticut Judicial Branch", href: "https://www.jud.ct.gov/" },
  { cite: "Delaware", title: "Delaware Courts", href: "https://courts.delaware.gov/" },
  { cite: "District of Columbia", title: "District of Columbia Courts", href: "https://www.dccourts.gov/" },
  { cite: "Florida", title: "Florida Courts", href: "https://www.flcourts.gov/" },
  { cite: "Georgia", title: "Georgia Courts", href: "https://georgiacourts.gov/" },
  { cite: "Hawaii", title: "Hawaii State Judiciary", href: "https://www.courts.state.hi.us/" },
  { cite: "Idaho", title: "Idaho Supreme Court", href: "https://isc.idaho.gov/" },
  { cite: "Illinois", title: "Illinois Courts", href: "https://www.illinoiscourts.gov/" },
  { cite: "Indiana", title: "Indiana Courts", href: "https://www.in.gov/courts/" },
  { cite: "Iowa", title: "Iowa Judicial Branch", href: "https://www.iowacourts.gov/" },
  { cite: "Kansas", title: "Kansas Judicial Branch", href: "https://www.kscourts.org/" },
  { cite: "Kentucky", title: "Kentucky Court of Justice", href: "https://kycourts.gov/" },
  { cite: "Louisiana", title: "Louisiana Supreme Court", href: "https://www.lasc.org/" },
  { cite: "Maine", title: "Maine Judicial Branch", href: "https://www.courts.maine.gov/" },
  { cite: "Maryland", title: "Maryland Courts", href: "https://www.mdcourts.gov/" },
  { cite: "Massachusetts", title: "Massachusetts Court System", href: "https://www.mass.gov/orgs/massachusetts-court-system" },
  { cite: "Michigan", title: "Michigan Courts", href: "https://www.courts.michigan.gov/" },
  { cite: "Minnesota", title: "Minnesota Judicial Branch", href: "https://www.mncourts.gov/" },
  { cite: "Mississippi", title: "Mississippi Judiciary", href: "https://courts.ms.gov/" },
  { cite: "Missouri", title: "Missouri Courts", href: "https://www.courts.mo.gov/" },
  { cite: "Montana", title: "Montana Courts", href: "https://courts.mt.gov/" },
  { cite: "Nebraska", title: "Nebraska Judicial Branch", href: "https://supremecourt.nebraska.gov/" },
  { cite: "Nevada", title: "Nevada Judiciary", href: "https://nvcourts.gov/" },
  { cite: "New Hampshire", title: "New Hampshire Judicial Branch", href: "https://www.courts.nh.gov/" },
  { cite: "New Jersey", title: "New Jersey Courts", href: "https://www.njcourts.gov/" },
  { cite: "New Mexico", title: "New Mexico Courts", href: "https://www.nmcourts.gov/" },
  { cite: "New York", title: "New York State Unified Court System", href: "https://www.nycourts.gov/" },
  { cite: "North Carolina", title: "North Carolina Judicial Branch", href: "https://www.nccourts.gov/" },
  { cite: "North Dakota", title: "North Dakota Court System", href: "https://www.ndcourts.gov/" },
  { cite: "Ohio", title: "Supreme Court of Ohio", href: "https://www.supremecourt.ohio.gov/" },
  { cite: "Oklahoma", title: "Oklahoma State Courts Network", href: "https://www.oscn.net/" },
  { cite: "Oregon", title: "Oregon Judicial Department", href: "https://www.courts.oregon.gov/" },
  { cite: "Pennsylvania", title: "Unified Judicial System of Pennsylvania", href: "https://www.pacourts.us/" },
  { cite: "Rhode Island", title: "Rhode Island Judiciary", href: "https://www.courts.ri.gov/" },
  { cite: "South Carolina", title: "South Carolina Judicial Branch", href: "https://www.sccourts.org/" },
  { cite: "South Dakota", title: "South Dakota Unified Judicial System", href: "https://ujs.sd.gov/" },
  { cite: "Tennessee", title: "Tennessee State Courts", href: "https://www.tncourts.gov/" },
  { cite: "Texas", title: "Texas Judicial Branch", href: "https://www.txcourts.gov/" },
  { cite: "Utah", title: "Utah State Courts", href: "https://www.utcourts.gov/" },
  { cite: "Vermont", title: "Vermont Judiciary", href: "https://www.vermontjudiciary.org/" },
  { cite: "Virginia", title: "Virginia's Judicial System", href: "https://www.vacourts.gov/" },
  { cite: "Washington", title: "Washington Courts", href: "https://www.courts.wa.gov/" },
  { cite: "West Virginia", title: "West Virginia Judiciary", href: "https://www.courtswv.gov/" },
  { cite: "Wisconsin", title: "Wisconsin Court System", href: "https://www.wicourts.gov/" },
  { cite: "Wyoming", title: "Wyoming Judicial Branch", href: "https://www.courts.state.wy.us/" },
];

const cities: AuthorityRef[] = [
  { cite: "Baltimore, MD", title: "Baltimore City Department of Finance", href: "https://finance.baltimorecity.gov/" },
  { cite: "Detroit, MI", title: "Detroit Office of the Treasury", href: "https://detroitmi.gov/departments/office-chief-financial-officer/office-treasury" },
  { cite: "Eugene, OR", title: "City of Eugene", href: "https://www.eugene-or.gov/" },
  { cite: "Kansas City, MO", title: "City of Kansas City", href: "https://www.kcmo.gov/" },
  { cite: "New York City", title: "NYC Department of Finance", href: "https://www.nyc.gov/site/finance/index.page" },
  { cite: "Newark, NJ", title: "City of Newark", href: "https://www.newarknj.gov/" },
  { cite: "Philadelphia, PA", title: "Philadelphia Department of Revenue", href: "https://www.phila.gov/departments/department-of-revenue/" },
  { cite: "Portland, OR", title: "Portland Revenue Division", href: "https://www.portland.gov/revenue" },
  { cite: "Yonkers, NY", title: "City of Yonkers", href: "https://www.yonkersny.gov/" },
];

function stateKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function shelfId(prefix: string, label: string) {
  return `${prefix}-${stateKey(label)}`;
}

function shelvesFor(group: AuthorityGroupId, prefix: string, summary: string, items: AuthorityRef[]): AuthorityShelf[] {
  return items.map((item) => {
    const key = stateKey(item.cite);
    const pack = group === "state-rules" || group === "state-courts" ? statePacks[key] : undefined;
    if (pack) {
      return {
        id: shelfId(prefix, item.cite),
        group,
        label: item.cite,
        summary: `${pack.office} publishes these decisions. Current through ${pack.asOf}. Where the office's file can be read here, opening it writes the official text into the page.`,
        pack: key,
      };
    }
    return {
      id: shelfId(prefix, item.cite),
      group,
      label: item.cite,
      summary,
      items: [item],
    };
  });
}

export const authorityShelves: AuthorityShelf[] = [
  {
    id: "irc",
    group: "primary",
    label: "Internal Revenue Code",
    summary: "Every section of Title 26. Open one and the statute is written here from the Office of the Law Revision Counsel.",
    corpus: "irc",
  },
  {
    id: "regulations",
    group: "regulations",
    label: "Treasury Regulations",
    summary: "Every section of Title 26 of the Code of Federal Regulations. Open one and the regulation is written here from the eCFR.",
    corpus: "regulations",
  },
  {
    id: "irs-aod",
    group: "irs",
    label: "Actions on Decision",
    summary: "The Chief Counsel’s recommendation on whether to follow a court decision. Open one and the memorandum is written here from IRS.gov.",
    corpus: "aod",
  },
  {
    id: "irs-atg",
    group: "irs",
    label: "Audit Technique Guides (ATGs)",
    summary: "The examination guides the IRS publishes for specific industries and issues. Open one and the guide is written here.",
    corpus: "guides",
  },
  {
    id: "irs-ccn",
    group: "irs",
    label: "Chief Counsel Notices",
    summary: "Part 32 of the Internal Revenue Manual, the Chief Counsel Directives Manual. Open a section and it is written here.",
    corpus: "counsel",
  },
  {
    id: "irs-faa",
    group: "irs",
    label: "Field Attorney Advice",
    summary: "Field attorney advice, published in the IRS written-determinations search.",
    items: [{ cite: "Field Attorney Advice", title: "Written determinations on IRS.gov", href: "https://www.irs.gov/written-determinations" }],
  },
  {
    id: "irs-faq",
    group: "irs",
    label: "IRS FAQs",
    summary: "The IRS’s own questions and answers, by topic. A FAQ is not a revenue ruling. Open a topic and it is written here.",
    corpus: "faqs",
  },
  {
    id: "irs-practice",
    group: "irs",
    label: "IRS Practice Units (LB&I)",
    summary: "Large Business and International practice units, published by the IRS. Open one and the unit is written here.",
    corpus: "practice-units",
  },
  {
    id: "irs-publications",
    group: "irs",
    label: "IRS Publications",
    summary: "The plain-language publications the IRS issues for forms and topics. Open one and the publication is written here.",
    corpus: "publications",
  },
  {
    id: "irs-irb",
    group: "irs",
    label: "Internal Revenue Bulletin",
    summary: "Weekly Internal Revenue Bulletins back through 2018. Open one and the bulletin is written here.",
    corpus: "bulletins",
  },
  {
    id: "irs-irm",
    group: "irs",
    label: "Internal Revenue Manual",
    summary: "Every section of the Internal Revenue Manual. Open one and the section is written here.",
    corpus: "irm",
  },
  {
    id: "irs-lbi",
    group: "irs",
    label: "LB&I Directives",
    summary: "The LB&I practice units the IRS publishes as its industry guidance. Open one and the unit is written here.",
    corpus: "practice-units",
  },
  {
    id: "irs-pmta",
    group: "irs",
    label: "Program Manager Technical Advice",
    summary: "Program manager technical advice, published in the IRS written-determinations search.",
    items: [{ cite: "Program Manager Technical Advice", title: "Written determinations on IRS.gov", href: "https://www.irs.gov/written-determinations" }],
  },
  {
    id: "irs-written",
    group: "irs",
    label: "Written Determinations (PLR/TAM/CCA)",
    summary: "Private letter rulings, technical advice memoranda, chief counsel advice, field attorney advice, and program manager technical advice.",
    items: [{ cite: "Written determinations", title: "Official search on IRS.gov", href: "https://www.irs.gov/written-determinations" }],
  },
  {
    id: "irs-determination",
    group: "irs",
    label: "Determination Letters",
    summary: "Exempt-organization determination letters, published by the IRS.",
    items: [{ cite: "Determination letters", title: "Charities and nonprofits on IRS.gov", href: "https://www.irs.gov/charities-and-nonprofits" }],
  },
  {
    id: "irs-exchange",
    group: "irs",
    label: "IRS Yearly Average Exchange Rates",
    summary: "The yearly average currency exchange rates the IRS publishes, one row for each currency.",
    corpus: "rates",
  },
  {
    id: "court-federal",
    group: "courts",
    label: "Federal Court Opinions",
    summary: "Opinions of the federal courts that mention the Internal Revenue Code or the Internal Revenue Service. Open one and the opinion is written here from GovInfo.",
    live: "federal",
  },
  {
    id: "court-tax",
    group: "courts",
    label: "Tax Court Opinions",
    summary: "Reported opinions, memorandum opinions, and summary opinions from the Tax Court’s Dawson record. Open one and the opinion is written here.",
    corpus: "opinions",
  },
  {
    id: "court-rules",
    group: "courts",
    label: "Tax Court Rules of Practice",
    summary: "Each Rule of Practice and Procedure. Open one and the rule is written here from the Tax Court.",
    corpus: "rules",
  },
  {
    id: "court-orders",
    group: "courts",
    label: "Tax Court Orders",
    summary: "Orders filed with the Tax Court since January 2024. Open one and the order is written here from the court’s Dawson record.",
    live: "orders",
  },
  {
    id: "court-supreme",
    group: "courts",
    label: "Supreme Court",
    summary: "Opinions of the Supreme Court of the United States.",
    items: [{ cite: "Supreme Court", title: "Official opinions", href: "https://www.supremecourt.gov/" }],
  },
  {
    id: "court-appeals",
    group: "courts",
    label: "Courts of Appeals",
    summary: "The thirteen federal courts of appeals. A tax appeal is decided by the circuit for the taxpayer.",
    items: [{ cite: "U.S. Courts of Appeals", title: "Official court directory", href: "https://www.uscourts.gov/about-federal-courts/court-role-and-structure" }],
  },
  {
    id: "court-claims",
    group: "courts",
    label: "Court of Federal Claims",
    summary: "Refund suits against the United States are heard here when the taxpayer chooses this court.",
    items: [{ cite: "Court of Federal Claims", title: "Official court site", href: "https://www.uscfc.uscourts.gov/" }],
  },
  {
    id: "crs",
    group: "legislative",
    label: "Congressional Research Service Reports",
    summary: "Congressional Research Service reports, on Congress.gov.",
    items: [{ cite: "Congressional Research Service", title: "Reports on Congress.gov", href: "https://www.congress.gov/crs-products" }],
  },
  {
    id: "gao",
    group: "legislative",
    label: "GAO Tax Reports",
    summary: "Government Accountability Office reports on tax administration.",
    items: [{ cite: "Government Accountability Office", title: "Tax reports", href: "https://www.gao.gov/tax" }],
  },
  {
    id: "jct",
    group: "legislative",
    label: "JCT Publications",
    summary: "Explanations and estimates from the Joint Committee on Taxation.",
    items: [{ cite: "Joint Committee on Taxation", title: "Official publications", href: "https://www.jct.gov/" }],
  },
  {
    id: "treaties",
    group: "treaties",
    label: "Tax Treaties",
    summary: "The income tax treaty documents the IRS publishes for each treaty partner. Open one and it is written here.",
    corpus: "treaties",
  },
  {
    id: "model-treaties",
    group: "treaties",
    label: "Model Treaties",
    summary: "The United States model income tax convention, published by the Treasury.",
    items: [{ cite: "Model Treaties", title: "Treasury Office of Tax Policy", href: "https://home.treasury.gov/policy-issues/tax-policy/treaties" }],
  },
  {
    id: "treaty-explanations",
    group: "treaties",
    label: "Treasury Treaty Explanations",
    summary: "Technical explanations of the income tax treaties, published with the treaty documents. Open one and it is written here.",
    corpus: "explanations",
  },
  ...shelvesFor("state-rules", "rule", "The state tax agency. Its statutes, administrative rules, and forms are published here.", stateItems()),
  ...shelvesFor("state-courts", "court", "The state judiciary. Its opinions are published by that court system.", stateCourts),
  ...shelvesFor("cities", "city", "The city office that administers the local tax.", cities),
  {
    id: "senate-finance",
    group: "research",
    label: "Congressional Tax Committees - Senate",
    summary: "The Senate Finance Committee, which writes tax legislation.",
    items: [{ cite: "Senate Finance", title: "Official committee site", href: "https://www.finance.senate.gov/" }],
  },
  {
    id: "ways-means",
    group: "research",
    label: "Congressional Tax Committees - Ways and Means",
    summary: "The House Ways and Means Committee, which writes tax legislation.",
    items: [{ cite: "Ways and Means", title: "Official committee site", href: "https://waysandmeans.house.gov/" }],
  },
  {
    id: "oecd-pillar",
    group: "research",
    label: "OECD Pillar Two (GloBE Model Rules)",
    summary: "The OECD’s Pillar Two materials. These are not United States statutes.",
    items: [{ cite: "OECD", title: "Global minimum tax", href: "https://www.oecd.org/en/topics/sub-issues/global-minimum-tax.html" }],
  },
  {
    id: "oecd-tp",
    group: "research",
    label: "OECD Transfer Pricing Guidelines",
    summary: "The OECD Transfer Pricing Guidelines. These are not United States statutes.",
    items: [{ cite: "OECD", title: "Transfer pricing", href: "https://www.oecd.org/tax/transfer-pricing/" }],
  },
  {
    id: "tpc",
    group: "research",
    label: "Tax Policy Center",
    summary: "Commentary and estimates from the Tax Policy Center. This is not primary law.",
    items: [{ cite: "Tax Policy Center", title: "taxpolicycenter.org", href: "https://taxpolicycenter.org/" }],
  },
  {
    id: "tax-foundation",
    group: "research",
    label: "Tax Foundation",
    summary: "Commentary and data from the Tax Foundation. This is not primary law.",
    items: [{ cite: "Tax Foundation", title: "taxfoundation.org", href: "https://taxfoundation.org/" }],
  },
];

export function authorityGroupLabel(group: AuthorityGroupId) {
  switch (group) {
    case "primary":
      return "Primary law";
    case "regulations":
      return "Regulations";
    case "courts":
      return "Courts";
    case "irs":
      return "IRS";
    case "legislative":
      return "Legislative materials";
    case "treaties":
      return "Treaty materials";
    case "state-rules":
      return "State administrative rules";
    case "state-courts":
      return "State courts";
    case "cities":
      return "City administrative rules";
    case "research":
      return "Other federal sources";
    case "firm":
      return "The firm";
    default: {
      const exhaustive: never = group;
      return exhaustive;
    }
  }
}
