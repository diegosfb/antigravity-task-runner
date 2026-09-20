# Operational dashboards

Use for Grafana, SigNoz, and similar observability platforms. Inspect an existing dashboard and the installed platform version before choosing schema, query language, or provisioning mechanism.

## Recommended information hierarchy

1. **Overview:** availability/SLO status, traffic, errors, latency, saturation, active incidents, and freshness.
2. **Performance:** latency distributions and percentiles, throughput, dependency behavior, and comparison with a relevant baseline.
3. **Resources:** CPU, memory, disk, network, queues, quotas, and capacity signals tied to service behavior.
4. **Service risks:** Kafka consumer lag and under-replicated partitions; Elasticsearch cluster/shard/JVM health; API upstream status and connection pressure; or equivalent domain signals.
5. **Diagnosis:** links or pivots to relevant logs, traces, profiles, alerts, deployments, and runbooks.

## Panel contract

For each panel specify:

- operator question and action;
- title, description, unit, visualization, and placement;
- query and data source UID/name;
- filters/variables and label cardinality;
- aggregation, grouping, rate window, and missing-data behavior;
- warning/critical threshold and its source;
- related alert, SLO, owner, and runbook link.

## Validation

- Parse or import the native artifact with the target platform/version.
- Execute every query over representative quiet, normal, and incident windows.
- Compare key values with source queries and alert evaluations.
- Check variable defaults, escaping, time range, refresh interval, and multi-select behavior.
- Confirm deploy annotations and logs/traces pivots work.
- Verify high-cardinality or unbounded queries cannot overload the data source.
