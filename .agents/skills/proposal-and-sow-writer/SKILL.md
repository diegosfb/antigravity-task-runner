---
name: proposal-and-sow-writer
description: Create client proposals and statements of work from an approved scope, including outcomes, deliverables, assumptions, exclusions, milestones, acceptance criteria, pricing presentation, and change control. Use for commercial delivery artifacts; do not use for contracts, NDAs, MSAs, DPAs, or legal advice.
license: MIT + Commons Clause
metadata:
  version: "1.0.0"
  author: borghei; adapted by DSFB
  category: business-growth
  domain: proposals-and-sows
  pack: Consulting & Professional Services
---

# Proposal and SOW Writer

Turn an approved project definition, PRD, specification, backlog, estimate, or discovery summary into a client-facing proposal or statement of work. Preserve the source artifact's terminology and distinguish facts from assumptions.

## Boundary

- A **proposal** explains the problem, outcomes, approach, investment, and next step.
- A **SOW** defines services, deliverables, responsibilities, milestones, acceptance, assumptions, exclusions, dependencies, and change control.
- Neither artifact supplies master legal terms. If the user requests an NDA, MSA, DPA, governing-law clause, indemnity, liability language, or other contract terms, invoke `contract-drafting-assistant` explicitly.
- Use `vtu-estimator` first when pricing an AI Pod engagement. Use `enterprise-value-engineer` when the proposal needs an ROI case. Do not recompute their outputs here.

## Required inputs

Use available context first. Ask only for information that materially changes the artifact: client and provider identities; desired outcomes and scope source; deliverables and acceptance evidence; timeline, milestones, dependencies, and client responsibilities; pricing basis, approved estimate, currency, taxes, and payment milestones; assumptions, exclusions, validity period, and requested output format.

Mark unresolved commercial inputs as `[REQUIRED: ...]`; never invent commitments, dates, rates, credentials, or client approvals.

## Workflow

1. Extract the approved scope and build a traceability map from requested outcomes to deliverables and acceptance evidence.
2. Surface conflicts, omissions, and dependencies before drafting. Keep optional work visibly optional.
3. For a proposal, lead with the client's problem and expected outcomes, then present the approach, scope, roadmap, investment, assumptions, exclusions, and next step.
4. For a SOW, define each deliverable, owner, due milestone, objective acceptance evidence, review window, dependencies, and exclusions. Include a change-request process without inventing legal remedies.
5. Reconcile totals, dates, milestones, and terminology against the source. Ensure every promised outcome maps to a deliverable and every deliverable has acceptance evidence.
6. Save or convert the artifact only when the user requests a file. Use the environment's document skill for a professionally formatted DOCX rather than relying on an assumed local `pandoc` installation.

## Pricing helper

Use `scripts/proposal_cost_estimator.py` only when the user supplies an internal cost/rate, expected hours, and target gross margin. Its result is a commercial planning aid, not an effort estimate or approval to quote. Label assumptions and obtain confirmation before inserting calculated pricing into a client-facing artifact.

## Output quality

- Client language, not internal implementation shorthand.
- Measurable deliverables and acceptance evidence.
- Explicit assumptions, exclusions, client responsibilities, and dependencies.
- No unapproved guarantees, legal conclusions, hidden contingency, or unsupported ROI claims.
- A proposal must remain distinguishable from a binding contract unless counsel-approved terms explicitly make it one.

## Origin

Adapted from Borghei's `contract-and-proposal-writer` skill. The legal drafting capability was separated into `contract-drafting-assistant` so ordinary proposal work does not implicitly activate legal guidance.
