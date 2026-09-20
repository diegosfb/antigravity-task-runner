---
name: partnerships-architect
description: Evaluate potential partners, select partnership models, design partner programs, structure business terms, model partnership ROI, or review a partner portfolio. Use for detailed partnership strategy and artifacts; do not treat heuristic scores as approvals, draft binding legal terms, or contact partners.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: borghei; adapted by DSFB
  category: commercial
  domain: business-growth
  library: "Borghei / Claude-Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
---

# Partnerships Architect

Design evidence-backed technology, channel, reseller, OEM, marketplace, co-sell, co-marketing, and strategic partnerships. Produce a decision aid or requested artifact; never present a model score as organizational approval.

## Select the mode

- **Partner evaluation:** compare strategic fit, economics, credibility, mutual commitment, operational fit, reversibility, and material risks.
- **Partnership type:** choose the smallest relationship model that achieves the goal; read `references/partnership-types.md`.
- **Program design:** define target partner profile, tiers, incentives, enablement, governance, operating capacity, and measurement; read `references/partner-program-design.md`.
- **Deal structure:** define non-binding business-term options and negotiation questions; read `references/partnership-deal-structures.md`.
- **ROI or portfolio review:** model sourced scenarios and compare contribution, investment, risk, and strategic fit.

Load only the references needed for the selected mode.

## Decision standard

1. Establish the objective, target customer, mutual value, alternatives, decision owner, approval path, time horizon, and exit conditions.
2. Separate verified facts, partner claims, internal assumptions, and model-generated scenarios. Preserve missing inputs as unknown.
3. Make thresholds, weights, staffing ratios, discounts, costs, conversion assumptions, and attribution rules explicit and organization-specific. Historical calibration is preferred; otherwise label them hypotheses requiring approval.
4. Test a reversible pilot against the full relationship when uncertainty or switching cost is high. Define success, stop, escalation, and review criteria before launch.
5. Show base, downside, and upside economics without calling pipeline revenue. Include internal labor, engineering, enablement, marketing, support, governance, opportunity cost, and wind-down exposure where material.
6. Recommend proceed, pilot, redesign, defer, or decline with rationale—not a score alone. Name the accountable decision owner and unresolved evidence.

## Deterministic helpers

- `scripts/partner_evaluation_scorer.py` validates user-supplied dimension scores and organization-defined decision bands. It does not infer universal scores from company size or pipeline.
- `scripts/partnership_roi_modeler.py` calculates three-year scenarios only from explicitly supplied revenue and cost inputs; missing economics fail validation.
- `scripts/partner_program_designer.py` creates an illustrative baseline only after its assumptions are explicitly acknowledged. Replace its tier economics, staffing, and maturity assumptions with organization-specific evidence before adoption.

Review helper outputs in context. They do not authorize spending, staffing, pricing, contracting, CRM changes, or partner communications.

## Output contract

Include the decision and owner; partnership model and mutual value; evidence and assumptions; economics and sensitivity; commitments and governance; risks, dependencies, and exit design; recommended next step; approval requirements; and open questions. For a program, also include target partner profile, lifecycle, enablement, capacity model, tier hypotheses, metrics, and an experiment/review plan.

## Boundaries and handoffs

- Use `executive-advisor` for a conversational CEO/CRO-level challenge of whether partnerships belong in the enterprise strategy. Load this skill when detailed evaluation or artifacts are needed.
- Use `proposal-and-sow-writer` for an approved commercial proposal or SOW.
- Use `contract-drafting-assistant` only when explicitly requested for a review-required draft. This skill may organize business terms and legal questions, but it does not provide legal advice, declare terms standard, or create a binding agreement. Qualified legal, tax, finance, security, privacy, and regulatory reviewers retain their decision rights.
- Use the organization's actual pricing, finance, deal-approval, security, and architecture processes when available. Do not reference unavailable `channel-economics` or `deal-desk` skills.
- External research, file changes, tracker/CRM mutations, and partner outreach require their own authorization.

## Origin

Adapted from Borghei's Partnerships Architect skill. Fixed thresholds and example ratios from the source are retained only as clearly labelled hypotheses in references or the acknowledged baseline generator.
