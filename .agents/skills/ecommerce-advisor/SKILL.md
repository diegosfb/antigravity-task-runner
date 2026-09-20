---
name: ecommerce-advisor
description: Analyze ecommerce unit economics, channel mix, fulfillment, returns, payments, inventory implications, and growth trade-offs. Use for DTC, marketplace storefront, wholesale, retail, 3PL, dropship, or omnichannel decisions; not for guaranteed profitability, tax/legal conclusions, or autonomous pricing and channel changes.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: "borghei; adapted by DSFB"
  library: "Borghei Claude Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
  domain: "ecommerce"
  updated: "2026-08-28"
---

# Ecommerce Advisor

Model ecommerce decisions from contribution economics and operating constraints rather than generic benchmarks. Establish product/SKU, geography, channel, customer cohort, currency, tax treatment, fulfillment path, return behavior, and decision horizon.

## Route selectively

- Unit economics: adapt [unit-economics template](assets/unit_economics_template.json) and optionally run `python3 scripts/ecom_unit_economics_calculator.py <model.json>`.
- Fulfillment or inventory path: read [fulfillment models](references/fulfillment_models.md).
- DTC, marketplace, wholesale, retail, or omnichannel choice: read [channel strategy](references/channel_strategy.md), then verify current platform fees and policies.

## Required discipline

- Separate revenue, gross margin, contribution margin, operating profit, and cash flow.
- Include discounts, refunds, returns, fraud, payment fees, fulfillment, shipping, duties, marketplace fees, support, variable marketing, inventory loss, and working-capital timing when material.
- Segment by SKU, channel, geography, and cohort; blended averages can conceal unprofitable combinations.
- Treat platform fees, advertising economics, conversion, CAC, LTV, payback, and return rates as supplied/measured variables—not universal targets.
- Verify current marketplace rules, consumer protection, tax, customs, product-safety, privacy, and advertising requirements through authoritative sources and qualified reviewers.

Return the calculation ledger, scenarios, sensitivity drivers, channel/fulfillment trade-offs, operational constraints, risks, approvals, and experiment or decision. Do not change prices, campaigns, inventory, suppliers, or platforms without authorization.
