---
name: press-release
description: Create company-agnostic press releases for product launches, partnerships, corporate announcements, events, awards, and executive appointments. Use when drafting or revising a media release; do not publish, distribute, fabricate quotes or facts, or imply legal approval.
metadata:
  version: "1.1.0"
  library: "DSFB Professional Services"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Press Release

Create a factual, newsworthy release tailored to the announcing organization, audience, industry, and distribution context. The examples establish tone and structure; their company, claims, boilerplate, executives, metrics, and contact details are never defaults.

## Inputs

Establish:

- announcement type, organization, news, timing, dateline, audience, and intended outcome;
- approved facts, evidence, links, names, titles, quotations, boilerplate, media contact, and embargo/distribution status;
- required partners, trademarks, ticker symbols, regulatory language, style guide, and approval owners.

Ask only for missing details that materially affect accuracy. Use clearly marked placeholders for unresolved facts. Never invent or paraphrase a quotation as if a person approved it.

## Announcement modes

- **Product launch:** problem, product or service, differentiated capability, availability, proof, spokesperson quote, and next step.
- **Partnership:** each party's role, joint customer value, relationship scope, commitments, proof, quotes from both parties, and next step.
- **Corporate announcement:** material change, rationale, stakeholder impact, timing, continuity, and approved leadership context.
- **Event:** purpose, organizer, audience, location/date, program highlights, participation details, and registration.
- **Award or recognition:** awarding body, exact category, selection context, date, significance, and verifiable source.
- **Executive appointment:** role, effective date, mandate, reporting line, relevant experience, approved quotes, and governance context.

## Workflow

1. Create a fact ledger separating `VERIFIED`, `PROVIDED—UNVERIFIED`, `APPROVAL-PENDING`, and `UNKNOWN`. Identify claims requiring legal, finance, investor-relations, partner, trademark, or subject approval.
2. Choose the news angle based on why the announcement matters now. Do not force promotional language where the evidence supports only a factual update.
3. Draft using `assets/press-release-template.md`. Use a clear headline, optional evidence-bearing subheadline, dateline, concise lead, supporting context, approved quotations, call to action, organization-specific boilerplate, and media contact.
4. Match the tone guide in `references/style-guide.md`. Read only the example matching the announcement type; examples are evidence of style, not reusable facts.
5. Verify every name, title, date, location, number, attribution, link, partner description, trademark, and forward-looking statement. Preserve uncertainty with placeholders rather than plausible invention.
6. Return the release plus an approval checklist listing every unresolved or externally reviewable item.

## Output rules

- Lead with the news and concrete relevance; keep paragraphs short and journalistic.
- Prefer precise outcomes and capabilities to superlatives. Attribute market figures and externally sourced claims.
- Quotes add perspective or consequence rather than repeating the lead. Draft quotes must be labelled `DRAFT—SUBJECT APPROVAL`.
- Generate the boilerplate from supplied organization facts. Never default to Globant or any example company.
- Use AP-style dates and location conventions when appropriate unless the requested wire, country, or house style differs.
- Do not add `/PRNewswire/`, `SOURCE`, a ticker, awards, customer logos, contact information, or distribution language unless supplied and approved for this release.

## Boundaries

Drafting does not authorize publication, wire submission, emailing journalists, social posting, or website changes. Material corporate, securities, financial, employment, regulatory, partner, privacy, and legal claims require the organization's applicable reviewers. Protect embargoed, confidential, personal, and market-sensitive information.

## Resources

- `assets/press-release-template.md` — company-agnostic release structure.
- `references/style-guide.md` — tone distilled from the supplied examples.
- `references/product-launch-example.md` — supplied launch example; facts preserved for reference only.
- `references/partnership-example.md` — supplied partnership example; facts preserved for reference only.
- `references/executive-appointment-example.md` — supplied appointment example; facts preserved for reference only.

## Handoff

`marketing-manager` uses this skill for press-release creation and coordinates the requested draft and approval checklist. Use the skill directly with `$press-release` when no broader marketing consultation is needed.
