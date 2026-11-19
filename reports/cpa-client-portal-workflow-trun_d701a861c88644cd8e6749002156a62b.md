# Build a Tax Portal That Removes Preparer Chasing

## Executive Summary

- **Build An Orchestrator, Not A Tax Engine**: Keep calculation, diagnostics and transmission in the firm's tax software. The portal should organize evidence, questions, approvals and delivery. Review becomes expensive when support is scattered across PDFs, email and spreadsheets. [10]
- **Fix The Missing Signature Type**: Engagement letters and Form 2848 do not cover the usual Form 1040 e-file authorization workflow. Add **Form 8879**, with separate taxpayer and spouse completion, before treating a return as ready to transmit. [16] 
- **Separate Upload From Acceptance**: A client uploading something is not the same as the firm confirming that it answers a request. Make staff review an explicit step, with a reason when an item must be replaced.
- **Make Waiting Actionable**: Replace an undifferentiated "waiting on client" label with a named request, responsible person, due date and next staff action. Late and incomplete organizers are a documented source of tax-season delay. [10]
- **Keep Payment And Filing Separate**: An extension extends filing, not the underlying payment obligation. A firm's invoice, the client's tax balance and estimated payments need different records and different labels. [20] [15]
- **Treat Consent As Purpose-Specific**: Section 7216 reaches more than the final return PDF. It covers information obtained in connection with preparation, including worksheets and other preparer-created material. Do not replace its exceptions and consent requirements with a general privacy checkbox. [23]
- **Preserve Filing Outcomes**: "Signed," "transmitted," "accepted," "rejected" and "closed" must be different events. A signed delivery package is not an IRS acknowledgement. [16]
- **Launch With Human-Controlled Gates**: For a one-to-few-person firm, prioritize reviewed intake, request ownership, signer tracking and acknowledgement capture over elaborate automation. These are recommended design choices, not claims that every named product implements them.

**Scope.** This report uses "2025 filing season" for returns generally filed during 2025, usually tax year 2024, and "2026 filing season" for returns generally filed during 2026, usually tax year 2025. The IRS identifies its 2026 season with 2025 returns. Current operational references include Publication 1345, revision October 2026. [22] [16]

## 1. Run The Annual Engagement Around Evidence And Deadlines

### A 1040 engagement starts before document upload

A practical annual sequence is: renew the relationship, confirm household and service scope, agree fees and responsibilities, collect information, review intake, prepare, review technically, resolve questions, let the client review, obtain filing authorization, transmit, check acknowledgements and deliver the final package. Preparation can loop back to questions; an extension can interrupt the calendar without ending the engagement.

For this product, create a **separate engagement for each taxpayer/entity, tax year and service**. A household might have a joint 1040 engagement, a separate S corporation engagement and a notice-response engagement. Share permitted contact information, not one undifferentiated status.

Use the following ordinary federal calendar as a planning baseline. These are calendar-year dates without disaster relief or other special extensions; fiscal-year returns and state obligations need separate rules. The business extension mechanism is Form 7004, generally providing six additional months for covered returns. [21] [20]

| Return or obligation | 2025 filing season | 2026 filing season | Extension and operational consequence |
|---|---|---|---|
| Individual **Form 1040**, including Schedule C | April 15, 2025 | April 15, 2026 | **Form 4868** ordinarily extends filing to October 15 of that year. Estimate and pay the balance by the original deadline. |
| Calendar-year partnership **Form 1065** or S corporation **Form 1120-S** | March 17, 2025 | March 16, 2026 | **Form 7004** ordinarily extends filing to September 15. Track delivery of owners' Schedules K-1. |
| Calendar-year C corporation **Form 1120** | April 15, 2025 | April 15, 2026 | **Form 7004** ordinarily extends filing to October 15. Payment is still a separate obligation. |
| Calendar-year exempt organization **Form 990/990-EZ** | May 15, 2025 | May 15, 2026 | **Form 8868** ordinarily extends filing six months: November 17, 2025, or November 16, 2026, after weekend adjustment. |
| Eligible small exempt organization's **Form 990-N** | May 15, 2025 | May 15, 2026 | Do not offer the Form 8868 extension path for 990-N. |

**Design implication:** Never implement one universal "business deadline." Store return form, tax period, original deadline, extended deadline, jurisdiction and any special relief separately. The exact calendar should be validated for the engagement before reminders are issued.

### Schedule C needs business records, not another entity return by default

Schedule C is part of the owner's Form 1040, not automatically a separate March business return. Ask who supplies the books: the owner, an outside bookkeeper, or the firm under a separately agreed bookkeeping scope. The portal should distinguish **client-supplied figures** from **firm-reconciled figures**.

A useful Schedule C request set includes income and expense summaries, bookkeeping exports, bank and credit-card statements where needed, payment-processor reports, cash receipts, asset purchases and disposals, vehicle/mileage records, inventory when applicable, and business-use details. A stack of bank statements is not itself an agreed profit-and-loss statement. For a partnership or corporation, add the trial balance, balance sheet, reconciliations, payroll summaries, debt and fixed-asset schedules, owner contributions/distributions and prior return/K-1 information as relevant.

For a nonprofit, route financial requests to its treasurer or bookkeeper and governance questions to an authorized officer. Request financial statements or a trial balance plus program activities, grants, fundraising, compensation, board/governance information and related-party information as applicable. Confirm whether the engagement is for 990, 990-EZ, 990-N, or another return; "nonprofit" alone is not a filing specification.

### Extensions and estimates remain open work

Treat an extension as its own mini-workflow: obtain enough information to estimate liability, confirm payment instructions and authorization, file the extension through the appropriate channel, record its result, and create a dated plan for outstanding documents. An extension must not silently close a return engagement. Form 7004 is a filing extension, not a general payment extension. [20] [20]

For individuals, estimated tax normally uses **Form 1040-ES**. The 2025 installment dates are April 15, June 16, September 15, 2025, and January 15, 2026; the 2026 dates are April 15, June 15, September 15, 2026, and January 15, 2027. Separate estimated-payment reminders from the prior year's balance due, and show "payment recorded by client" rather than "paid to IRS" without payment evidence.

After transmission, acceptance moves the engagement toward delivery and closure; rejection creates a correction task, not a completed filing. Publication 1345 provides rejection-correction procedures and time-sensitive perfection rules. Do not reuse an individual-return correction timer indiscriminately for business returns, extensions or state filings. 

**Build decision:** Give every engagement both a work plan and a deadline plan. Document readiness, tax payment and filing acceptance are independent dimensions.

## 2. Assign Each Handoff To A Role, Even In A Solo Firm

The following is a recommended responsibility model. One person may hold several roles, but the product should preserve the distinction between collecting a document, making a tax judgment and approving transmission. A solo practitioner's self-review is not an independent second review.

| Role | Actual work | Handoff the desk should record |
|---|---|---|
| Client | Supplies complete facts and records; answers follow-up questions; reviews the return; signs applicable authorizations; pays fees and taxes separately | Response, attestation or signature, with date and engagement |
| Spouse on a joint return | Supplies their own records and required identity/IP PIN information; reviews and signs their portion | Separate request and signature state, not "household signed" after one signature |
| Receptionist/admin | Invites users, confirms contact details, scans and labels paper, checks year/readability, routes requests, schedules and monitors outstanding items | "Received, awaiting technical review" rather than "tax treatment approved" |
| Preparer | Evaluates source information, enters/imports into tax software, builds workpapers, reconciles inconsistencies, asks substantive questions and clears diagnostics | Prepared version, unresolved issues, and traceable supporting records |
| Reviewer | Checks completeness, support, prior-year changes and technical treatment; sends review points back | Approved, or specific review points assigned to the preparer |
| Signing partner / responsible CPA or EA | Resolves significant issues and approves the firm's release under its policy; may also be preparer, reviewer or ERO | Final approval and identification of the person authorized to release/transmit |

Both-spouse electronic-signature identity requirements are distinct from merely giving a household access to one portal account. The IRS e-signature guidance addresses spouse/joint-return situations, and Liscio's documented delivery flow illustrates separate signer completion even where access arrangements differ.  [8]

### What "waiting on client" should mean

A waiting state should answer: **what is missing, who owes it, why it matters, when it is due, and whether it blocks preparation or filing**. Examples include "spouse's W-2 missing," "confirm whether this property was rented," "bookkeeper must reconcile the loan balance," or "second Form 8879 signature outstanding."

Do not put a return into client waiting when the next action belongs to staff. An uploaded response awaiting review is a staff obligation. A return awaiting partner approval is an internal queue. Waiting for an IRS acknowledgement is filing follow-up, not client delinquency.

**Case: the review queue that becomes preparation again.** Thomson Reuters describes reviewers hunting for numbers across PDFs, email and spreadsheets and sending questions back to preparers. Its identified failure is not simply slow reviewers; the handoff lacks traceable support. [10]

The portal should therefore preserve request-to-document links and let the preparer identify unresolved issues before review. Avoid forcing the reviewer to rediscover which upload answered which question.

**Build decision:** Show queue age, owner and next action. In a small shop, a clear "my next actions" list matters more than a complex organizational chart.

## 3. Make Requests The Unit Of Intake, Not Files

### Use organizers, checklists and PBC lists for different jobs

An **organizer** gathers structured facts and changes: household, dependents, income sources, deductions, business activity and life events. A **short checklist** tells this client which documents to provide. An **ad-hoc request** resolves a specific gap discovered later. A **PBC list**, meaning "prepared/provided by client," is the business or nonprofit version of a structured request list, often including schedules and reconciliations rather than tax forms alone.

Do not make every 1040 client complete a long generic questionnaire. Practitioner guidance supports requiring an intake questionnaire to be substantially complete before work begins; Thomson Reuters also identifies generic, incomplete and late organizers as a bottleneck. [2][10]

Keep the concepts linked but separate: one organizer answer can create a request; one request can accept several uploads; one uploaded PDF may contain multiple documents. A file name is not a workflow state.

| Situation | Client response to support | Staff disposition |
|---|---|---|
| Missing expected W-2 or 1099 | Upload it; give an expected date; explain why none exists | Accept, follow up, or remove the expectation with a recorded reason |
| Partial upload | Add remaining pages without restarting the request | Preserve earlier pages; identify exactly what remains missing |
| Wrong year or wrong taxpayer | Replace or reassign the file | Keep an audit history; do not count it toward current-year completion |
| Illegible photo | Retake or upload a clearer scan | Mark "replacement needed" with a readable explanation |
| "I don't have that" | Choose "not applicable," "not issued," "cannot obtain," or "will send later" | Decide the tax consequence; client response alone does not waive the requirement |
| Prior-year return | Supply the relevant prior federal/state return and schedules | Use for continuity and comparison; do not treat it as current-year evidence |
| Photo ID or IP PIN | Supply through a restricted secure task | Route to the identity/e-file workflow, not a general document bucket |
| Spouse's records | Assign to the appropriate spouse/contact | Keep permission and completion separate while assembling the joint file |
| Business bank/books records | Upload identified period, account or report | Confirm whether figures are reconciled and who is responsible for cleanup |

**Takeaway:** "Answered" belongs to the client; "accepted" belongs to the firm. That distinction prevents both endless reminders and premature readiness.

### Define a human-controlled "complete enough to start" gate

Recommended intake approval requires: confirmed engagement and period; required household/entity facts; an accountable source for business numbers; readable, correctly attributed core documents; and an explicit decision on each known missing item. The preparer can start with a nonblocking item outstanding, but the desk should show that exception.

For example, a late Schedule K-1 may block finalization while other preparation proceeds. An unreconciled business ledger may block the entire business portion. Let staff mark each request as **blocks start**, **blocks finalization**, or **informational**, rather than requiring a single brittle "100% complete" score.

**Case: TaxCaddy's requested-item model.** Its documented workflow places requested material under Document Requests and gives the client an item-oriented upload path. SmartVault likewise documents a request-driven collection workflow rather than relying solely on a shared folder. [9] [12]

The useful design pattern is not "copy either interface." It is to retain the relationship between the expectation and the submitted evidence. That relationship enables staff to answer "what are we still waiting for?" without reopening every PDF.

**Build decision:** Expand document metadata before adding more automation: tax year, taxpayer/entity, request, source, received date, page completeness, review state and reviewer. Keep W-2, 1099, prior-year return, photo ID and other, but add practical business/bookkeeping and correspondence categories.

## 4. Put Each Agreement And Signature At The Correct Gate

### The normal order is engagement, preparation, review, authorization, transmit

| Instrument or action | Purpose | Correct timing and product behavior |
|---|---|---|
| Engagement letter | Defines services, responsibilities, scope, fee approach, cutoffs and exclusions | Obtain acceptance before substantive work under the firm's policy. This is not IRS filing authorization. |
| Deposit, invoice or payment authorization | Establishes commercial terms | May occur at onboarding, during work or before release. Record the firm's policy explicitly. |
| Section 7216 disclosure consent | Authorizes a specified disclosure when no exception applies | Obtain valid advance consent **before the disclosure**, not merely before filing. [23] |
| Section 7216 use consent | Authorizes a specified use when required | Obtain before that use. Separate the purpose from preparation and from an invoice authorization. [23] |
| **Form 8879**, for the usual ERO-entered PIN 1040 workflow | Authorizes the electronic signature/e-file process | Prepare from the completed return, have the taxpayer review and sign, obtain both spouses' signatures for a joint return, and receive the authorization **before transmission**. [16]  |
| State e-file signature authorization | Meets the relevant state's signature rules | Track separately for each applicable state and return. Do not assume federal 8879 covers every state. |
| Form 2848, Power of Attorney and Declaration of Representative | Representation authority for specified matters and periods | Use when representation is needed; it is not routine permission to e-file a return. |
| Form 8821, Tax Information Authorization | Access to specified tax information, without the same representation authority as a POA | Use for the information-access engagement; do not substitute it for Form 8879. |

**Takeaway:** The current signature list is incomplete. Add an **e-file authorization** family, not just another generic "document signed" flag. Business and exempt-organization authorizations must match their actual return type and year rather than reusing the individual 8879 workflow.

### What must be signed before the firm e-files?

For the common small-firm 1040 process where the ERO enters or generates the taxpayer's signature PIN, the firm needs the properly completed **Form 8879 before it transmits**, including both taxpayers' signatures on a joint return. There are other IRS-permitted electronic signature methods; do not present 8879 as the only possible method for every electronic return. [16] 

The firm must also satisfy applicable state authorization requirements. Engagement acceptance, required consents and payment may independently block the firm's workflow, but none substitutes for the relevant filing authorization. A partner's approval does not replace a taxpayer's signature.

Bind the authorization to a particular final return version. If a draft changes, rerun the signature-required check rather than carrying a prior "signed" badge forward. Publication 1345 specifies circumstances and thresholds for obtaining a new authorization after return changes. [16]

### Section 7216 is not one universal consent checkbox

The verified IRS guidance distinguishes permitted disclosures without consent from disclosures requiring advance signed consent. Disclosure to another U.S.-based preparer assisting with preparation or auxiliary services generally does not require taxpayer consent; the guidance treats overseas preparer disclosure differently. [23]

A valid consent identifies the parties, information and particular disclosure or use, is knowing and voluntary, and is signed and dated with required language and warnings. An engagement letter, privacy notice and 7216 consent perform different jobs. [23]

For a portal vendor, this matters because the regulatory definition can reach auxiliary-service and software providers, not just the CPA who signs the return. Map storage, support access, subprocessors, overseas access, analytics and any AI processing to their actual purposes. Do not assume that all preparation-related processing needs consent, or that a vendor contract alone authorizes unrelated reuse. [24]

### Use an IRS-appropriate signature process

A typed name or ordinary "I agree" button is not, by itself, proof that the IRS electronic-signature requirements have been met. Remote signing needs the applicable identity-verification, electronic-record and evidence controls. Keep each signer's status and a manual-signing fallback. [5]

**Case: SafeSend separates failed authentication from failed tax preparation.** Its individual-return signing workflow documents KBA and directs a taxpayer who fails authentication to manual signing. The return does not become a new intake case simply because its signature route changes. [15]

**Build decision:** Buy or integrate the compliant signing capability. Store authorization kind, return version, signer identity, completion date, audit evidence and retention class. Do not build a generic signature canvas and label it "IRS compliant."

## 5. Keep Review, Payment, Filing And Delivery Distinct

### Let the client correct the return before authorizing it

Recommended client review should show a clearly labeled draft, filing instructions, balance due/refund information and a structured way to report corrections. Comments should become assigned staff tasks. A correction must return the engagement to the appropriate preparation/review step, not sit as an unread message beside a "ready to file" badge.

Once the client agrees and the firm clears review, issue the applicable signature package. Keep the final authorized version distinct from earlier drafts. Changed tax figures may require fresh authorization under the IRS rules. [16]

A payment-before-filing rule is a **firm commercial policy**, not the same as an IRS signature requirement. State it in the engagement and show it as a separate blocker, with an authorized override and an owner. Do not bury an unpaid invoice inside a vague "processing" status while a filing deadline passes.

### Separate the firm's bill from government payments

**Case: Liscio's delivery sequence.** Liscio documents client review of filing information, balances/refunds, returns and estimates; a signing step; and tax-payment voucher or online-payment options. It also documents automatic placement of the completed package and signed e-file pages into client Files after submission or firm completion. [8]

That is a useful delivery pattern, but completion of that portal sequence is not itself evidence of IRS acceptance. Design your portal's signing, fee-payment, tax-payment and acceptance records independently.

SafeSend similarly documents firm-payment behavior that depends on settings and available payment methods. Its taxpayer flow can include review, signatures, vouchers/invoices and document downloads. Do not infer that clicking an external payment link proves that a government payment settled. [15]

### Close only after filing follow-up

Keep a per-jurisdiction filing ledger: transmitted timestamp, acknowledgement status, rejection reason, correction owner and subsequent result. A federal acceptance and a state rejection should coexist without one overwriting the other. Follow the IRS's time-sensitive rejection procedures rather than treating rejection as a routine next-week task. [16] 

Deliver the final filed return, filing instructions, relevant signed authorizations, payment/estimate instructions and an understandable acceptance confirmation. Retain required signature records under the applicable IRS retention rules; do not equate a client download with firm retention. [16]

After closure, allow a secure **"Send us a notice"** action. Capture the agency, notice date, response deadline, affected year and full notice. Route it into a notice-response engagement, including a new scope/fee decision and Form 2848 or 8821 when appropriate, rather than reopening every prior tax-season task.

**Build decision:** "Closed" means the firm's agreed work and delivery are complete. It must not mean that no future agency correspondence can arrive.

## 6. Borrow Product Patterns Without Inventing Their Capabilities

The comparison below distinguishes documented client behavior from recommended boundaries. "Keep in tax software/workpapers" describes the boundary this portal should preserve, not a claim about every vendor's entire product suite. Product capabilities, subscriptions and integrations should be confirmed for the exact edition being purchased.

| Product | What the client is asked to do | Keep in tax software/workpapers | Pattern that can reduce chasing; evidence limits |
|---|---|---|---|
| **TaxDome** | Review/e-sign proposals; authorize payment where configured. Its U.S. tax-return delivery package guides review, signing and invoice payment. [11][14] | Return calculation, diagnostics and actual filing; do not infer them from a delivery package | Combine engagement, signatures and payment into an explicit sequence. Proposal signing rules are not automatically the rules for joint-return authorization. [14] |
| **Canopy** | Current detailed client workflow is not established by the evidence available for this report | Preserve calculation and technical work outside this portal | Evidence is missing for a sufficiently specific comparison of current organizer routing, reminders, signature verification and return import. Do not assume parity with TaxDome. |
| **Liscio** | Complete a shared organizer when both spouses are assigned; review the return, sign and handle vouchers/payment options in Smart Tax Delivery. [13][8] | The firm imports tax-software-generated return PDFs into the organizer process; calculations remain outside this recommended portal boundary. [13] | Organizer submission notifies its owner and progress is visible. Separate spouse completion is supported in the documented delivery paths. [13][8] |
| **SafeSend Returns** | Access the return, review, sign, download, and address payment vouchers/invoices; personal-return KBA can route failures to manual signing. [15] | Preparation, tax positions and transmission must not be inferred from document-delivery completion | A guided post-preparation path reduces scattered signature/delivery steps. SafeSend also documents a Client Portal; do not describe the product as only email-link delivery. [6] |
| **SmartVault** | Respond to document requests through its client collection workflow; portal materials also identify e-signature-related capability. [12] [7] | Technical preparation and tax judgments | Request-centric collection is the useful pattern. The available evidence does not establish every desired accepted/rejected-item transition, reminder rule or integration behavior. |
| **Drake Portals** | Detailed current client steps are not established by the evidence available here | Drake remains the tax-preparation system; the proposed portal must not replace it | Evidence is missing for a reliable claim about the exact current 8879, identity, payment and reminder sequence. Validate those before committing to an integration. |
| **GruntWorx** | A standalone client portal workflow is not established here | Treat document organization/data-population automation as firm-side work for this design | Do not count a firm-side automation product as your client portal without evidence of a client-facing workflow. Specific current feature evidence is incomplete. |
| **Thomson Reuters Onvio Client Center** | Registered clients/contacts receive access and respond to document/file requests. [4] | Technical preparation and supporting workpapers remain a separate responsibility | Requests can be structured with due-date/reminder controls. Keep the client-access layer distinct from the staff application. [17] |
| **Practice CS / NetClient CS** | The exact current portal connection and client path are not established here | Do not equate the Practice CS practice-management product with Onvio Client Center | Evidence is missing for a detailed current comparison. Do not relabel Onvio behavior as a Practice CS feature. |
| **Intuit Link with ProConnect** | Answer a questionnaire and supply requested documents through Link. [1] | Tax calculation, diagnostics and filing stay in ProConnect | Guided information collection is the supported pattern. Do not infer that every uploaded document becomes verified, imported tax data. |
| **Intuit Link / Lacerte** | Detailed current Lacerte-specific behavior is not established here | Lacerte remains the preparation system | Evidence is missing for current Lacerte-specific transfer, organizer and status behavior; do not copy ProConnect's exact path by assumption. |
| **Intuit Tax Advisor** | Receives the output of a tax-planning service rather than a verified annual document-collection path in this evidence | The documented firm work is custom tax planning. [3] | Do not treat Tax Advisor as interchangeable with Intuit Link. A client-facing planning report does not establish a collection portal. |
| **TaxCaddy** | Respond to requested-document items and upload the requested material. [9] | Preparation and technical verification remain firm work | Item-oriented collection is established. The questionnaire page available here does not establish sufficiently detailed current completion or reminder behavior to specify it. |
| **Soraban** | Collect offers questionnaire/portal access through a link; its documented broader workflow connects collection with later firm processing. [19] [18] | Preserve an explicit boundary with tax software rather than treating collection as finished tax preparation | Borrow the focused collection pattern. Do not assume every Collect subscription includes every downstream delivery, processing or signing feature. |

**Takeaway:** These are not interchangeable portals. Evaluate collection, firm workflow, document storage, delivery, signing and tax preparation as separate capabilities. Missing evidence is not proof that a feature does not exist.

### Three documented patterns worth copying

**TaxDome makes commercial onboarding actionable.** Its proposal can request a deposit or recurring-payment authorization, while a separate delivery flow handles review, signatures and invoices. That separation shows why "agreement signed" and "return authorized" deserve different records. [11][14]

**Liscio makes the household explicit.** Both spouses can share one organizer, but delivery still identifies separate signer actions. Shared preparation facts and separate legal signatures can coexist; they should not be collapsed into one "client completed" boolean. [13][8]

**SafeSend makes a failed signing route recoverable.** Its KBA failure leads to manual signing rather than an unexplained dead end. A small firm's portal needs the same recoverability: staff-assisted upload, paper signature and corrected delivery paths should all preserve engagement context. [15]

**Build decision:** For this project, imitate the request model and clear handoffs, not the breadth of an all-in-one suite.

## 7. Use Two Status Layers And A Separate Filing Ledger

### Keep the client calm without hiding the next action

Use a small number of client-facing phases with specific action cards. Keep detailed staff states underneath. In particular, do not show the client an internal preparer/reviewer ping-pong sequence unless it changes what they must do.

| Client-facing phase | Staff state mapped to it | Transition rule |
|---|---|---|
| **Getting started** | Profile / engagement pending | Required profile and engagement actions remain |
| **Documents and questions** | Intake review; waiting on client; needs staff review of upload | Show whether the next action belongs to client or firm |
| **In preparation** | In preparation; preparer review; reviewer/partner approval | Staff owns the work; a new blocking request can return to client action |
| **Draft ready for client** | Awaiting client draft review | Client approves or requests changes |
| **Signature needed before e-file** | Awaiting federal/state authorization; second signer pending | All applicable signers and document versions must clear |
| **Filing in progress** | Ready to transmit; transmitted; acknowledgement pending; rejected under correction | Use a precise filing substatus rather than "done" |
| **Accepted / complete** | Accepted; delivery pending; closed | Distinguish acceptance from the firm's final closure |

**Takeaway:** Client simplicity comes from grouping states, not erasing differences. A card saying "We received your upload and are reviewing it" is more useful than continuing to demand a document already sent.

### Model rejected and extended as facts, not dead ends

Keep the internal production spine close to the stages already sketched:

**Intake review -> in preparation -> preparer review -> filing follow-up -> closed.**

Make **waiting on client** an interruption with a recorded resume stage. Add **needs staff review** as a queue for new responses. Within filing follow-up, maintain explicit substatuses: draft ready, signature needed, ready to transmit, e-filed/acknowledgement pending, accepted and rejected.

Separately store **extended** with form, submission/result evidence, new filing date and outstanding payment/document actions. An extended return can simultaneously be waiting on a K-1, in preparation, or awaiting review. Likewise, retain an acceptance event after the engagement becomes closed.

**Case: the signed package that is not filed.** Liscio can place return documents and signed e-file pages into Files after client submission or firm completion. The IRS separately acknowledges electronic filings. Those are different systems reporting different events. [8] [16]

**Build decision:** Let staff record external tax-software events manually in the first release. Show their source and timestamp; never manufacture "accepted" from an upload, payment, signature or delivery event.

## 8. Build The Small-Firm Control Surface First

### First release: evidence, ownership and safe release

| Priority | Build | Why it belongs early |
|---|---|---|
| **First** | Secure invitation/login, individual contacts, spouse/entity access and annual engagements | Establishes who can see and act on whose information |
| **First** | Engagement acceptance and clear fee/payment terms | Prevents work starting under ambiguous scope |
| **First** | Reusable request templates, uploads, messages and staff acceptance/replacement states | Removes the repeated "what is missing?" inspection |
| **First** | Staff queue with owner, next action, deadline and blocking reason | Keeps a small team from losing work between stages |
| **First** | Final-version delivery and integrated signature tracking | Protects the pre-transmission gate |
| **First** | Manual transmission/acceptance/rejection ledger and secure final delivery | Prevents "signed means filed" mistakes |
| **Next** | Reminder rules, request carry-forward, invoice integrations and tax-software connectors | Automates a process that already has trustworthy states |
| **Do not build** | Tax calculation, general ledger, payroll, or replacements for Drake, Lacerte, ProSeries or UltraTax | These change the product from workflow support into a different, much larger system |

**Takeaway:** A trustworthy manual acknowledgement entry is better than an impressive-looking but unsupported synchronization. Make integrations earn their complexity by eliminating a specific duplicate step.

### Compliance changes the architecture

**Section 7216:** Treat return information as broader than uploaded tax forms. Store consent purpose, recipient/use, data scope, signed version and timing when consent is required. Restrict optional analytics or other reuse until the applicable exception or consent path is settled. [23]

**Form 8879 before transmission:** Create a visible release checklist. The portal can show eligibility to file; the authorized staff member still confirms the actual filing in tax software. Link the authorization to the approved version and retain evidence under the applicable rules. [16] [16]

**Identity:** A photo-ID upload, IP PIN and remote-signing identity check are different controls. Ask for the current applicable IP PIN through a secure task, including for a spouse when required; do not treat it as a reusable portal password. Apply the IRS e-signature identity requirements to the signing process.  [5]

**Secure exchange:** The firm's security obligations should drive authentication, least-privilege access, encryption, logging, secure backups, access removal and incident handling. Align the implementation with the firm's written information security plan and vendor responsibilities; do not advertise that using a portal alone makes a firm compliant. [16]

Recommended safeguards include notifications that link to the portal instead of exposing sensitive attachments, staff-only workpaper areas, protected identity records, and controlled support access. These are architecture recommendations, not assertions that every product in the comparison implements them.

**Build decision:** Purchase security-sensitive infrastructure and signing where appropriate, but keep responsibility and evidence visible in the staff desk.

## 9. Map The Minimum Journeys Onto Your Existing Stages

### Client journey: four intake stages, then one season home

| Existing client stage | Minimum screen | Completion or next action |
|---|---|---|
| **Profile** | Household/entity and authorized contacts | Confirm taxpayer, spouse, year, contact details and material changes; collect sensitive identity items through protected tasks |
| **Engagement letter** | Scope, fee/payment terms and acceptance | Complete required signers; present any distinct consent in its own appropriate flow |
| **Documents** | One list combining checklist, questionnaire and ad-hoc requests | Upload, answer, explain unavailability, save progress; see what staff accepted or returned |
| **Ready for intake** | Submission/review screen | Client says the package is ready for firm review; this does not promise it is complete |
| **After intake** | Season home, with action cards and a Files area | Review draft, request changes, sign, handle fee/tax-payment instructions, see filing outcomes and retrieve final documents |

**Takeaway:** Preserve the user's four intake stages. Do not keep sending clients back through onboarding for every later tax question or signature.

### Staff journey: one queue, one engagement workspace

| Existing staff stage | Minimum desk behavior | Exit condition |
|---|---|---|
| **Intake review** | Check uploads, year, taxpayer, readability and core facts; accept or return responses | Preparer approves readiness or identifies blocking requests |
| **Waiting on client** | Show specific requests, responsible contact, reminder and resume stage | Response arrives; it moves to staff review, not automatically to complete |
| **In preparation** | Open/download approved sources; record software/workpaper references and questions | Prepared version and issue list are ready |
| **Preparer review** | Support self-check, reviewer points and partner approval without inventing a second reviewer | Approved draft/release decision |
| **Filing follow-up** | Draft review, changes, fee blocker, federal/state signatures, transmission and acknowledgements | All required filings accepted or another explicitly resolved outcome; final delivery complete |
| **Closed** | Read-only history, final files and estimates; action to start a notice or new engagement | Reopening requires a reason or a new scoped service |

**Takeaway:** The staff workspace needs requests, files, activity, approvals/signatures, billing references and filing outcomes in context. It does not need a miniature tax return editor.

Use these minimum **request** states: **draft -> sent/open -> client responded -> staff review -> accepted**, with **replacement needed**, **unavailable/not applicable pending staff disposition**, and **cancelled/waived with reason** branches. A response may be text, files, a signature or an explicit inability to supply the item.

**Case: one unreadable spouse W-2.** In the recommended design, the client uploads it under Documents, admin marks it received but unreadable, and a replacement request remains assigned to the spouse. The firm can start unrelated work if the preparer allows it; the tax return does not acquire a false "complete" state.

The same engagement later presents a draft and separate filing authorizations. Receipt of both signatures clears one gate, but only an actual acknowledgement changes the filing outcome to accepted. This is an illustrative design walkthrough, not a claimed outcome at a named firm. [16] [16]

## Synthesis: Optimize The Handoffs, Not The Number Of Features

| Design strategy | Mechanism | Scope and timing | Trade-off |
|---|---|---|---|
| **Request-centered collection**, illustrated by TaxCaddy, SmartVault and Soraban | Ties expected material to a client response | Before and during preparation | Needs staff disposition; uploads alone cannot establish tax sufficiency. [9] [12] [19] |
| **Commercial/workflow sequencing**, illustrated by TaxDome | Connects proposals, signatures and invoices | Onboarding and release | Convenient sequencing must not blur engagement acceptance and IRS filing authorization. [11][14] |
| **Guided return delivery**, illustrated by Liscio and SafeSend Returns | Brings review, signing and document retrieval into a guided path | After preparation | Delivery completion is not an IRS acceptance event. [8][15] [16] |
| **Tax preparation and planning systems**, illustrated by ProConnect's Link boundary and Intuit Tax Advisor | Uses collected facts for technical preparation or planning | Firm work and advice | A report or data-collection connection is not proof of a complete annual portal. [1] [3] |

The central tension is that firms need fewer client decisions but more precise internal evidence. Solve it with a simple client home and an explicit staff record, not by exposing every internal status or hiding all complexity behind "processing."

A second tension is automation versus responsibility. Automate reminders only while a client actually owes an action; automate downstream movement only after the relevant acceptance, approval or acknowledgement exists. Otherwise the portal accelerates incorrect handoffs.

**Final recommendation:** Launch an engagement workspace built around requests, reviewed evidence and release gates. Keep the tax software authoritative for the return and filing events, and make the portal authoritative for who owes the next action.

## References

- IRS, *Publication 1345*, revision October 2026: ERO responsibilities, signatures, changes, retention and acknowledgements. [16] [16]
- IRS, *Frequently Asked Questions for IRS e-file Signature Authorization*. [5]
- IRS, *When to File*; *IRS Opens 2026 Filing Season*; *Instructions for Form 7004*. [21] [22] [20]
- IRS, *Section 7216 Frequently Asked Questions*; 26 CFR 301.7216-1. The FAQ is designated historical; the cited prior research also includes the regulation. [23][24]
- Thomson Reuters, *Six Failures That Might Be Hidden in Your Tax Prep Workflow*. [10]
- Journal of Accountancy, *Onslaught of the Tax Procrastinators*, March 2020; used for practice workflow, not current filing dates. [2]
- TaxDome Help Center, *Request E-signatures from Clients* and *Proposals Explained*. [14][11]
- Liscio Help Center, *Smart Tax Organizers: Importing & Sending* and *Smart Tax Delivery: Client Experience*. [13][8]
- SafeSend Returns Help Center, *Returns Client Experience* and *Client Portal Overview*. [15] [6]
- SmartVault, *Getting Started with Request Docs* and client portal product documentation. [12] [7]
- Thomson Reuters Onvio help, *Give Clients and Contacts Access to Client Center* and *Request Documents or Files from a Client*. [4] [17]
- Intuit help, *Getting Started with Intuit Link in ProConnect Tax* and *Getting Started with Intuit Tax Advisor*. [1] [3]
- TaxCaddy, *Uploading Requested Items*. [9]
- Soraban, *Collect* and *How Tax Returns Move from Client Upload to Signed Return*. [19] [18]

## The Five Workflow Mistakes That Add Work

1. **Treating an upload as an answered and accepted request.** Staff must reopen files to find out what is actually missing, while clients receive inappropriate reminders.
2. **Using one household-wide completion or signature flag.** It conceals missing spouse records, outstanding signers and return-version changes.
3. **Equating engagement acceptance, payment or a signed package with permission to transmit - or with acceptance.** These are separate commercial, authorization and filing events. [16] [16]
4. **Letting "waiting on client" become an ownerless parking lot.** Every blocked engagement needs a specific request, responsible person, deadline and next action.
5. **Building another tax system instead of removing duplicate coordination.** If staff still reconcile email, portal files, spreadsheets and software statuses by memory, the portal has added a queue rather than removed work.

## References

1. *Getting started with Intuit Link in ProConnect Tax*. https://accountants.intuit.com/support/en-us/help-article/small-business-processes/getting-started-intuit-link-proconnect-tax/L2ceCp8lH_US_en_US?srsltid=AfmBOoouCQChAFFowh_PQ_WBhrezuOC94Cpu1-WvEqcIQqiM5zNLNE9_
2. *Onslaught of the tax procrastinators - Journal of Accountancy*. https://www.journalofaccountancy.com/issues/2020/mar/tax-busy-season-new-client-strategies/
3. *Getting started with Intuit Tax Advisor*. https://accountants.intuit.com/support/en-us/help-article/bookkeeping-processes/getting-started-intuit-tax-advisor/L4usXAYSJ_US_en_US
4. *Give clients and contacts access to Client Center*. https://www.thomsonreuters.com/en-us/help/onvio/setup/enabling-client-center.html
5. *Frequently Asked Questions for IRS efile Signature Authorization | Internal Revenue Service*. https://www.irs.gov/e-file-providers/frequently-asked-questions-for-irs-efile-signature-authorization
6. *Client Portal Overview – SafeSend Returns*. https://safesendreturns.zendesk.com/hc/en-us/articles/34542030916371-Client-Portal-Overview
7. *Client Portal for Accountants & CPA Firms - Secure & Customizable*. https://www.smartvault.com/product/client-portal
8. *Smart Tax Delivery: Client Experience | Liscio Help Center*. https://support.liscio.me/en/articles/10574265-smart-tax-delivery-client-experience
9. *Uploading requested items – TaxCaddy*. https://helpcenter.taxcaddy.com/hc/en-us/articles/226804147-Uploading-requested-items
10. *6 failures that might be hidden in your tax prep workflow*. https://tax.thomsonreuters.com/blog/how-to-fix-tax-prep-bottlenecks-6-failures-that-might-be-hidden-in-your-workflow/
11. *Proposals explained - TaxDome Help Center*. https://help.taxdome.com/article/1229-proposals-overview
12. *Getting Started with SmartVault Request Docs – SmartVault*. https://help.smartvault.com/hc/en-us/articles/1500010685441-Getting-Started-with-SmartVault-Request-Docs
13. *Smart Tax Organizers: Importing & Sending | Liscio Help Center*. https://support.liscio.me/en/articles/10658906-smart-tax-organizers-importing-sending
14. *Request e-signatures from clients - TaxDome Help Center*. https://help.taxdome.com/article/use-e-signatures
15. *Returns Client Experience – SafeSend Returns*. https://safesendreturns.zendesk.com/hc/en-us/articles/360050321654-Returns-Client-Experience
16. *Publication 1345 (Rev. 10-2026)*. https://www.irs.gov/pub/irs-pdf/p1345.pdf
17. *Request documents or files from a client*. https://www.thomsonreuters.com/en-us/help/onvio/documents/requesting-information-in-onvio
18. *Inside Soraban: How Tax Returns Move from Client Upload to Signed Return*. https://www.soraban.com/how-tax-returns-move-from-client-upload-to-signed-return
19. *Collect: Automated Client Document Intake | Soraban*. https://web.soraban.com/products/collect
20. *Instructions for Form 7004 (12/2025) | Internal Revenue Service*. https://www.irs.gov/instructions/i7004
21. *When to file | Internal Revenue Service*. https://www.irs.gov/filing/individuals/when-to-file
22. *IRS opens 2026 filing season | Internal Revenue Service*. https://www.irs.gov/newsroom/irs-opens-2026-filing-season
23. *Section 7216 Frequently Asked Questions | Internal Revenue Service*. https://www.irs.gov/tax-professionals/section-7216-frequently-asked-questions
24. *26 CFR § 301.7216-1 Penalty for disclosure or use of tax return information.*. https://www.ecfr.gov/current/title-26/section-301.7216-1
