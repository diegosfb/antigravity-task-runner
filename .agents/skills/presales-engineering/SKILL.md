---
name: presales-engineering
description: Analyze RFP/RFI coverage, build evidence-backed competitive matrices, prepare technical demonstrations, and design bounded proof-of-concept evaluations. Use for reusable technical pre-sales artifacts; not for commercial pricing, contract approval, roadmap commitments, or post-sale delivery.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: "borghei; adapted by DSFB"
  library: "Borghei Claude Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
  category: "business-growth"
  domain: "presales-engineering"
  updated: "2026-08-28"
---

# Presales Engineering

Create auditable technical pre-sales artifacts from verified opportunity evidence. Treat scripts as calculation and formatting helpers, never as authority to bid, promise functionality, commit roadmap dates, allocate resources, or accept commercial or legal risk.

## Select a mode

- RFP/RFI analysis: read [RFP response guide](references/rfp-response-guide.md), build a traceable compliance matrix, and optionally run `scripts/rfp_response_analyzer.py`.
- Competitive technical analysis: read [competitive positioning framework](references/competitive-positioning-framework.md), distinguish verified facts from claims and unknowns, and optionally run `scripts/competitive_matrix_builder.py`.
- Demo preparation: adapt [demo script template](assets/demo_script_template.md) to the buyer's use cases, stakeholders, and verified product behavior.
- POC design: read [POC best practices](references/poc-best-practices.md), define a bounded evaluation, and optionally run `scripts/poc_planner.py`.
- Technical proposal input: use [technical proposal template](assets/technical_proposal_template.md) for technical content only; use `proposal-and-sow-writer` for the client-facing commercial artifact.

Load only the references and assets needed for the selected mode.

## Evidence rules

- Build requirement-to-evidence traceability. Record the source, owner, verification date, and confidence for material capability claims.
- Classify present capabilities separately from configuration, integration, customization, partner dependency, planned work, and unsupported requirements.
- A roadmap item is not a current capability. Include it only with authorized product-owner confirmation, an approval status, and language that does not create a commitment.
- Validate competitor claims against current authoritative or observed evidence. Use `Unknown` when evidence is missing.
- Never invent customer environments, integrations, compliance status, certifications, performance, implementation effort, dates, or stakeholder positions.
- Keep bid/no-bid and go/no-go decisions human-owned. Scores inform decisions but do not make them.

## RFP/RFI output

Produce a compliance matrix with requirement identifier, exact requirement, priority, response status, evidence, gap or dependency, owner, risk, and approval state. Highlight contradictions, mandatory gaps, security/privacy/legal review items, implementation dependencies, and questions for the buyer.

Coverage weights and decision thresholds must be supplied or explicitly labelled illustrative. Do not use the helper's defaults as organization policy. Any product, security, compliance, commercial, legal, or roadmap claim requires the accountable owner's approval.

## Competitive output

Compare only criteria material to the buyer. For each cell identify the evidence state: verified, vendor-claimed, customer-observed, inferred, or unknown. Separate product differences from service, implementation, ecosystem, commercial, and relationship differences. Produce strengths, vulnerabilities, likely objections, honest responses, and evidence still needed; never fabricate a differentiator.

## Demo output

Tie each demo segment to a stakeholder concern and verified capability. Include prerequisites, data and privacy controls, expected behavior, fallback steps, questions to ask, and follow-up evidence. Never stage behavior in a way that could be mistaken for a production capability.

## POC safeguards

A POC must define:

- Decision to be informed and named decision owner
- In-scope use cases and explicit exclusions
- Success criteria agreed before execution, with baseline, target, tolerance, data source, owner, and verification method
- Environment, access, synthetic or approved data, security/privacy controls, support model, and teardown/retention plan
- Provider and customer responsibilities, dependencies, schedule, checkpoints, and stop conditions
- Treatment of defects, unavailable dependencies, scope changes, and inconclusive results
- Final evaluation, unresolved gaps, production-readiness work, and go/conditional/no-go decision

Default phases, hours, weights, durations, and pass thresholds in the helper are illustrative starting points. Replace them with opportunity-specific inputs and obtain the appropriate delivery, product, security, commercial, and client approvals. A successful POC does not authorize production deployment or guarantee a sale.

## Handoffs and boundaries

- `sales-engineer` owns the end-to-end technical pre-sales synthesis and stakeholder handoffs.
- `architect-agent` owns material architecture decisions; this skill may prepare discovery evidence and options.
- `delivery-manager` owns professional-services pricing, revenue operations, SOW/contract coordination, and commercial governance.
- `proposal-and-sow-writer` turns approved scope and commercial inputs into a proposal or SOW.
- `customer-success-manager` may consume accepted POC outcomes after close.
- Product owners decide roadmap priority and authorize roadmap statements.

Do not contact prospects, change CRM/RFP systems, provision environments, submit responses, deliver live demos, start POCs, or make commitments without separate authorization.

## Output quality

Return the requested artifact plus assumptions, unknowns, evidence gaps, risks, accountable approvals, and next decision. Prefer accurate partial coverage over persuasive but unsupported claims.
