---
name: pricing-strategy
description: >
  Design or improve SaaS pricing through value metrics, packaging, evidence-led
  price research, pricing-page requirements, competitive positioning, and price
  increase planning. Use for new pricing, pricing audits, tier changes,
  freemium-versus-trial decisions, or proposed increases.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: borghei
  library: Borghei Claude Skills, adapted by DSFB
  library-url: https://github.com/borghei/Claude-Skills
  pack: Consulting & Professional Services
  category: business-growth
  updated: "2026-08-28"
  tags: [pricing, monetization, packaging, saas, value-based-pricing, revenue]
---

# Pricing strategy

Produce an evidence-led pricing recommendation with assumptions, scenarios,
risks, validation, and decision criteria. This skill is advisory: it does not
approve prices, modify billing systems, publish changes, contact customers, or
replace finance, tax, legal, or competition-law review.

## Select the mode

- **Design from scratch:** establish the value metric, packaging, price
  corridor, validation plan, and buyer-facing specification in that order.
- **Optimize existing pricing:** diagnose a specific pricing or packaging
  failure from current data before recommending changes.
- **Price increase:** model affected cohorts, contractual constraints,
  retention scenarios, communications, rollout, and reversal conditions before
  execution.

## Required evidence

Ask for or clearly mark as unavailable:

- Product, customer segments, buyer, user, job to be done, geography, currency,
  and sales motion.
- Current packages, value metric, prices, contract terms, discounts, and
  realized revenue.
- Conversion, retention, contraction, expansion, usage, outcomes, gross margin,
  support burden, and win/loss evidence by segment where available.
- Relevant alternatives and current competitor observations with dates.
- Decision objective, constraints, implementation window, and risk tolerance.

Do not silently invent missing inputs. When evidence is limited, provide labeled
scenarios and a research plan rather than false precision.

## Core decision order

```text
value metric -> packaging -> price point -> presentation -> validation
```

For value-metric selection, tier architecture, feature allocation, and
freemium-versus-trial decisions, read
[references/value-metrics-and-packaging.md](references/value-metrics-and-packaging.md).

For willingness-to-pay methods, value corridors, competitor benchmarking, and
price scenarios, read
[references/research-and-price-points.md](references/research-and-price-points.md).

For pricing-page requirements, enterprise presentation, positioning, and page
experiments, read
[references/pricing-pages-and-positioning.md](references/pricing-pages-and-positioning.md).

For audits, price increases, cohort modeling, communications, and success
criteria, read
[references/price-increases-and-diagnostics.md](references/price-increases-and-diagnostics.md).

## Analysis rules

- Treat generic SaaS conversion, churn, discount, tier-count, captured-value,
  and notice-period figures as hypotheses—not product targets.
- State source dates, samples, segment comparability, currency, taxes, contract
  assumptions, and uncertainty for benchmarks.
- Distinguish list price from expected realized price after discounts, credits,
  concessions, and channel effects.
- Evaluate conversion, retention, expansion, gross margin, predictability,
  customer comprehension, and cost to serve together.
- Do not infer causal price elasticity from observational conversion changes.
- Do not copy competitor pricing or use inflation alone as proof of willingness
  to pay.
- Separate reversible experiments from customer migrations and billing changes.
  Define guardrails and rollback before recommending execution.

## Scripts

Inspect inputs before running the bundled tools; do not treat their output as an
approved decision:

- [scripts/pricing_model_analyzer.py](scripts/pricing_model_analyzer.py) audits
  a supplied pricing-model JSON.
- [scripts/price_sensitivity_calculator.py](scripts/price_sensitivity_calculator.py)
  calculates directional Van Westendorp intersections from survey responses.
- [scripts/price_increase_modeler.py](scripts/price_increase_modeler.py) models
  revenue outcomes under supplied retention scenarios.

[agents/openai.yaml](agents/openai.yaml) contains the skill's UI metadata and
invocation policy; preserve it unless interface behavior is explicitly changed.

## Deliverables

Choose only what the request needs:

- Pricing strategy with value metric, packages, candidate prices, evidence, and
  rationale.
- Tier architecture and feature/limit allocation.
- Pricing-page content and interaction specification.
- Price research plan or analyzed willingness-to-pay results.
- Competitive pricing table with sources and observation dates.
- Price-increase scenario model, cohort rollout, communication brief, and
  monitoring plan.
- Pricing health scorecard with prioritized, testable recommendations.

Every recommendation should include the baseline, target, observation window,
guardrails, risks, assumptions, and reversal condition.

## Boundaries

- Use current web research when competitive pricing, legal requirements, market
  benchmarks, exchange rates, or other time-sensitive facts materially affect
  the answer.
- Escalate billing implementation, tax treatment, contract interpretation,
  regulated pricing, and competition-law questions to qualified owners.
- Do not fabricate customer evidence, market prices, certifications, savings,
  testimonials, or financial outcomes.
- Coordinate with revenue operations for pipeline and unit economics, product
  analytics for experiments, customer success for migration risk, and finance
  and legal for approval.
