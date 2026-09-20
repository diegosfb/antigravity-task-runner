---
name: ma-playbook
description: Structure non-binding merger and acquisition analysis across deal thesis, target screening, buyer or seller readiness, diligence, valuation scenarios, deal terms, negotiation preparation, closing readiness, post-merger integration, and synergy tracking. Use for detailed M&A work; not for legal, tax, accounting, investment-banking, valuation, board, or transaction authority.
license: MIT + Commons Clause
metadata:
  version: "2.1.0"
  author: "borghei; adapted by DSFB"
  library: "Borghei Claude Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
---

# M&A Playbook

Support buyers, sellers, and integration leaders across the transaction lifecycle. Begin with a falsifiable deal thesis, alternatives, evidence needs, decision rights, walk-away criteria, and integration implications. Do not confuse a structured analysis with professional diligence or transaction approval.

## Select the lifecycle mode

- **Thesis and screening:** strategic rationale, buy/build/partner alternatives, target criteria, disconfirming evidence, and preliminary integration complexity.
- **Buyer diligence:** financial, tax, legal, commercial, customer, product, technology, security/privacy, people/culture, operations, regulatory, and integration-readiness workstreams.
- **Seller readiness:** evidence-backed positioning, issue remediation, management preparation, controlled data-room index, disclosure dependencies, and process risks.
- **Valuation and structure scenarios:** transparent assumptions across methods, sensitivities, financing, consideration, escrow/holdback, earnout, retention, and downside cases. Qualified finance, tax, legal, and valuation professionals own conclusions.
- **Negotiation and closing readiness:** issue list, decision matrix, concessions, approval gates, conditions, dependencies, communications readiness, and transition planning; never negotiate or submit terms autonomously.
- **Post-merger integration:** integration thesis, preserve/absorb/hybrid choices by function, Day 1 readiness, workstreams, dependencies, business continuity, talent/customer protection, systems/data/security migration, synergy baselines, and transition to business as usual.

## Workflow

1. Establish side (buyer, seller, or combined company), transaction stage, jurisdictions, industry, confidentiality status, parties, decision, timeline, available evidence, advisors, and approval bodies.
2. Separate `VERIFIED`, `MANAGEMENT-PROVIDED`, `ASSUMPTION`, `INFERENCE`, `OPEN ITEM`, and `REVIEW-REQUIRED`. Preserve source, owner, date, and access restrictions for material evidence.
3. Define the deal thesis and measurable value drivers. Compare acquisition with credible alternatives and state conditions that invalidate the thesis.
4. Build only the workstreams required for the stage. Assign accountable human owners and escalation paths; do not declare legal, tax, financial, security, people, or regulatory matters cleared.
5. Model valuation, consideration, synergies, costs, timing, and risks as labelled scenarios. Use current sourced market evidence for comparables or multiples and disclose sensitivity, currency, period, and methodology.
6. Design integration before close at the highest authorized detail. Keep signing, closing, Day 1, first 100 days, and longer-term realization distinct; actual timing follows deal conditions and business needs, not a universal calendar.
7. Return the requested artifact plus assumptions, unresolved issues, decision gates, required reviewers, and next authorized action.

## Deterministic helpers

- `scripts/due_diligence_tracker.py` manages a local checklist JSON. Its status labels are workflow indicators, not professional clearance. Provide a user-approved output path when data is sensitive.
- `scripts/synergy_calculator.py` performs illustrative arithmetic on user-supplied estimates and confidence. Its allocations, discounts, and timelines are hypotheses—not probabilities, forecasts, valuations, or market benchmarks.
- `scripts/integration_planner.py` generates a draft planning scaffold. Every action, owner, date, communication, personnel decision, access change, system migration, and customer activity requires validation and authorization.

Inspect script assumptions before using them and adapt outputs to the transaction rather than treating defaults as policy.

## Output options

- Deal thesis and alternative analysis
- Target screen or buyer/seller readiness assessment
- Diligence plan, tracker, red-flag register, and decision log
- Valuation or deal-structure scenario workbook
- Negotiation issue list and approval matrix
- Signing, closing, Day 1, and integration-readiness plan
- Integration blueprint, workstream plan, dependency map, risk register, and synergy scorecard
- Executive or board decision brief marked non-binding

## Boundaries

- This skill does not provide legal, tax, accounting, securities, antitrust, employment, privacy, regulatory, investment, fairness, solvency, or valuation opinions.
- Never access a data room, contact a party, solicit a buyer or target, submit an indication/offer/LOI, accept terms, sign, close, move funds, change access, communicate with employees/customers, terminate roles, migrate systems, or execute integration work without separate explicit authorization.
- Treat confidential deal data, personal data, insider information, credentials, and clean-team material according to supplied access rules. Do not place sensitive data in logs or examples.
- Do not use generic multiples, percentages, timelines, or retention targets as current market facts. Source and date them or label them as scenario assumptions.
- Human executives, boards, counsel, tax/accounting advisors, investment bankers, security/privacy reviewers, HR, and functional owners retain their actual decision rights.

## Handoff

`mergers-and-integrations` uses this skill for detailed case coordination. `executive-advisor` remains appropriate for a high-level executive or board challenge and may route detailed work here.
