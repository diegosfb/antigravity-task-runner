# Compliance, Retention, and Erasure

Use for technical planning around retention, consent, data-subject requests, deletion, legal hold, and audit evidence. This is not legal advice; confirm obligations and exceptions with qualified counsel or privacy leadership using current authoritative sources.

## Build the obligation map

For each data category and jurisdiction record purpose, lawful or contractual basis, source, controller or processor role, residency, retention rule, legal holds, downstream copies, backup behavior, and accountable approver. Do not invent a retention duration.

## Data-subject or erasure workflow

1. Authenticate and authorize the request through the approved process.
2. Resolve the subject identity without exposing identifiers in tickets or logs.
3. Discover relevant systems using validated catalog and lineage evidence.
4. Apply legal holds, exemptions, and scope decisions from authorized reviewers.
5. Execute approved deletion, anonymization, restriction, or correction through idempotent controls.
6. Reconcile derived data, caches, indexes, replicas, exports, and backup schedules.
7. Validate completion and preserve non-sensitive evidence.
8. Handle failures, retries, deadlines, and escalation.

Soft deletion is not automatically erasure. Pseudonymization may still be personal data. Backup deletion feasibility and restoration procedures must be explicitly addressed.

## Consent and purpose

Preserve consent or preference version, purpose, source, timestamp, jurisdictional context, and withdrawal. Enforce the decision at relevant collection and use boundaries; a reporting view alone may not cover all processing.

## Safety

Deletion, retention reduction, or legal-hold changes are destructive and require explicit authorization, verified targets, rollback or recovery analysis, and auditable execution. Never place subject data in command arguments or general logs.

