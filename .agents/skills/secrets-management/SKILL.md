---
name: secrets-management
description: Design or review secret storage, access, rotation, revocation, and application integration using centralized managers, workload identity, short-lived credentials, and auditable least privilege. Use for Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, or credential lifecycle decisions.
allowed-tools: Read, Glob, Grep
metadata:
  version: "1.0.0"
  library: "Melodic Software"
  library-url: "https://github.com/melodic-software/claude-code-plugins"
  pack: "Software Development"
---

# Secrets management

Design systems that keep credentials outside source and artifacts, minimize
exposure, enforce least privilege, support tested rotation and revocation, and
produce useful audit evidence without revealing secret values.

## Stop on suspected exposure

If a potential real credential is discovered, stop further propagation and
warn the user without repeating the value. Prioritize revocation and rotation,
identify consumers, review relevant audit trails, open an incident, and add
regression controls. Deleting the current copy does not make an exposed secret
safe. Git-history rewriting or destructive cleanup requires separate explicit
authorization.

## Non-negotiable safeguards

- Never place real passwords, tokens, private keys, signing keys, connection
  strings, or equivalent secrets in source, tests, examples, documentation,
  Git, tickets, logs, traces, metrics, screenshots, images, build artifacts,
  container layers, releases, IaC source, committed state, or client bundles.
- Use an approved centralized manager for production and shared environments.
- Prefer workload identity, managed identity, dynamic credentials, or other
  short-lived access over static shared keys.
- Grant each workload only the resources and operations it needs. Deny by
  default and audit both successful and denied access without logging values.
- Encrypt in transit and at rest with managed, reviewed cryptography. Do not
  invent algorithms, key derivation, or protocols.
- Define ownership, purpose, allowed consumers, expiration, rotation,
  revocation, backup, recovery, and destruction for every secret class.
- Test manager unavailability, renewal failure, rotation overlap, revocation,
  rollback, and break-glass access.
- Resolve exact resources and obtain explicit authorization immediately before
  deletion, purge, credential revocation, or other externally mutating actions.

## Architecture workflow

1. Inventory secret classes, consumers, environments, trust boundaries,
   residency, availability needs, and incident requirements.
2. Choose the system of record and authentication mechanism.
3. Design least-privilege policies, network boundaries, audit logging, cache
   behavior, high availability, backup, and disaster recovery.
4. Define issuance, distribution, renewal, rotation, revocation, destruction,
   and emergency procedures.
5. Integrate workloads without exposing values to source, commands, logs, or
   user-controlled clients.
6. Validate with dummy credentials, negative authorization tests, rotation and
   recovery exercises, and secret scans of source and built artifacts.

## Reference routing

- For lifecycle, centralized stores, dynamic credentials, envelope encryption,
  and client-side encryption tradeoffs, read
  [references/fundamentals-and-architecture.md](references/fundamentals-and-architecture.md).
- For Vault architecture, authentication, policies, secrets engines, leases,
  and operational safeguards, read
  [references/hashicorp-vault.md](references/hashicorp-vault.md).
- For AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, and cross-cloud
  considerations, read
  [references/cloud-secret-managers.md](references/cloud-secret-managers.md).
- For zero-downtime rotation, database credentials, certificates, signing keys,
  emergency revocation, and incident containment, read
  [references/rotation-and-revocation.md](references/rotation-and-revocation.md).
- For runtime injection, environment variables, sidecars, CSI drivers, SDK
  access, observability, and testing, read
  [references/application-integration.md](references/application-integration.md).

## Environment guidance

Environment variables can be an acceptable protected runtime injection
mechanism, but they may leak through process inspection, diagnostics, child
processes, or logs. Prefer direct manager access, workload identity, or
memory-backed mounted files when they better fit the threat model.

For local development, prefer the operating-system credential store. An ignored,
permission-restricted `.env` file is a fallback only; committed `.env.example`
files contain names and obvious dummy values, never credential-shaped data.
Never pass real values literally on command lines.

## Completion criteria

- No secret values appear in source, artifacts, telemetry, plans, or reports.
- The selected manager and identity mechanism fit the platform and threat model.
- Access is least-privilege, attributable, reviewable, and monitored.
- Rotation and revocation have owners, tested procedures, rollback, and bounded
  overlap.
- Availability, cache, recovery, and break-glass behavior are documented and
  exercised.
- Applications fail safely and do not expose values through errors or clients.
- Secret scanning and relevant security review findings are investigated before
  commit or release.
