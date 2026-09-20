---
name: dashboard-builder
description: Design and build decision-oriented operational or business dashboards for Grafana, SigNoz, Google Cloud Monitoring, and Google Looker Studio (formerly Data Studio). Use when turning metrics and data sources into a validated dashboard, report blueprint, or supported platform configuration rather than a vanity board.
origin: ECC direct-port adaptation; extended by DSFB
metadata:
  version: "1.1.0"
  library: "Affaan Mustafa — Everything Claude Code (ECC)"
  library-url: "https://github.com/affaan-m/ECC"
  pack: "Software Development"
---

# Dashboard Builder

Build the smallest dashboard that helps a defined audience make a defined decision. Start from questions and governed metric definitions, then select the platform workflow that can honestly produce the requested artifact.

## Select one mode

| Need | Mode | Read |
| --- | --- | --- |
| Application, infrastructure, SRE, or incident operations | Operational dashboard | [Operational dashboards](references/operational-dashboards.md) |
| Native monitoring across one or more Google Cloud projects | Google Cloud Monitoring | [Google Cloud Monitoring](references/google-cloud-monitoring.md) |
| Business, product, marketing, customer, financial, or analytical reporting | Google Looker Studio | [Looker Studio](references/looker-studio.md) |

Use **Looker Studio**, the current name for Google Data Studio. Do not confuse it with governed Looker/LookML dashboards or Google Cloud Monitoring.

## Required context

Use existing project context first, then resolve only material gaps:

- audience, decisions, questions, actions, and review cadence;
- target platform and requested artifact;
- source systems, owners, viewer data-access identity approach, freshness, grain, and time zone;
- metric definitions, dimensions, filters, targets, thresholds, and comparison periods;
- privacy, row-level access, sharing, cost, latency, and accessibility constraints.

Never invent metric semantics, thresholds, joins, targets, credentials, or access grants. Mark unresolved items explicitly.

## Shared workflow

1. Write the operating or business questions in priority order. Reject panels that answer none of them.
2. Inventory the available data and validate grain, keys, units, time zone, freshness, null behavior, and ownership.
3. Create a metric contract for each KPI: name, purpose, formula, aggregation, grain, dimensions, filters, source, owner, freshness, target/threshold source, and validation query.
4. Choose the highest trustworthy transformation layer. Prefer a governed warehouse view or semantic model for reusable joins and business logic; use chart-level calculations only for presentation-local logic.
5. Design overview first, then diagnostic detail. Pair status with comparison, explanation, and the next action.
6. Implement only through mechanisms supported by the selected platform. Ask before creating, updating, sharing, or deleting remote dashboards or changing IAM.
7. Validate source totals, filters, date boundaries, empty/error/loading states, permissions, freshness, performance, accessibility, and mobile or presentation use where relevant.
8. Deliver the artifact plus a metric dictionary, data-source inventory, assumptions, unresolved items, verification evidence, ownership, and maintenance notes.

## Quality gates

- Every component maps to a named question and intended action.
- KPI values reconcile to an independent source query or trusted report.
- Titles, units, aggregation, time window, comparison baseline, and time zone are explicit.
- Filters cannot silently change a metric's meaning.
- Thresholds come from an SLO, policy, approved target, or evidenced baseline—not color preference.
- High-cardinality dimensions, expensive scans, blends, and refresh behavior are reviewed.
- Access follows least privilege; the chosen credential model and sharing audience are recorded.
- Color is not the only status signal, and charts have readable labels and meaningful text alternatives where the platform supports them.
- Empty results are distinguishable from zero and from data-source failure.

## Output behavior

- **Grafana/SigNoz:** produce or update the platform-native dashboard artifact when its schema and data-source identifiers are known; otherwise provide a build-ready panel/query specification.
- **Google Cloud Monitoring:** prefer version-controlled dashboard JSON or Terraform when repeatability is required. Validate without saving first when supported.
- **Looker Studio:** produce a build-ready report blueprint, metric/data model, connector and credential plan, field/calculation definitions, page/component specification, sharing plan, and verification checklist. Use a reusable template or Linking API when applicable, but do not claim the public API can construct every report component.

## Boundaries

- Dashboard creation does not authorize data-pipeline changes, production deployment, IAM mutation, dashboard publication, or stakeholder notification.
- Use `ui-designer` when the primary task is novel screen/interaction design rather than analytical information design.
- Use GCP data skills for BigQuery/Dataform/dbt implementation when the required governed view or pipeline does not yet exist.
- Use an observability or SRE workflow for alert-policy and incident-response design; a dashboard is not a substitute for alerting.

## Origin

Extends Affaan Mustafa's ECC `dashboard-builder` with Google Cloud Monitoring and Looker Studio modes, verifiable output contracts, access controls, data modeling, and validation.
