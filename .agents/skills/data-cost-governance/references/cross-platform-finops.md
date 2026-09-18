# Cross-Platform FinOps

Use when cost ownership, allocation, budgets, unit economics, or commitments span platforms.

## Allocation model

Define a small required tag or label contract, typically:

- Team or cost center
- Environment
- Product, project, or workload
- Owner
- Managed-by source

Document allowed values, enforcement point, inheritance, and treatment of shared costs. Keep unattributed cost as an explicit allocation category rather than silently spreading it.

## Normalized cost model

For each record preserve:

- Usage start and end time
- Provider, service, SKU, region, and resource
- Usage quantity and unit
- List cost, discounts, credits, taxes where available, and effective cost
- Currency and conversion method
- Allocation dimensions and source record identifier

Avoid comparing credits, slots, DBUs, and bytes directly. Convert to financial cost or a workload-specific unit such as cost per pipeline run, query, customer, or terabyte processed.

## Budgets and anomalies

- Set budgets by accountable scope and define notification recipients.
- Distinguish forecast alerts, anomaly alerts, and hard enforcement.
- Use seasonality-aware baselines where workloads vary by day, month-end, or release cycle.
- Require both absolute and relative significance so small noisy changes do not dominate.
- Record alert latency and billing-data delay.

## Commitment planning

- Use measured demand over a representative horizon.
- Model committed baseline, burst usage, utilization, growth or contraction, term, prepayment, transferability, and exit constraints.
- Compare scenarios using current contracted rates.
- Do not use a universal reserve percentage or spend threshold.
- Require explicit financial authorization before purchase or renewal.

## Recommendation table

For each opportunity report owner, platform, evidence, expected savings range, effort, risk, reversibility, dependency, and validation date.

