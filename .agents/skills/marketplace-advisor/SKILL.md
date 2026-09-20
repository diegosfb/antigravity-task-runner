---
name: marketplace-advisor
description: Analyze two- and multi-sided marketplace liquidity, supply-demand constraints, matching, trust, disintermediation, network effects, take rates, and unit economics. Use for marketplace model, launch, health, or monetization decisions; not for guaranteed network effects, autonomous pricing, or legal/regulatory conclusions.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: "borghei; adapted by DSFB"
  library: "Borghei Claude Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
  domain: "marketplace"
  updated: "2026-08-28"
---

# Marketplace Advisor

Analyze marketplaces at the smallest geography/category/time window where matching actually occurs. Identify every side, payer, beneficiary, constrained side, transaction or interaction, substitute, and off-platform alternative.

## Route selectively

- Liquidity, cold start, matching, and network effects: read [marketplace dynamics](references/marketplace_dynamics.md).
- Take rate and monetization: read [take-rate design](references/take_rate_design.md), then validate benchmarks for the exact category and geography.
- Metric triage: adapt [marketplace metrics template](assets/marketplace_metrics_template.json) and optionally run `python3 scripts/marketplace_health_scorer.py <metrics.json>`.

## Required discipline

- Separate GMV/GTV, recognized revenue, take rate, contribution margin, liquidity, fill/match rate, time to match, repeat, retention, concentration, and cohort behavior.
- Avoid global averages when liquidity is local or category-specific.
- Distinguish same-side, cross-side, data, reputation, and operational scale effects; do not label growth a network effect without evidence.
- Include incentives, subsidies, fraud, trust/safety, disputes, refunds, payments, disintermediation, supply quality, and regulatory classification when material.
- Treat thresholds and take-rate benchmarks as sourced hypotheses, not health verdicts or authorization to change pricing.

Return the marketplace map, constrained-side diagnosis, cohort/local metrics, economics, intervention options, experiment, risks, reviewers, and next decision. Verify current payments, labor, consumer, competition, licensing, and sector rules where applicable.
