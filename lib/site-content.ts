export type Service = {
  slug: string;
  image: string;
  imageAlt: string;
  title: string;
  summary: string;
  lede: string;
  sections: { heading: string; paragraphs: string[] }[];
  includes: { title: string; body: string }[];
};

export type ServiceArea = {
  slug: string;
  image: string;
  imageAlt: string;
  name: string;
  abbr: string;
  home?: boolean;
  summary: string;
  filing: string;
  focus: string;
  local: string;
  agencyName: string;
  agencyUrl: string;
};

export const services: Service[] = [
  {
    slug: "tax-preparation",
    image: "/photos/stock/services/tax-preparation.jpg",
    imageAlt: "An open notebook, a pen, and a calculator on a desk",
    title: "Tax preparation",
    summary: "Federal and state returns for individuals, businesses, and non-profits, prepared with care and reviewed before filing.",
    lede: "A return should be accurate, complete, and understandable. We begin with your records and a written engagement, then prepare the forms that fit your facts.",
    sections: [
      {
        heading: "Who this is for",
        paragraphs: [
          "Individuals and families, owners of a local business, and non-profits that need the year’s return prepared by a named enrolled agent. You do not have to live in Hamilton. Clients in the eleven states we serve work with the same team.",
          "A first-year client and a client we have prepared for years follow the same path: a conversation, a written scope, a fee agreed before we start, and a private place to send the records.",
        ],
      },
      {
        heading: "What we prepare",
        paragraphs: [
          "A personal return is usually Form 1040. That can include wages, retirement, investments, a sale of property, and a small business reported on the personal return. We ask about filing status, dependents, and any change in the household before a number is entered.",
          "A business return follows the way the company is organized. A sole proprietor is usually part of the personal return. A partnership is often Form 1065. An S corporation is often Form 1120-S. A C corporation is often Form 1120. We confirm the entity before we choose the form, and we prepare the owner’s personal return so the business result is reflected there.",
          "A non-profit return is often Form 990, 990-EZ, or 990-N, depending on the organization’s receipts. The return has to agree with the books. If the books are part of the engagement, we put them in order first.",
          "Where a state taxes income or business activity, the state return is prepared with the federal return. Texas and some other states do not tax wages, and a federal return is still required. We tell you which state filings the engagement includes before work begins.",
        ],
      },
      {
        heading: "What you receive",
        paragraphs: [
          "You receive a draft to review, time to ask questions, and a filed return only after you have approved it. You also keep a copy in your portal, with the organizer of what we used: W-2s, 1099s, last year’s return, and the statements that support the figures.",
          "The fee is quoted from the return and the condition of the records. A simple wage return and a return with a business, a move, or several states are not the same engagement, and they are not the same fee.",
        ],
      },
      {
        heading: "Notices and representation",
        paragraphs: [
          "Laura Wallace is an enrolled agent, licensed by the IRS to prepare returns and to represent taxpayers. If a notice arrives after filing, she can speak for you when representation is part of the engagement.",
          "That authority is given on Form 2848, Power of Attorney. You review it and sign it in the client portal. Our team then submits it to the IRS. Before a remote power of attorney is submitted, we confirm identity in the way the IRS requires, and that step is recorded with your file.",
        ],
      },
    ],
    includes: [
      { title: "Individual returns", body: "Wages, family changes, retirement, investments, and a small business reported on the personal return." },
      { title: "Business returns", body: "Partnership, S corporation, and C corporation returns, prepared after the entity is confirmed and the books agree." },
      { title: "Non-profit returns", body: "Form 990, 990-EZ, or 990-N, matched to the organization’s receipts and to its books." },
      { title: "The state return", body: "The state filing that applies where you live, work, or operate, named in the engagement before we start." },
      { title: "A review before filing", body: "You see the return and can ask questions. We file after you approve it." },
      { title: "A complete source file", body: "W-2s, 1099s, last year’s return, and identification, gathered once in your private portal." },
    ],
  },
  {
    slug: "bookkeeping",
    image: "/photos/stock/services/bookkeeping.jpg",
    imageAlt: "A desk with a calculator, an open notebook, and a laptop",
    title: "Bookkeeping",
    summary: "Books kept current through the year, so the tax return is a closing and not a reconstruction.",
    lede: "Good tax work starts with good books. We keep income, expenses, and balances current so you can see the year clearly before a return is due.",
    sections: [
      {
        heading: "Who this is for",
        paragraphs: [
          "A sole proprietor, a small company, or a non-profit that wants one practice to keep the books and prepare the return. The schedule is the one we write into the engagement: monthly, quarterly, or a year-end close, depending on the volume of the records.",
          "This is bookkeeping for a private tax practice. It is the record the return is built on. It is not an audit, and it is not a substitute for the bank’s own statements.",
        ],
      },
      {
        heading: "What we keep",
        paragraphs: [
          "Income is recorded from the deposits and the invoices you send. Expenses are recorded from the receipts and the accounts you use. We reconcile the books to the bank and card statements so a balance is not a guess.",
          "A business with contractors, inventory, or more than one account tells us that at the start. Those facts change how the books are organized. Payroll service, if you use one, stays with that provider. We use the payroll reports in the books and on the return.",
          "For a non-profit, we separate contributions, program costs, and restricted gifts so a board can see what the money was for. The annual information return is then prepared from those same records.",
        ],
      },
      {
        heading: "What you can do with a current set of books",
        paragraphs: [
          "Estimated taxes, a conversation with a lender, and the annual return should all start from the same numbers. When the books are current, tax season is a closing. You are not rebuilding the year from a box of mail.",
          "You can ask, during the year, whether the numbers still match the plan. That question belongs with tax planning, and we will tell you when it is time to have it.",
        ],
      },
    ],
    includes: [
      { title: "Income and expenses", body: "Recorded from the statements and receipts you provide, on the schedule in the engagement." },
      { title: "Reconciliations", body: "Bank and card accounts agreed to the statements before the year is closed." },
      { title: "A year you can read", body: "A set of books an owner, a lender, or a board can follow without a translator." },
      { title: "A clean handoff", body: "The books move into tax preparation without being rebuilt from scratch." },
    ],
  },
  {
    slug: "tax-planning",
    image: "/photos/stock/services/tax-planning.jpg",
    imageAlt: "A calendar on a tablet beside a laptop showing charts",
    title: "Tax planning",
    summary: "A thoughtful look at the year while there is still time to act, not only a signature on last year’s forms.",
    lede: "The best time to talk about taxes is before the year is over. Planning uses the same records as the return, with enough time left to make a decision.",
    sections: [
      {
        heading: "When to call",
        paragraphs: [
          "Call when the year is still open. A new job, a bonus, a retirement distribution, a sale, a move, a new business, or a gift can change what you owe. The fall is the useful time. A quarterly payment or a timing decision can still be made.",
          "Planning is also the conversation before you choose how a new business is organized. A sole proprietorship, a partnership, an S corporation, and a C corporation do not file the same return, and they do not tax the owner the same way. We settle that question from your facts before a form is chosen.",
        ],
      },
      {
        heading: "What the conversation covers",
        paragraphs: [
          "We look at income you have already received, income you still expect, and the payments you have already made. Estimated taxes are compared with the year you are actually having, not with last year’s guess.",
          "If you live in one state and earn in another, both returns are part of the plan. Texas does not tax wages, and several states we serve do. The advice follows the states in your engagement.",
          "You leave with a written sense of what is due, what is still missing, and the dates that matter. We will tell you what the records support. We will not promise a refund.",
        ],
      },
    ],
    includes: [
      { title: "Estimated taxes", body: "A review of whether quarterly payments still match income, withholding, and the states where you file." },
      { title: "A change in the year", body: "A move, a new business, a sale, retirement income, or a household change, looked at while you can still act." },
      { title: "The right entity", body: "How a business is organized decides which return it files. We settle that before a form is chosen." },
      { title: "A calendar you can keep", body: "The deadlines for estimates, the return, and the documents still outstanding." },
    ],
  },
  {
    slug: "financial-management",
    image: "/photos/stock/services/financial-management.jpg",
    imageAlt: "People working through notes around a table",
    title: "Financial management",
    summary: "Clear financial guidance for people, companies, and non-profits who want the numbers and the tax return to agree.",
    lede: "Tax preparation and financial management belong together. We help you understand the year you had, and what it means for the return still ahead.",
    sections: [
      {
        heading: "What this engagement is",
        paragraphs: [
          "Financial management, in this practice, means the books and the tax consequences of those books are handled together. An owner can see income, spending, and what remains. A non-profit board can read a report that matches the bank. The annual return uses those same figures.",
          "The work might be a budget you can follow through the year, a year-end picture before you meet a lender, or a regular look at whether the business is still on the plan you set. The scope is written down. A standing review and a single year-end meeting are different engagements, and the fee follows the scope.",
        ],
      },
      {
        heading: "What we will tell you",
        paragraphs: [
          "We explain the year in plain language: what came in, what went out, what is owed, and what the return is likely to show. If a decision changes the tax, we say so while there is still time to choose.",
          "Some questions belong with an attorney, a lender, or an investment adviser. We will say so and stay in our role. We prepare and explain the records. We do not manage investments, and we do not give legal advice.",
        ],
      },
    ],
    includes: [
      { title: "A clear year", body: "Income, spending, and what remains, explained so you can use it." },
      { title: "A report you can share", body: "Figures an owner, a lender, or a board can read, tied to the statements." },
      { title: "One set of numbers", body: "Planning, the books, and the tax return use the same records." },
      { title: "A named scope", body: "You see how often we meet and what the fee covers before the work begins." },
    ],
  },
  {
    slug: "individuals",
    image: "/photos/stock/services/individuals.jpg",
    imageAlt: "A family at breakfast",
    title: "Individuals and families",
    summary: "Personal tax preparation for individuals and families, including a move, a new child, or a small business on the return.",
    lede: "Your personal return should reflect the year you actually lived. We take the time to understand the household, the income, and any move across state lines before we prepare it.",
    sections: [
      {
        heading: "What a personal return can include",
        paragraphs: [
          "Wages and withholding from a W-2. Interest, dividends, retirement, and contract income reported on 1099s. A sale of stock or a home. A dependent, a change in filing status, or a new child. A small business or rental activity that belongs on the personal return.",
          "We start from last year’s return so filing status, depreciation, and carryovers come forward. If last year was prepared by someone else, send that copy. If this is your first return, tell us. We will build the file from the documents you have.",
        ],
      },
      {
        heading: "More than one state",
        paragraphs: [
          "A move, a job across a state line, or a spouse who lives and works in different places can mean two state returns plus the federal return. Tell us where you lived and where you worked, and the dates. We name those returns in the engagement before we begin.",
          "A Texas resident with only Texas wages usually has a federal return and no Texas income tax return. A client in a state that taxes income has both. We prepare the set your facts require.",
        ],
      },
      {
        heading: "How your file is kept",
        paragraphs: [
          "Your name, address, and taxpayer information are entered once in a private portal. That profile carries into the engagement letter and, if you need representation, Form 2848. Documents you upload are visible to you and to our team, and to no one else.",
          "You review the return with us before it is filed. If a notice comes later, your enrolled agent can stand with you when that work is part of the engagement.",
        ],
      },
    ],
    includes: [
      { title: "Every source of income", body: "W-2s, 1099s, brokerage and retirement forms, and last year’s return, so carryovers are not left behind." },
      { title: "Your household", body: "Filing status and dependents, confirmed before the return is prepared." },
      { title: "A small business on the personal return", body: "Income and expenses for work you report on your own return, after the records are in order." },
      { title: "The state return, when one is due", body: "The state filing for where you lived and where you worked, including a part-year move." },
    ],
  },
  {
    slug: "businesses",
    image: "/photos/stock/services/businesses.jpg",
    imageAlt: "A cafe counter during a busy morning",
    title: "Businesses",
    summary: "Bookkeeping and business tax preparation for owners who want one practice to carry both.",
    lede: "A business return is only as sound as the books behind it. We keep those records in order and prepare the return that matches how the company is organized.",
    sections: [
      {
        heading: "We start with the entity",
        paragraphs: [
          "A sole proprietor, a partnership, an S corporation, and a C corporation do not file the same form. We ask how the company is organized, which states it operates in, and whether it pays employees or contractors. Those answers decide the return. They also decide the owner’s personal return.",
          "A sole proprietor’s business is usually reported on the personal return. A partnership often files Form 1065. An S corporation often files Form 1120-S. A C corporation often files Form 1120. If the books say one thing and the formation papers say another, we stop and sort that out before a form is chosen.",
        ],
      },
      {
        heading: "Books, then the return",
        paragraphs: [
          "Income, expenses, and the bank have to tell the same story. If bookkeeping is part of the engagement, we keep those records through the year or close them at year-end, whichever the letter describes. If you already keep the books, we review them against the statements before the return is drafted.",
          "Payroll reports, 1099s issued to contractors, and loan statements belong in the file when they exist. We use them. We do not replace your payroll provider. Sales tax, when a business collects it, is included only when the engagement says so.",
        ],
      },
      {
        heading: "The owner and the state",
        paragraphs: [
          "When profit passes through to the owners, each owner’s personal return has to reflect that result. We prepare the business return and the owner returns that are part of the engagement, so the numbers are not handed off and retyped.",
          "State business filings follow where the company operates. In Texas, many entities file franchise tax even though the state does not tax wages. Other states in our service area tax business income, franchise activity, or both. The engagement names each return before we begin.",
        ],
      },
    ],
    includes: [
      { title: "The right business return", body: "The federal form that matches the way the company is organized." },
      { title: "Books that agree", body: "Income and expenses reconciled to the statements before the return is drafted." },
      { title: "Contractor and payroll records", body: "1099s and payroll reports used in the books and on the return. Your payroll provider stays in place." },
      { title: "The owner’s return", body: "When profit passes through, the personal return reflects it." },
      { title: "State business filings", body: "Franchise tax, income tax, or both, for the states named in the engagement." },
    ],
  },
  {
    slug: "nonprofits",
    image: "/photos/stock/services/nonprofits.jpg",
    imageAlt: "A neighborhood church with a stone foundation and a front stair",
    title: "Non-profit organizations",
    summary: "Books and annual filings for churches, charities, and local organizations that answer to a board.",
    lede: "Non-profits are part of our mission. We keep books a board can read and prepare the annual filing that agrees with them.",
    sections: [
      {
        heading: "Who we serve",
        paragraphs: [
          "Churches, charities, and local organizations that already have an exemption and need the year’s books and the annual information return. A board should be able to see contributions, what was spent on the program, and what money is restricted.",
          "Forming a new organization, or changing an exemption, is legal work. We will tell you when that question belongs with counsel. Our work is the records and the filing those records support.",
        ],
      },
      {
        heading: "The return that fits the organization",
        paragraphs: [
          "Smaller organizations may file Form 990-N. Others file Form 990-EZ or the full Form 990. The choice follows receipts and the exemption, not a preference. We confirm which filing applies before preparation begins, using last year’s return and this year’s books.",
          "Contributions, program costs, management costs, and restricted gifts are kept so the return and the board report agree. If an officer signs the return, that person is identified in the engagement, along with the organization’s EIN.",
        ],
      },
      {
        heading: "Through the year",
        paragraphs: [
          "A board should not meet the return for the first time in the week it is due. When bookkeeping is part of the engagement, we keep the records on the schedule we agree, and the annual filing is a closing.",
          "If the IRS writes the organization, representation can be added for Laura Wallace, EA, with Form 2848 signed by the authorized officer. That step is separate from preparing the return, and it is written into the engagement.",
        ],
      },
    ],
    includes: [
      { title: "The annual return", body: "Form 990, 990-EZ, or 990-N, chosen from the organization’s receipts and exemption." },
      { title: "Books a board can read", body: "Contributions, program costs, and restricted funds, kept in order." },
      { title: "A clear signer", body: "The officer who signs is identified, along with the organization’s EIN." },
      { title: "A review with the board’s representative", body: "The return is walked through before it is filed." },
    ],
  },
];

export const areas: ServiceArea[] = [
  {
    slug: "texas",
    image: "/photos/stock/areas/texas.jpg",
    imageAlt: "Storefronts along a street in Hamilton, Texas",
    name: "Texas",
    abbr: "TX",
    home: true,
    summary: "Tax preparation, bookkeeping, and financial guidance for individuals, businesses, and non-profits across Texas.",
    filing:
      "Texas does not tax wages, and a federal return is still required. A person who lived and worked only in Texas usually files Form 1040 and no Texas income tax return. Many Texas businesses still file franchise tax with the Comptroller, based on the entity and its revenue. We prepare the federal return, the franchise tax return when it belongs in the engagement, and the owner’s personal return that reflects the business.",
    focus:
      "Tell us the town you live in, whether you had a business, rental, or farm, and whether any income was earned in another state. A church or charity tells us last year’s information return and who on the board will sign. We list every form, and the fee, before preparation starts.",
    local:
      "Hamilton is our home. Clients elsewhere in Texas meet the same enrolled agent by phone and send records through a private portal. You receive a written engagement, and a fee, before we begin. The return is reviewed with you before it is filed.",
    agencyName: "Texas Comptroller of Public Accounts",
    agencyUrl: "https://comptroller.texas.gov/",
  },
  {
    slug: "florida",
    image: "/photos/stock/areas/florida.jpg",
    imageAlt: "Siesta Key Beach in Sarasota, Florida",
    name: "Florida",
    abbr: "FL",
    summary: "Federal tax preparation and bookkeeping for Florida individuals and businesses, from our Hamilton practice.",
    filing:
      "Florida does not tax personal wages. A federal return is still part of a complete year. A Florida business may have its own state filings, including corporate income tax or sales tax, depending on what the company does. We prepare the federal return and the Florida business filings the engagement names. If you moved into or out of Florida during the year, the other state’s return may be required as well.",
    focus:
      "Tell us whether you are a resident for the full year, whether you own a business or rental, and whether you collect sales tax. Wage income alone is usually a federal return. A company is a separate conversation about which Florida filings apply.",
    local:
      "Florida clients work directly with our Hamilton team. Documents stay in your private portal, and we review the return with you before it is filed. Laura Wallace, EA, remains the person responsible for the work.",
    agencyName: "Florida Department of Revenue",
    agencyUrl: "https://floridarevenue.com/",
  },
  {
    slug: "tennessee",
    image: "/photos/stock/areas/tennessee.jpg",
    imageAlt: "Cades Cove in Great Smoky Mountains National Park, Tennessee",
    name: "Tennessee",
    abbr: "TN",
    summary: "Personal and business tax preparation for Tennessee clients who want a practice they can call by name.",
    filing:
      "Tennessee does not tax wages and salaries, so a personal year is usually the federal return. Businesses may still have franchise and excise tax filings, and a company that collects sales tax has that filing as well when it is part of the engagement. We prepare the federal return and the Tennessee business filings your letter includes. A move into a state that taxes income can add that state’s return.",
    focus:
      "Tell us whether the work is a personal return, a business, or a non-profit, and whether the company is already filing franchise and excise tax. Last year’s federal return, and last year’s Tennessee business return if there is one, should come with the records.",
    local:
      "You will know who is preparing the work. The same enrolled agent and team who serve Hamilton also serve our Tennessee clients, by phone and through the client portal. The fee is agreed before we open the file.",
    agencyName: "Tennessee Department of Revenue",
    agencyUrl: "https://www.tn.gov/revenue.html",
  },
  {
    slug: "oklahoma",
    image: "/photos/stock/areas/oklahoma.jpg",
    imageAlt: "The Tallgrass Prairie Preserve in Oklahoma",
    name: "Oklahoma",
    abbr: "OK",
    summary: "Federal and Oklahoma returns for individuals, businesses, and non-profits.",
    filing:
      "Oklahoma taxes individual income, so a complete personal filing usually includes the Oklahoma return with the federal Form 1040. Part-year residents and people who earned income in another state need those facts on the table before we choose the forms. A business return follows the entity. A non-profit files the federal information return that matches its receipts, and any Oklahoma filing the organization already has.",
    focus:
      "Have last year’s federal and Oklahoma returns, this year’s W-2s and 1099s, and, for a business, the books or the statements we will reconcile. Tell us the county you live in and whether you moved during the year.",
    local:
      "Oklahoma clients begin with a phone call. Once we agree on the scope and the fee, you receive a portal invitation and a private place for your records. We review the draft with you before anything is filed.",
    agencyName: "Oklahoma Tax Commission",
    agencyUrl: "https://oklahoma.gov/tax.html",
  },
  {
    slug: "arkansas",
    image: "/photos/stock/areas/arkansas.jpg",
    imageAlt: "The Buffalo National River in Arkansas",
    name: "Arkansas",
    abbr: "AR",
    summary: "Arkansas and federal tax preparation, with the prior-year return in hand before we start.",
    filing:
      "Arkansas taxes individual income. We confirm residency, sources of income, and the type of entity before we choose the forms, then prepare the Arkansas and federal returns together. A part-year move, income from another state, or a business reported on the personal return changes the worksheets. Business entities file their own federal return, and the Arkansas filing that follows from how the company is organized.",
    focus:
      "Send last year’s Arkansas and federal returns so credits, depreciation, and carryovers are not dropped. Tell us every W-2 and 1099, including work performed outside Arkansas.",
    local:
      "Distance does not change the standard. Arkansas clients receive the same written engagement, the same private portal, and the same review before filing. Laura Wallace, EA, is the enrolled agent responsible for the practice.",
    agencyName: "Arkansas Department of Finance and Administration",
    agencyUrl: "https://www.dfa.arkansas.gov/",
  },
  {
    slug: "alabama",
    image: "/photos/stock/areas/alabama.jpg",
    imageAlt: "The Birmingham, Alabama skyline from a city park",
    name: "Alabama",
    abbr: "AL",
    summary: "Alabama and federal tax preparation for clients who want an enrolled agent on the return.",
    filing:
      "Alabama taxes individual income. A personal engagement includes the federal return and the Alabama return. If you lived in Alabama for only part of the year, or earned wages in another state, both facts belong in the first conversation. Business filings follow the way the company is organized: the federal entity return, the owner’s personal return when profit passes through, and the Alabama business filing the engagement includes.",
    focus:
      "Bring last year’s federal and Alabama returns, every income form, and the records for any small business on the return. A non-profit should also send the prior information return and the year’s books.",
    local:
      "Your records are confidential. Alabama clients share documents in a portal that only you and our team can open, and Laura Wallace, EA, remains responsible for the work. The fee is set from the returns and the condition of the records, and you see it before we start.",
    agencyName: "Alabama Department of Revenue",
    agencyUrl: "https://www.revenue.alabama.gov/",
  },
  {
    slug: "kansas",
    image: "/photos/stock/areas/kansas.jpg",
    imageAlt: "A wheat field in late light",
    name: "Kansas",
    abbr: "KS",
    summary: "Kansas and federal tax preparation, with last year’s return used so nothing important is dropped.",
    filing:
      "Kansas taxes individual income. We prepare the federal and Kansas returns together, using last year’s filing so credits, depreciation, and carryovers come forward. Farm and business activity on a personal return, or a separate entity return, is identified before we quote the work. A move into or out of Kansas during the year can add a part-year calculation and, sometimes, another state’s return.",
    focus:
      "Tell us whether the return is wages only, a farm or business, or a non-profit. Last year’s Kansas and federal returns, plus this year’s income forms, are the start of the file.",
    local:
      "Call the Hamilton office. Kansas clients work with us by phone and through the client portal, on a written engagement with a fee agreed in advance. You review the return before it is filed.",
    agencyName: "Kansas Department of Revenue",
    agencyUrl: "https://www.ksrevenue.gov/",
  },
  {
    slug: "arizona",
    image: "/photos/stock/areas/arizona.jpg",
    imageAlt: "Saguaro cacti in Saguaro National Park, Arizona",
    name: "Arizona",
    abbr: "AZ",
    summary: "Federal and Arizona tax preparation for residents, part-year residents, and businesses.",
    filing:
      "Arizona taxes individual income. Full-year residents, part-year residents, and people who earned income in another state do not all file the same way. We ask where you lived, where you worked, and the dates, and we prepare the federal and Arizona filings those facts require. A business follows its entity. Rental property in Arizona is mentioned at the start so the records are in the engagement.",
    focus:
      "Have last year’s federal and Arizona returns, even if you have since moved. Residency and carryovers are hard to rebuild without them. List every state where you worked.",
    local:
      "Arizona clients meet with us by phone. Documents are exchanged through the portal, and the return is reviewed with you before it is filed. The same enrolled agent who serves Hamilton is responsible for the file.",
    agencyName: "Arizona Department of Revenue",
    agencyUrl: "https://azdor.gov/",
  },
  {
    slug: "virginia",
    image: "/photos/stock/areas/virginia.jpg",
    imageAlt: "The Shenandoah Valley from an overlook in Shenandoah National Park",
    name: "Virginia",
    abbr: "VA",
    summary: "Virginia and federal tax preparation for individuals, businesses, and non-profits.",
    filing:
      "Virginia taxes individual income, and some cities and counties have a filing of their own. Tell us your city or county when we begin, so the engagement includes every return that applies. The federal return and the Virginia return are prepared together. A business adds the entity return and the Virginia business filing that matches how the company is organized. A part-year move is planned for before we quote the fee.",
    focus:
      "The city or county is not a detail we can guess. Send it with last year’s Virginia and federal returns, your W-2s and 1099s, and the books if a business or non-profit is part of the work.",
    local:
      "Virginia clients are served from our Hamilton practice with the same attention we give a local appointment: a named preparer, a private file, and time to ask questions. You approve the return before it is filed.",
    agencyName: "Virginia Tax",
    agencyUrl: "https://www.tax.virginia.gov/",
  },
  {
    slug: "new-york",
    image: "/photos/stock/areas/new-york.jpg",
    imageAlt: "The Bear Mountain Bridge over the Hudson River in New York",
    name: "New York",
    abbr: "NY",
    summary: "Federal and New York tax preparation for clients who live or earn in the state.",
    filing:
      "New York taxes individual income. Some clients who live or work in New York City also have a city filing. We ask where you lived and where you worked, including the dates, before we select the forms. The federal return and the New York return are prepared together. A business adds the entity return and the New York business filing the engagement includes. Income from another state is identified at the start.",
    focus:
      "Tell us the city, whether any work was done in New York City, and whether you moved during the year. Last year’s New York and federal returns, plus every W-2 and 1099, belong in the portal before we draft.",
    local:
      "New York clients work with Laura Wallace, EA, and our Hamilton team. There is one practice and one standard of care, whether you are in the city or upstate. Meetings are by phone. Records stay in your private portal.",
    agencyName: "New York State Department of Taxation and Finance",
    agencyUrl: "https://www.tax.ny.gov/",
  },
  {
    slug: "california",
    image: "/photos/stock/areas/california.jpg",
    imageAlt: "The Big Sur coastline in California",
    name: "California",
    abbr: "CA",
    summary: "California and federal tax preparation for clients who want the work handled carefully and personally.",
    filing:
      "California taxes individual income and follows its own conformity rules, so a federal figure does not always land on the California return unchanged. Residency, community property, and income from another state all change the forms. A full-year resident, a part-year resident, and a person who left California during the year are different engagements. Please include last year’s California return so credits, depreciation, and carryovers come forward.",
    focus:
      "Tell us the dates you lived in California, whether you are married, and whether a business or rental is on the return. The prior California return is the document we most need if one exists. Business entities add their own federal and California filings, named in the engagement.",
    local:
      "California clients receive the same private-practice service as our clients in Hamilton: a written engagement, a secure portal for your records, and a review of the return before filing. Laura Wallace, EA, leads the work.",
    agencyName: "California Franchise Tax Board",
    agencyUrl: "https://www.ftb.ca.gov/",
  },
];

export const steps = [
  { title: "A conversation", body: "Tell us about the return or the books. We will tell you whether we can help, what we need, and what the work will cost." },
  { title: "A written engagement", body: "Before preparation begins, you receive an engagement letter that describes the work and the fee." },
  { title: "A private portal", body: "Your profile, signature, and documents are kept in a folder only you and our team can open." },
  { title: "Careful preparation", body: "We prepare the return from your records and review it with you. If a notice comes later, your enrolled agent can stand with you." },
];

export const faqs = [
  {
    question: "Who will prepare my return?",
    answer:
      "Laura Wallace, an enrolled agent licensed by the IRS, leads the practice. You work with her team in Hamilton, Texas, and you can call them directly.",
  },
  {
    question: "Do I need to live in Hamilton?",
    answer:
      "No. Our office is in Hamilton, and we serve clients in Texas, Oklahoma, Arkansas, Alabama, Tennessee, Kansas, Florida, Arizona, Virginia, New York, and California. Meetings are by phone, and documents are exchanged through the client portal.",
  },
  {
    question: "What is an enrolled agent?",
    answer:
      "An enrolled agent is licensed by the IRS to prepare federal tax returns and to represent taxpayers before the IRS. It is a federal credential, separate from a certified public accountant license.",
  },
  {
    question: "How do I become a client?",
    answer:
      "Call or email us. After we agree on the work and the fee, we invite you to the client portal. Current clients sign in with a secure link sent to their email.",
  },
  {
    question: "What should I have ready?",
    answer:
      "A photo ID, your W-2s and 1099s, and last year’s tax return. A business or non-profit should also send the records that support its books. Your taxpayer identification number is entered once and stored encrypted.",
  },
  {
    question: "Can you help if I receive an IRS notice?",
    answer:
      "Yes, when representation is part of the engagement. You sign Form 2848 in the portal, and our team submits it to the IRS so Laura Wallace can speak for you.",
  },
  {
    question: "How are fees set?",
    answer:
      "The fee depends on the return and the condition of the records. We quote it before work begins, as part of a caring and affordable practice. There is no single price for every client.",
  },
];

export const documentsToBring = [
  { name: "Photo identification", detail: "A current ID, so we know who we are serving and can complete any identity step the IRS requires." },
  { name: "Taxpayer identification", detail: "Your Social Security number or the organization’s EIN, entered once and stored encrypted." },
  { name: "W-2s and 1099s", detail: "Every form, including brokerage, retirement, and contract income." },
  { name: "Last year’s return", detail: "So filing status, depreciation, and carryovers come forward correctly." },
  { name: "Business or organization records", detail: "Books, statements, and any return the company or non-profit already files." },
];

export const processPhoto = {
  src: "/photos/stock/process.jpg",
  alt: "A phone, a pen, and an open notebook on a desk",
};

export const practicePhoto = {
  src: "/photos/stock/practice.jpg",
  alt: "Downtown Hamilton, Texas",
};

export const lauraPhoto = {
  src: "/brand/laura-wallace.jpg",
  alt: "Laura Wallace, Enrolled Agent",
};

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

export function getArea(slug: string): ServiceArea | undefined {
  return areas.find((area) => area.slug === slug);
}
