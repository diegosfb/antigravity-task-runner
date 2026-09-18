# Retention and Legal Holds

## Policy Before Automation

Automate only an approved schedule that identifies data category, purpose, system, event that starts the clock, duration, disposition, owner, jurisdiction, recovery constraints, and exception authority. Generic example periods are not legal requirements.

Map the schedule across primary stores, derived models, caches, search indexes, object storage, logs, replicas, vendors, and backups.

## Enforcement Design

- Use allowlisted assets and parameterized values; never construct destructive SQL from untrusted table or column names.
- Preview scope and counts before mutation.
- Process bounded, resumable, idempotent batches.
- Record policy version, cutoff, authorization, job ID, affected counts, and outcome without copying deleted data.
- Distinguish deletion, cryptographic erasure, anonymization, archival, and access restriction.
- Verify downstream propagation and reconcile results.
- Define rollback or recovery where the policy permits it.

Production deletion or anonymization requires explicit authorization and verified targets.

## Legal Holds

Holds must override ordinary disposition across all relevant systems. Use authorized, auditable creation and release workflows with scope, matter identifier, owner, start time, status, and approval evidence.

Fail safe when hold status cannot be determined. Test overlapping holds, partial scope, renamed assets, downstream copies, vendor data, backup behavior, and release authorization.

Avoid putting sensitive case details into broadly visible job logs or configuration.

## Verification

Run synthetic dry runs, compare expected and actual targets, exercise partial failure and restart, verify hold precedence, and confirm monitoring detects skipped or incomplete enforcement. Retain minimal evidence under its own approved schedule.
