# Google Cloud Monitoring dashboards

Use for operational dashboards backed by Cloud Monitoring metrics, logs-based metrics, Prometheus data, uptime checks, and SLOs.

Authoritative references:

- [Create and manage dashboards by API](https://cloud.google.com/monitoring/dashboards/api-dashboard)
- [Dashboard examples and layouts](https://cloud.google.com/monitoring/dashboards/api-examples)
- [Metrics scopes](https://cloud.google.com/monitoring/settings)

## Design inputs

- scoping project and monitored projects;
- monitored resource types and metric descriptors;
- label dimensions and expected cardinality;
- metrics scope, IAM viewer/editor model, and dashboard owner;
- SLOs, alerting policies, uptime checks, logs, and runbooks to link;
- deployment method: console, version-controlled JSON, API/gcloud, or Terraform.

For multi-project dashboards, establish the metrics scope deliberately. Do not assume that a project can chart another project's data merely because the metric name exists.

## Artifact rules

- Use the Cloud Monitoring `Dashboard` resource schema—not Grafana JSON.
- Choose a supported layout intentionally. Use `MosaicLayout` when section headers or collapsible/single-view groups are required.
- Prefer a stable custom dashboard ID only when lifecycle ownership requires it; otherwise let the API generate one.
- Do not carry `name` or `etag` into a duplicate dashboard unless updating the same resource intentionally.
- Use Monitoring filters, PromQL, or another query form supported by the installed API and widget type. Do not introduce deprecated query patterns without verifying current support.

## Safe validation and deployment

Validate a configuration before saving:

```bash
gcloud monitoring dashboards create \
  --config-from-file=dashboard.json \
  --project=PROJECT_ID \
  --validate-only
```

Creating, patching, deleting, changing a metrics scope, or granting IAM requires explicit authorization. After authorized deployment, retrieve the dashboard and verify widgets, metric scope, filters, permissions, and links in the console. For Terraform-managed dashboards, keep the dashboard JSON in version control and avoid uncoordinated console edits.
