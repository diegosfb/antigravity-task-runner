---
name: data-security-compliance
description: Design or implement data-layer security, privacy, and compliance controls for sensitive data. Use for encryption and key management, tokenization, privacy-rights workflows, audit trails, retention and legal holds, breach response, or regulated cross-border processing. Treat legal applicability and compliance conclusions as requiring qualified legal or privacy review.
tools: Read, Glob, Grep, Bash
metadata:
  version: "1.1.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Data Security and Compliance

Produce least-privilege, auditable, and reviewable controls without claiming that technical implementation alone establishes legal compliance.

## Scope

This skill owns technical patterns for protecting sensitive data and implementing approved privacy or compliance requirements.

Route enterprise classification policy, stewardship, cataloging, ownership, and governance operating models to `../data-governance/SKILL.md`. Route general secret lifecycle design to `../secrets-management/SKILL.md`. Route authentication and application authorization changes to the repository's security workflow and applicable security-sensitive ownership rules.

## Required Context

Establish before recommending or changing controls:

- Jurisdictions, organizational role, and approved legal or privacy interpretation
- Data categories, subjects, purposes, systems, regions, processors, and flows
- Threat model and required protection from operators, administrators, applications, and attackers
- Existing identity, key, secret, audit, retention, backup, and incident systems
- Availability, search, analytics, recovery, and deletion requirements
- Owners and authorization for production changes or irreversible processing

If legal applicability is unclear, state assumptions and request qualified review. Do not convert examples into legal conclusions.

## Reference Routing

Load only the references relevant to the task:

- Classification and proportionate control selection: [classification-and-control-selection.md](references/classification-and-control-selection.md)
- Encryption architecture, keys, and rotation: [encryption-and-key-management.md](references/encryption-and-key-management.md)
- Tokenization and protected lookup design: [tokenization.md](references/tokenization.md)
- GDPR-oriented processing and rights workflows: [gdpr-and-data-subject-rights.md](references/gdpr-and-data-subject-rights.md)
- California privacy workflows: [ccpa-cpra.md](references/ccpa-cpra.md)
- Tamper-evident security and privacy audit trails: [audit-trails.md](references/audit-trails.md)
- Retention enforcement and legal holds: [retention-and-legal-holds.md](references/retention-and-legal-holds.md)
- Breach response and international transfers: [breach-and-cross-border-response.md](references/breach-and-cross-border-response.md)

## Workflow

1. Confirm scope, authority, data flows, sensitivity, and applicable approved requirements.
2. Minimize collected data and define the protection goal and attacker capabilities.
3. Select controls across identity, access, encryption, tokenization, logging, retention, and recovery.
4. Design failure behavior, key or policy rotation, monitoring, and rollback before implementation.
5. Implement the smallest change within repository security boundaries.
6. Test authorization, misuse, recovery, deletion, audit completeness, and sensitive-output handling.
7. Obtain required security, privacy, and legal review; document residual risk and evidence.

## Guardrails

- Never place real secrets, plaintext keys, credentials, or sensitive records in source, commands, logs, examples, alerts, tickets, or the vault.
- Do not invent cryptographic algorithms or implement custom cryptographic protocols.
- Use authenticated encryption and approved managed key services where encryption is required.
- Do not treat encryption as a substitute for authorization, minimization, isolation, or retention controls.
- Require explicit authorization before deletion, erasure, production key rotation, retention enforcement, containment, or cross-region movement.
- Preserve legal holds and verified recovery requirements before destructive processing.
- Treat statutory thresholds, deadlines, adequacy decisions, and transfer mechanisms as time-sensitive; verify them with current authoritative sources and qualified reviewers.
- Do not claim certification, regulatory coverage, or full compliance from a checklist or code sample.

## Deliverable

Produce a concise control design or implementation containing scope, assumptions, data-flow boundaries, selected controls, authorization gates, test evidence, review requirements, and unresolved risks.
