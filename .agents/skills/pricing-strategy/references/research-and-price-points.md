# Research and price points

## Evidence hierarchy

Combine multiple sources rather than treating one survey or competitor table as
the answer:

- Actual realized prices, discounts, win/loss reasons, retention, contraction,
  expansion, and usage by segment.
- Customer interviews about alternatives, ROI, budget ownership, and switching.
- Structured willingness-to-pay research with a qualified sample.
- Controlled pricing or packaging experiments where feasible.
- Current competitor and substitute pricing as market context.
- Unit economics, cost-to-serve, channel economics, taxes, and contract terms.

State the evidence date, sample, segment, geography, currency, and uncertainty.

## Value corridor

Build scenarios between the economic floor and the customer's perceived-value
ceiling. Include the next-best alternative, manual-process cost, measurable time
or revenue impact, implementation friction, risk reduction, and switching cost.
Captured-value percentages are scenario inputs, not universal rules.

## Van Westendorp

Ask qualified respondents when the offer becomes too cheap, a bargain,
expensive but acceptable, and too expensive. Use the resulting curves to
describe a directional acceptable range and indifference points.

Results are sensitive to sample selection, framing, currency, buyer role, and
whether respondents understand the product. They do not estimate demand or
causal elasticity by themselves. Use
[../scripts/price_sensitivity_calculator.py](../scripts/price_sensitivity_calculator.py)
for repeatable calculations after inspecting its input contract.

## MaxDiff and interviews

Use MaxDiff to estimate relative feature preference for packaging decisions.
In interviews, ask about current alternatives, quantified consequences, budget
source, approval process, and what would happen at materially different prices.
Avoid asking only whether a proposed price "sounds reasonable."

## Competitive benchmarking

Record published price, value metric, packages, included limits, contract term,
discount conditions, and collection date. Separate direct competitors from
substitutes and manual alternatives. Never copy a competitor's model without
testing whether its positioning, customers, margins, and go-to-market motion
match yours.

## Price selection

Model several candidate prices using realized-price assumptions. For each,
show conversion, retention, contraction, expansion, gross margin, sales effort,
and payback scenarios. Define a test duration, guardrails, stopping rule, and
reversal condition before launch.
