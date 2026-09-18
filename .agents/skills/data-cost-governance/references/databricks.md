# Databricks Cost Governance

Use for Databricks compute, DBU, serverless, storage, and commitment analysis. Verify current SKU, cloud, region, runtime support, and contracted DBU rates.

## Diagnose

- Use billing system tables and billable-usage exports to attribute quantity and cost by workspace, SKU, cluster or endpoint, job, and tags.
- Join job and compute metadata carefully; document records that remain unattributed.
- Separate interactive, job, SQL warehouse, pipeline, model-serving, and serverless workloads.
- Inspect idle duration, autoscaling behavior, failed retries, skew, spill, and runtime duration.

## Controls

- Use compute policies to bound node types, worker counts, runtime choices, auto-termination, tags, and spot behavior.
- Prefer ephemeral job compute for scheduled workloads when startup time, libraries, and isolation requirements permit.
- Set auto-termination from workload behavior and user experience requirements.
- Use spot or preemptible workers only when interruption, checkpointing, and retry behavior are acceptable.
- Evaluate Photon or serverless from measured total job cost and latency, not advertised speedup alone.

## Storage and table maintenance

- Diagnose small files, unnecessary retained versions, duplicate data, and inefficient layouts.
- Coordinate compaction, optimization, and vacuum with concurrency, time-travel, recovery, and streaming requirements.
- Never shorten retention or vacuum aggressively without explicit approval and verified rollback implications.

## Evidence to return

- DBUs and effective cost by workload and owner
- Idle, retry, and failure cost
- Policy gaps and untagged usage
- Current-rate and commitment assumptions
- Expected savings with reliability and interruption risks

