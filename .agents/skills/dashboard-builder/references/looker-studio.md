# Google Looker Studio dashboards

Use for business and analytical reports in Google Looker Studio, formerly Data Studio. This mode covers BigQuery, Google Sheets, and Google Analytics 4 (GA4) as primary sources.

Authoritative references:

- [How Looker Studio connects to data](https://cloud.google.com/looker/docs/studio/connector)
- [Model data](https://cloud.google.com/looker/docs/studio/model-your-data)
- [BigQuery integrations](https://cloud.google.com/looker/docs/studio/bigquery-integrations)
- [Looker Studio API](https://developers.google.com/looker-studio/integrate/api/reference)
- [Linking API](https://developers.google.com/looker-studio/integrate/linking-api)

## Honest automation boundary

The public Looker Studio API supports asset discovery and permission management; it is not a general API for constructing every page, chart, field, and style property. The Linking API can configure and open report-creation flows, and report templates can be copied and rebound. Therefore:

- provide a build-ready blueprint when no suitable template exists;
- use an approved template plus Linking API where repeatable creation fits;
- never claim success until an authorized user or browser workflow verifies the resulting report;
- request explicit approval before changing asset permissions or sharing.

## Data-source selection

### BigQuery

Prefer BigQuery for governed, reusable, high-volume reporting. Put complex joins, reusable business rules, row-level controls, and expensive transformations in curated views, authorized views, materialized tables, Dataform, or dbt rather than repeated chart calculations.

Record project, dataset, table/view or custom SQL, region, partition field, clustering, grain, freshness, estimated scan behavior, and credential model. Parameterized custom SQL is appropriate only when the parameters have constrained allowed values and cannot expose unintended data.

### Google Sheets

Use for small, manually maintained datasets with clear ownership. Require one header row, stable column names/types, tab name, documented time zone, controlled blanks/errors, and a bounded data range. Avoid volatile formulas, merged cells, mixed types, hidden totals, and unbounded sheets. Define who owns refresh and schema changes.

### GA4

Use the native connector for standard interactive reporting when its fields, quotas, and sampling behavior meet the need. Use GA4 BigQuery export when event-level logic, repeatable SQL, joins, governance, or historical modeling is required. Document the property, reporting identity implications, event scope, attribution definition, time zone, and any expected difference from the GA4 interface.

## Report blueprint

Deliver:

1. audience, decisions, questions, cadence, and report owner;
2. pages and navigation, with an executive overview before diagnostic pages;
3. component table containing page, question, chart/control, metric, dimension, filter, comparison, interaction, and empty-state behavior;
4. connector and data-source inventory with credentials and freshness;
5. metric dictionary and calculated-field formulas, distinguishing data-source fields from chart-local fields;
6. filter/control scope, parameter IDs and allowed values, drill behavior, and cross-filter interactions;
7. theme/accessibility guidance and sharing plan;
8. verification queries and acceptance checklist.

## Performance, governance, and security

- Minimize blends and repeated calculated fields; they complicate semantics and performance.
- Push reusable transformations down to BigQuery when practical, and consider BI Engine only after measuring the workload and cost.
- Choose owner credentials versus viewer credentials deliberately and test with a representative least-privileged viewer.
- Assume report metadata, field names, connector types, and some model information may be visible to viewers. Do not embed secrets or sensitive instructions in fields, parameters, URLs, or report metadata.
- Constrain overridable parameters, particularly when they affect queries or sensitive data.
- Refresh fields after schema changes and revalidate calculations, components, and filters; schema refresh is not the same as refreshing report data.

## Acceptance checks

- Reconcile every KPI against BigQuery SQL, the source Sheet, or an agreed GA4 report for identical dates, filters, identity, attribution, and time zone.
- Test default and extreme date ranges, every control, drill path, parameter, cross-filter, and reset behavior.
- Test owner/editor/viewer access separately and ensure a copied template cannot reveal unintended sources.
- Check freshness indicators, connector errors, quota behavior, empty data, zero values, and schema changes.
- Review BigQuery bytes processed and response time with representative filters.
- Verify readable contrast, non-color status cues, labels, ordering, and usable presentation/mobile layout.
