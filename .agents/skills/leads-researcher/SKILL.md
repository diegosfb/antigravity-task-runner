---
name: leads-researcher
description: Research target companies or accounts from authorized public sources and produce evidence-backed account briefs with citations, retrieval dates, confidence, and unresolved questions. Use for pre-outreach account research; do not score ICP fit, discover private personal data, or contact prospects.
license: MIT + Commons Clause
metadata:
  version: "1.0.0"
  author: borghei; adapted by DSFB
  category: business-growth
  domain: sales-research
  pack: Consulting & Professional Services
---

# Lead Researcher

Build a decision-ready account brief from public, authorized evidence. Research the company and buying context, not an individual's private life. This skill stops at a sourced handoff; it does not qualify, enrich a CRM, or send outreach.

## Inputs

Resolve the target account, product/offering context, research question, geography, freshness window, intended use, and permitted sources. If a list is provided, confirm the maximum number of accounts and depth before conducting substantial research.

## Source standard

1. Start with primary sources: company website, product/docs, filings, official registries, job pages, press releases, and verified executive statements.
2. Use reputable secondary sources to corroborate or add context. Treat aggregators, scraped profiles, generated databases, and social posts as leads—not established facts.
3. Cite the direct URL beside every material factual claim and record publication/event date plus retrieval date.
4. Distinguish `VERIFIED`, `CORROBORATED`, `SINGLE-SOURCE`, `INFERRED`, `CONFLICTING`, and `UNKNOWN`.
5. Never turn absence of evidence into a negative claim. Report conflicting figures and explain which source is more authoritative.
6. Do not bypass authentication, robots controls, paywalls, access restrictions, or source terms.

## Privacy and action boundaries

- Collect only business-relevant public information necessary for the stated purpose.
- Do not seek or include personal email addresses, personal phone numbers, home addresses, family details, sensitive traits, credentials, or non-public identifiers.
- Do not infer protected or sensitive characteristics.
- Do not add findings to a CRM, purchase enrichment data, contact anyone, or launch outreach without separate explicit authorization.
- Research output is not permission to market to a person; applicable privacy and communications rules still require review.

## Workflow

1. Define the evidence questions from the offering context: firmographics, products, customers, technology, strategic initiatives, operating changes, likely pains, and relevant timing signals.
2. Search broadly enough to find primary evidence, then narrow to the strongest sources. Avoid filling the brief with repeated articles about the same announcement.
3. Capture each finding in an evidence ledger: claim, source, source type, dates, confidence, and relevance.
4. Separate observed signals from hypotheses about need. A hiring post or technology mention may support a hypothesis; it does not prove budget, pain, authority, or purchase intent.
5. Produce the brief using [the account brief template](assets/account-brief-template.md).
6. Recheck URLs, names, dates, numeric claims, contradictions, and freshness before delivery.
7. If qualification is requested, hand the structured account facts—not research conclusions—to `leads-qualification`.

## Output requirements

- Research scope and as-of date.
- Concise account overview using sourced facts.
- Evidence ledger with direct citations and confidence.
- Relevant verified signals and why they may matter.
- Clearly labelled hypotheses and questions to validate.
- Missing/conflicting information and stale-source warnings.
- A minimal structured field set suitable for `leads-qualification`, with unknowns preserved as unknown.

## Boundary

Use `leads-qualification` to compare known account facts with an ICP. Use `account-executive` only after a lead becomes an active sales opportunity. Outreach copy and sending belong to a separately authorized communications workflow.

## Origin

Derived from Borghei's upstream lead research skill; the original qualification engine was separated into `leads-qualification` so research claims require sources rather than inferred score matches.
