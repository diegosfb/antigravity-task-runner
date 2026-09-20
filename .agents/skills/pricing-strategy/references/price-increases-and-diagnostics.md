# Price increases and diagnostics

## Diagnose before changing price

Do not infer underpricing from one signal. High conversion may reflect strong
fit, biased traffic, a weak trial gate, or underpricing. Discount requests may
reflect procurement norms or unclear value. Concentration in one tier may be
healthy segmentation rather than a missing upsell path.

Audit by segment and cohort:

- Realized price and discount distribution.
- Conversion and sales-cycle length.
- Retention, contraction, and expansion.
- Usage, outcomes, and cost to serve.
- Win/loss, downgrade, cancellation, and support reasons.
- Gross margin, channel costs, and contract constraints.

Use [../scripts/pricing_model_analyzer.py](../scripts/pricing_model_analyzer.py)
for a structured diagnostic after inspecting its schema.

## Increase design

Choose among new-customers-only, grandfathering, scheduled migration, value-led
repackaging, or a uniform increase based on evidence and contractual rights.
Segment affected customers by contract, renewal date, tenure, usage, realized
value, health, and relationship risk.

Before communicating:

1. Model revenue, churn, contraction, discounts, support cost, and margin across
   multiple scenarios.
2. Define grandfathering, migration, exceptions, approval authority, and a
   reversal condition.
3. Review notice periods, auto-renewal terms, consumer rules, taxes, competition
   law, and communications with qualified legal and finance owners.
4. Prepare accurate customer-specific old and new prices plus available options.
5. Instrument leading and lagging indicators by cohort.

For a simple price increase with unchanged economics, arithmetic break-even
churn is `increase / (1 + increase)`. It is not a churn forecast. Use
[../scripts/price_increase_modeler.py](../scripts/price_increase_modeler.py) for
scenario calculations and include contraction and discounts when material.

## Communication

State what changes, when it changes, why, the customer's exact impact, and their
available choices. Do not invent product improvements or market claims. Align
notice with contracts and law rather than relying on a universal number of days.

## Success criteria

Define baseline, target, observation window, guardrails, and reversal condition.
Measure realized revenue and margin alongside retention, contraction, expansion,
support burden, sentiment, comprehension, and exceptions—not list price alone.
