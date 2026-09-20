---
name: business-idea-evaluator
description: Evaluate a startup or business idea using evidence, explicit assumptions, market and unit-economics scenarios, founder fit, risks, defensibility, and validation experiments. Use when deciding whether or how to pursue an idea; do not present unsupported market claims or false-precision success probabilities.
license: MIT
metadata:
  version: "1.0.0"
  library: "DSFB Business & Finance"
  library-url: ""
  pack: "Business & Finance"
  derived-from: "biz-idea-checker"
---

# Business Idea Evaluator

Evaluate an idea candidly enough to support a pursue, revise, test, or stop decision. Optimize for realistic economics and evidence rather than enthusiasm, pessimism, or a venture-scale narrative.

## Establish the evaluation frame

Identify or state reasonable assumptions for:

- the idea, customer, painful job, proposed solution, geography, and business model;
- the founder or team's relevant experience, network, capital, distribution, location, constraints, and unfair advantages;
- the desired outcome, time horizon, funding preference, and target revenue or profit range;
- existing evidence such as interviews, commitments, usage, revenue, experiments, market research, and competitor observations.

Founder characteristics and revenue targets are inputs, not defaults. Do not assume a San Francisco location, Argentina connection, software/IoT background, bootstrap strategy, or `$1M–$20M` target unless supplied.

If important context is missing, proceed with clearly labelled assumptions when a useful preliminary evaluation is still possible. Ask only when different answers would materially change the decision.

## Evidence discipline

Separate every material conclusion into:

- `VERIFIED`: supported by supplied evidence or a current attributable source;
- `FOUNDER-PROVIDED`: asserted by the user but not independently verified;
- `ESTIMATE`: calculated from stated inputs and assumptions;
- `HYPOTHESIS`: plausible but requires validation;
- `UNKNOWN`: insufficient evidence.

Use current authoritative or primary sources for market conditions, competitors, prices, regulations, funding, and other time-sensitive claims. Cite sources near the supported conclusions. Never turn a top-down market statistic into evidence of reachable demand.

## Evaluation

Cover only the dimensions needed for the decision:

1. **Problem and urgency:** customer, frequency, severity, current behavior, switching trigger, and willingness-to-pay evidence.
2. **Initial customer:** narrow early adopter profile, buyer, user, decision process, and practical route to the first customers.
3. **Alternatives and competition:** direct competitors, substitutes, internal/manual approaches, differentiation, and credible response from incumbents.
4. **Market and reachability:** bottom-up customer count, attainable segment, geography, constraints, and expansion path. Distinguish total market from realistically reachable market.
5. **Business model:** value metric, pricing hypothesis, revenue mechanics, gross margin, sales cycle, retention drivers, acquisition cost, servicing cost, and capital needs.
6. **Founder fit:** relevant strengths, gaps, access, credibility, constraints, and which advantages can actually affect execution or distribution.
7. **Defensibility:** distribution, switching costs, workflow embedding, proprietary data, network effects, brand, regulation, or technical advantage. Do not label ordinary features as a moat.
8. **Risks and invalidating evidence:** rank the few risks most likely to make the idea unattractive, including likelihood, impact, earliest signal, and mitigation or test.

## Scenario economics

Build transparent scenarios from explicit variables rather than promising a single outcome. Where inputs permit, show conservative, base, and optimistic cases for:

- customers or transactions;
- price and revenue;
- gross margin and material variable costs;
- acquisition and sales assumptions;
- time to the user's stated target.

Show the arithmetic. If a target is supplied, calculate at least one plausible route to it and identify the assumptions carrying the most uncertainty. Do not invent CAC, LTV, conversion, churn, or market-size inputs.

## Assessment

Use a compact rubric when comparison or prioritization benefits from scoring:

| Dimension | Evidence-backed assessment |
| --- | --- |
| Problem severity | Weak / Mixed / Strong / Unknown |
| Reachable demand | Weak / Mixed / Strong / Unknown |
| Founder fit | Weak / Mixed / Strong / Unknown |
| Monetization | Weak / Mixed / Strong / Unknown |
| Distribution | Weak / Mixed / Strong / Unknown |
| Defensibility | Weak / Mixed / Strong / Unknown |
| Capital efficiency | Weak / Mixed / Strong / Unknown |

Do not report a numeric probability of startup success unless a defensible, calibrated model and relevant base-rate data are supplied. Instead provide:

- a recommendation: `PURSUE`, `REVISE`, `TEST FIRST`, or `STOP`;
- confidence: `LOW`, `MEDIUM`, or `HIGH`;
- the evidence and assumptions behind both;
- the single piece of evidence most likely to change the recommendation.

## Validation plan

Recommend the smallest experiments that resolve the most decision-critical uncertainty. For each experiment state:

- hypothesis;
- target participant or data source;
- method and effort;
- pass, fail, and ambiguous thresholds;
- decision caused by each result;
- ethical, privacy, legal, or financial constraints.

Prefer interviews, concierge tests, landing-page or outreach tests, prototypes, letters of intent, pre-sales, and pricing tests before substantial implementation when they can answer the question more cheaply. These recommendations do not authorize outreach, advertising spend, data collection, or external publication.

## Output

Return the minimum useful evaluation with:

- idea and assumptions;
- evidence ledger;
- problem, customer, alternatives, market, economics, founder fit, defensibility, and key risks;
- recommendation and confidence;
- scenario math where inputs support it;
- prioritized validation experiments;
- optional stronger adjacent concepts only when the analysis reveals a concrete advantage, not as a mandatory add-on.

Do not append a sales prompt or automatically offer a full business plan. The user can request product discovery, financial modeling, market research, or business planning separately.

## Boundaries

- This skill supports analysis; it does not approve investment, spending, hiring, incorporation, fundraising, or product development.
- Treat financial projections as scenarios, not forecasts or guarantees.
- Flag material legal, tax, regulatory, privacy, securities, employment, and industry-specific questions for qualified review.
- Protect confidential ideas, customer information, and founder data; do not upload or disclose them without authorization.
