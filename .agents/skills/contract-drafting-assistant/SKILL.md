---
name: contract-drafting-assistant
description: Draft or structurally compare review-required business contract language, including NDAs, MSAs, service agreements, and DPAs. Use only when explicitly requested; never represent output as legal advice, compliant, enforceable, production-ready, or ready for signature.
license: MIT + Commons Clause
metadata:
  version: "1.0.0"
  author: borghei; adapted by DSFB
  category: business-growth
  domain: legal-document-drafting
  pack: Consulting & Professional Services
---

# Contract Drafting Assistant

Produce a clearly labelled draft or issue checklist for review by qualified counsel. This skill assists with document structure and question discovery; it does not determine legal compliance or replace jurisdiction-specific legal advice.

## Non-negotiable safeguards

- Start every generated document with `DRAFT — REQUIRES REVIEW BY QUALIFIED COUNSEL — NOT READY FOR SIGNATURE`.
- Never call a document or clause compliant, enforceable, valid, standard, safe, production-ready, or approved.
- Never use contract value as a threshold for legal review. All signature-ready contract language requires appropriate legal review.
- Identify the exact governing jurisdiction; never treat the EU or DACH as a single contract-law jurisdiction.
- Verify current law using authoritative sources when discussing legal requirements. Separate sourced requirements from negotiable commercial preferences.
- Do not invent parties, authority, addresses, dates, commercial terms, remedies, regulatory status, data flows, or transfer mechanisms.
- Treat liability, indemnity, IP ownership, privacy, employment restrictions, tax, sanctions, regulatory obligations, and dispute resolution as counsel-review items.
- Do not send, sign, accept, file, or otherwise bind a party without explicit authorization and the appropriate human approval.

## Workflow

1. Determine whether the request is drafting, issue spotting, completeness checking, or structural comparison.
2. Gather the document type, parties, governing jurisdiction, relationship, approved commercial terms, scope/SOW relationship, data processing, IP inputs, and known negotiation positions.
3. List missing facts and material legal-review questions before drafting. Use `[REQUIRED: ...]` for unresolved fields.
4. Draft neutral, internally consistent language that reflects only approved positions. Present material alternatives when the correct choice depends on legal or commercial judgment.
5. Add a review schedule identifying each assumption, unresolved field, sourced legal requirement, negotiable position, and counsel-review item.
6. Run the relevant structural helper if useful, then manually review its findings. A helper result is not a legal conclusion.

## Privacy drafting

For a DPA, map controller/processor roles, processing details, security measures, assistance duties, deletion/return, audits, subprocessor authorization, and international transfers from actual facts. Do not hard-code a processor's breach notice as a universal 72-hour GDPR rule: processors generally notify controllers without undue delay, while controller notification obligations depend on applicable law and circumstances.

## IP drafting

Do not assume commissioned US software qualifies as work made for hire. Capture the parties' intended ownership, distinguish pre-existing materials and third-party/open-source components, and flag assignment, license, moral-rights, and further-assurances language for jurisdiction-specific review.

## Helpers

- `scripts/contract_completeness_checker.py` checks whether expected sections are populated in structured JSON. Its `COMPLETE` result means structurally complete only.
- `scripts/contract_comparison_analyzer.py` compares structured JSON fields and flags changed high-risk headings. It is not a semantic legal redline and cannot determine whether wording changes increase or reduce legal exposure.

## Handoff

Return the draft, assumptions, unresolved questions, and counsel-review schedule. If the user needs a commercial proposal or SOW without master legal terms, use `proposal-and-sow-writer` instead.

## Origin

Adapted from Borghei's `contract-and-proposal-writer` skill, with compliance claims and universalized jurisdiction rules removed.
