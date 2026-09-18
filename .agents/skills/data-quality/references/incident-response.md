# Data Quality Incident Response

## Lifecycle

1. Detect: confirm the signal is current and the monitor itself is healthy.
2. Triage: identify affected assets, partitions, consumers, and business processes.
3. Assess: determine severity from verified impact, exposure duration, and available workarounds.
4. Contain: prevent further harm using the smallest authorized action.
5. Diagnose: locate the earliest bad boundary and establish a reproducible cause.
6. Recover: correct the defect, replay or backfill when authorized, and reconcile results.
7. Verify: confirm restored service and downstream consistency.
8. Communicate: provide concise status, impact, decisions, and next update.
9. Prevent: add or improve controls, ownership, runbooks, and architecture.

## Safe Triage

- Query aggregate counts and bounded partitions before inspecting individual records.
- Use approved restricted environments and redact sensitive fields.
- Preserve timestamps, run IDs, code versions, lineage, and source-delivery evidence.
- Distinguish source defects, transformation defects, late arrivals, monitor defects, and legitimate business changes.
- Do not paste record samples into tickets or chat unless explicitly approved and safely redacted.

## Containment and Recovery

Potential actions include halting publication, quarantining a partition, disabling a consumer-facing refresh, or switching to an approved last-known-good dataset. Pausing production, deleting output, replaying events, or backfilling data requires appropriate authorization and verified scope.

Define reconciliation criteria before recovery. A successful rerun alone does not prove that downstream state is correct.

## Post-Incident Output

Record:

- Timeline and detection path
- Consumer and business impact
- Root cause and contributing conditions
- Containment and recovery decisions
- Evidence that correctness was restored
- Control gaps, owners, and due dates

Avoid fixed severity labels or response deadlines unless the organization has approved them. Map the incident to the applicable policy and service objectives.
