---
name: data-cost-governance
description: Use when managing, optimizing, or attributing costs on a data platform. Covers Snowflake credit management, BigQuery capacity and scan controls, Databricks DBU controls, object-storage lifecycle management, cross-platform FinOps, budgets, chargeback, anomaly response, and capacity planning.
tools: Read, Glob, Grep, Bash
metadata:
  version: "1.1.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Business & Finance"
---

# Data Cost Governance

Improve cost visibility and control without trading away required reliability, performance, security, or retention.

## Use this skill when

- Platform spend or unit cost increased unexpectedly
- Queries, warehouses, clusters, or storage appear wasteful
- A team needs budgets, alerts, showback, or chargeback
- Capacity commitments or storage lifecycle changes are being evaluated
- Cost ownership and tagging are incomplete

Use architecture, security/compliance, and data-quality skills for their respective decisions. Cost does not override retention, recovery, access-control, or service-level requirements.

## Required inputs

Establish what is known before recommending a change:

- Platform, cloud, region, edition or tier, and billing model
- Billing period and currency
- Current spend and usage units
- Workload owner, environment, and business criticality
- Performance and reliability objectives
- Retention, recovery, and compliance constraints
- Baseline window and comparison window for anomalies

If current prices or contract discounts affect the conclusion, fetch them from the provider's official pricing source or the customer's current contract at runtime. Record the retrieval date, region, tier, currency, and assumptions. Do not rely on prices embedded in examples.

## Route by platform or task

Read only what the request needs:

- [Snowflake](references/snowflake.md) for warehouse credits, resource monitors, query attribution, and storage controls.
- [BigQuery](references/bigquery.md) for bytes billed, reservations, partition controls, billing export, and budgets.
- [Databricks](references/databricks.md) for DBUs, compute policies, job clusters, system tables, and commitment analysis.
- [Object storage and data lakes](references/object-storage.md) for lifecycle tiers, small files, snapshots, versions, and retrieval tradeoffs.
- [Cross-platform FinOps](references/cross-platform-finops.md) for tagging, allocation, unit economics, budgets, and commitment planning.
- [Cost-spike runbook](references/cost-spike-runbook.md) when spend has already deviated and containment is required.

## Workflow

1. **Measure:** normalize cost and usage for comparable periods; separate price, volume, mix, and efficiency effects.
2. **Attribute:** map spend to platform, workload, environment, team, project, and owner. Keep unattributed spend visible.
3. **Prioritize:** rank opportunities by verified savings, engineering effort, operational risk, and reversibility.
4. **Control:** prefer preventive limits, scoped policies, automation, and alerts over recurring manual cleanup.
5. **Validate:** test changes against performance, reliability, retention, and recovery objectives.
6. **Monitor:** define an owner, expected savings, observation window, rollback trigger, and follow-up date.

## Safety and decision rules

- Never execute suspension, deletion, retention reduction, snapshot expiry, object transition, or capacity purchase without explicit authorization and verified targets.
- Treat budget alerts as notification unless the user explicitly approves enforcement behavior.
- Model retrieval, request, monitoring, egress, replication, and early-deletion charges—not storage or compute price alone.
- Distinguish list price from contracted effective price.
- Use sampled or aggregated billing data when raw query text, user identifiers, tags, or resource names may be sensitive.
- Recommend commitments only from stable measured demand and include break-even, utilization, downside, and exit constraints.
- Prefer reversible experiments before account-wide or production-wide controls.

## Deliverable

Provide:

- Baseline and scope
- Top cost drivers with evidence
- Recommended controls and estimated savings range
- Assumptions and current-price sources
- Risks, dependencies, owner, and rollback
- Measurement plan and review date

Avoid false precision. Separate observed values, calculated estimates, and recommendations.
