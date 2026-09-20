---
name: leads-qualification
description: Define and calibrate an Ideal Customer Profile, then deterministically score supplied account facts with explicit exact, token, contains, or numeric-range rules. Use for pre-opportunity prioritization; do not research missing data, predict conversion, or authorize outreach.
license: MIT + Commons Clause
metadata:
  version: "1.0.0"
  author: borghei; adapted by DSFB
  category: business-growth
  domain: sales-qualification
  pack: Consulting & Professional Services
---

# Lead Qualification

Compare supplied, sourced account facts with a versioned Ideal Customer Profile (ICP). The result is a transparent prioritization heuristic—not a conversion probability, forecast, or permission to contact a lead.

## Inputs

- A versioned ICP following `assets/icp_schema.json`.
- A CSV whose columns cover every ICP rule field and include `company`.
- Provenance, retrieval date, and `UNKNOWN` values from `leads-researcher` or another authorized source.
- A calibration cohort of historical outcomes when the score will affect operating decisions.

Do not silently enrich or reinterpret missing facts.

## Rule behavior

- `exact` (default): normalized full-value equality; use for country, industry code, plan, and other categorical values.
- `token`: match a complete item in a comma-, semicolon-, or pipe-separated field; use for technology and signal lists.
- `contains`: intentional case-insensitive substring matching for narrative fields only.
- `numeric_range`: inclusive `min`/`max`; use for company size or revenue.
- Any matched disqualifier produces `disqualified`.
- A known value that fails any must-have produces `disqualified`.
- A blank or `UNKNOWN` must-have produces `needs_data`, not a low score or disqualification.
- A/B/C tiers apply only after all must-haves pass. Thresholds are configuration hypotheses that require calibration.

## Workflow

1. Define the ICP from observed differences between suitable and unsuitable customers, not only shared traits among wins. Exclude protected traits and proxies.
2. Version the ICP and document each rule's business rationale, source, owner, matching mode, and weight.
3. Validate the JSON and CSV fields, then run:

   ```bash
   python3 -B scripts/lead_qualifier.py icp.json leads.csv --json
   ```

4. Review `matched_signals`, `failed_must_haves`, and `unknown_signals`; never use the tier without its reasons.
5. Back-test on temporally separated wins, losses, disqualified accounts, and non-responses. Check precision by tier, coverage, false positives, false negatives, and segment bias.
6. Obtain human approval before using a threshold operationally. Version subsequent changes and retain the prior evaluation.

## Output contract

- ICP name/version and scoring configuration.
- Data provenance, as-of date, coverage, and unresolved fields.
- Ranked accounts with status, score, matched signals, failed must-haves, unknown signals, and disqualifier evidence.
- Calibration evidence and limitations when available.
- Clear statement that qualification is advisory and does not authorize outreach, CRM mutation, forecasting, or discriminatory treatment.

## Resources

- `references/icp_framework.md` — ICP design and calibration guidance.
- `assets/icp_schema.json` — supported rule schema.
- `scripts/lead_qualifier.py` — standard-library deterministic validator and scorer.

## Boundary

Use `leads-researcher` when account facts are missing or require public-source verification. Hand sufficiently qualified, active opportunities to `account-executive` for discovery and MEDDIC. Keep outreach drafting and sending separate and explicitly authorized.

## Origin

Extracted and corrected from Borghei's upstream lead research skill.
