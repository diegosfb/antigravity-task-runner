---
name: customer-success-manager
description: Analyze supplied SaaS customer-success data using configurable health, retention-risk, and expansion-signal heuristics, then prepare success plans, onboarding checklists, QBRs, and executive reviews. Use for customer-success analysis and planning; do not present scores as predictions, automate customer contact, or treat illustrative revenue as a forecast.
license: MIT + Commons Clause
metadata:
  version: "1.0.0"
  author: borghei; adapted by DSFB
  category: business-growth
  domain: customer-success
  pack: Consulting & Professional Services
---

# Customer Success Manager

Analyze customer-success evidence and prepare the requested operating artifact. Three standard-library Python helpers provide repeatable heuristic scoring; they do not monitor systems, access a CRM, or predict customer behavior.

## Choose the minimum mode

- **Health:** `scripts/health_score_calculator.py` combines supplied usage, engagement, support, and relationship measures.
- **Retention risk:** `scripts/churn_risk_analyzer.py` ranks supplied warning signals and renewal proximity. Call its output a **risk indicator**, not churn probability or prediction.
- **Expansion:** `scripts/expansion_opportunity_scorer.py` identifies adoption and whitespace signals. Its built-in monetary values use generic multipliers and are illustrative scenarios only; replace them with the customer's verified price book and commercial rules before using them in a forecast, pipeline, proposal, or external communication.
- **Operating artifact:** use only the relevant template under `assets/` for onboarding, a success plan, QBR, or executive business review.

Do not run all modes merely because they are available.

## Inputs and data handling

1. Confirm the authorized input and intended audience. Never retrieve, enrich, upload, email, or write back customer data without explicit authorization.
2. Minimize data: prefer stable account IDs and aggregated operational metrics. Exclude personal contact details, credentials, message content, support transcripts, health information, payment data, and other unnecessary sensitive information.
3. Use `assets/sample_customer_data.json` only as a schema example. Its names and numbers are fictional and must never enter a real analysis.
4. Before running a helper, verify that every metric used by that mode is present, consistently defined, covers the same observation period, and uses the expected unit. The current scripts use fallback values for absent fields; therefore an incomplete record must not be scored as if it were complete.
5. Record the observation window, extraction time, source systems, missing fields, transformations, scoring configuration, and calibration version with the result.

## Analysis rules

- Treat default weights, thresholds, urgency multipliers, and playbooks as starting hypotheses. Calibrate them against the organization's retained, churned, renewed, and expanded cohorts before operational use.
- Never describe the bundled thresholds as industry standards or causal relationships. `references/illustrative-metrics-benchmarks.md` is an unsourced orientation aid; verify any benchmark against a current, attributable source before citing or using it for a decision.
- Keep **observed evidence**, **derived score**, and **recommended human action** separate.
- Show missing-data coverage and sensitivity alongside scores. If material evidence is missing or stale, return `INSUFFICIENT DATA` rather than a confident classification.
- Use trends over a single snapshot when comparable periods exist.
- Do not infer protected characteristics, employee performance, creditworthiness, or other sensitive traits.
- A high-risk or expansion signal creates a review task, not permission to contact a customer, change service, offer concessions, modify CRM records, or make a commercial commitment.

## Workflow

1. Define the business question, customer cohort, observation window, decision owner, and acceptable error cost.
2. Select one analysis mode and inspect its required schema in `assets/sample_customer_data.json`.
3. Validate completeness and definitions; stop or clearly bracket the result if material inputs are missing.
4. Run the relevant helper with `-B` to avoid creating bytecode in the skill directory, for example:

   ```bash
   python3 -B scripts/health_score_calculator.py INPUT.json --format json
   ```

5. Interpret the output as a transparent heuristic. Explain the strongest contributing signals, contradictory evidence, missing evidence, and sensitivity to configurable assumptions.
6. Apply the appropriate human-reviewed playbook from `references/cs-playbooks.md`, or fill the minimum relevant template. Tailor cadence and escalation to actual service commitments and account context.
7. For recurring use, back-test classifications and thresholds, document false positives/negatives, version the configuration, and obtain approval before operational rollout.

## Output contract

Include:

- purpose, cohort, observation window, and data provenance;
- coverage and missing-data statement;
- observed signals and derived heuristic results;
- assumptions, configuration version, and sensitivity;
- recommended owner, next review, and human-approved actions;
- explicit caveats for uncalibrated scores or illustrative expansion values.

Do not label an account `healthy`, `at risk`, or expansion-ready without pairing the label with its evidence, coverage, and model limitations.

## Resources

- `references/health-scoring-framework.md` — original scoring rationale; treat its assertions as hypotheses until locally validated.
- `references/cs-playbooks.md` — candidate interventions and lifecycle playbooks requiring contextual approval.
- `references/illustrative-metrics-benchmarks.md` — unsourced illustrative ranges; verify before use.
- `assets/qbr_template.md`, `assets/executive_business_review_template.md`, `assets/success_plan_template.md`, and `assets/onboarding_checklist_template.md` — optional output structures.

## Boundaries

- Use `revenue-operations` for governed pipeline and forecasting processes.
- Use `proposal-and-sow-writer` for a client-facing commercial proposal or SOW.
- Use `contract-drafting-assistant` explicitly for review-required contract language.
- This skill does not perform CRM integration, automated outreach, predictive ML, contract decisions, or binding revenue forecasts.

## Origin

Adapted from Borghei's `customer-success-manager` skill. The deterministic scripts and templates are retained; predictive and production-grade claims are intentionally narrowed.
