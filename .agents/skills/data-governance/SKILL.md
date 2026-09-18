---
name: data-governance
description: Design or improve production data governance across ownership, catalogs, lineage, classification, privacy, access control, data contracts, retention, auditability, and stewardship. Use for metadata discovery, sensitive-data governance, producer-consumer agreements, policy design, or governance operating models.
tools: Read, Glob, Grep, Bash
metadata:
  version: "1.1.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Data Governance

Design governance that makes data discoverable, accountable, trustworthy, and appropriately protected without treating a tool deployment as the operating model.

## Use this skill when

- Establishing ownership, stewardship, policy, or decision rights
- Selecting or improving a catalog or metadata practice
- Capturing table, column, or job lineage
- Classifying personal, confidential, regulated, or business-sensitive data
- Designing data-access or masking policy
- Defining producer-consumer data contracts
- Planning retention, erasure, consent, or audit processes

Use `data-quality` for test and anomaly frameworks, `data-security-compliance` for control implementation and regulatory security, and architecture skills for platform topology. Governance coordinates these concerns but does not replace their specialists.

## Required context

Before recommending controls, establish:

- Business domains, critical data products, producers, and consumers
- Platforms, environments, jurisdictions, and data residency
- Data categories and existing classification scheme
- Applicable policies, contracts, and regulator or counsel interpretations
- Current ownership, access, retention, lineage, quality, and audit capabilities
- Decision owners, control operators, and evidence reviewers
- Desired outcome and maturity horizon

If laws, regulations, product capabilities, or standards affect the answer, verify the current authoritative source at runtime. Clearly separate technical guidance from legal interpretation and require qualified legal or privacy review.

## Route by governance concern

Read only the reference needed for the request:

- [Catalogs](references/catalogs.md) for metadata discovery, catalog requirements, and selection.
- [Lineage](references/lineage.md) for lineage scope, capture, quality, and use cases.
- [Classification and privacy](references/classification-and-privacy.md) for taxonomy, discovery, validation, and protection choices.
- [Access control](references/access-control.md) for policy design, entitlement lifecycle, masking, and audit evidence.
- [Data contracts](references/data-contracts.md) for ownership, schema, service levels, compatibility, and change management.
- [Compliance and erasure](references/compliance-and-erasure.md) for retention, consent, data-subject requests, deletion, and evidence.
- [Ownership and operating model](references/ownership-and-operating-model.md) for roles, forums, metrics, maturity, and rollout.

## Workflow

1. **Scope:** identify data domains, systems, jurisdictions, stakeholders, and decisions in scope.
2. **Inventory:** document current assets, owners, flows, classifications, policies, controls, and evidence gaps.
3. **Prioritize:** rank governance outcomes by business value, exposure, regulatory need, and feasibility.
4. **Design:** assign decision rights, policy, control, workflow, evidence, exception, and review cadence.
5. **Pilot:** implement a narrow, representative data product or domain before broad rollout.
6. **Validate:** test discovery, access, contract, lineage, retention, and audit scenarios with accountable reviewers.
7. **Operate:** measure adoption and control effectiveness; manage exceptions and policy changes.

## Safety and integrity rules

- Never include live credentials, personal records, sensitive samples, or production identifiers in examples or artifacts.
- Treat automated sensitive-data detection as candidate classification requiring confidence, sampling controls, and human validation.
- Do not invent regulatory obligations or retention periods.
- Do not execute grants, revocations, masking changes, retention changes, erasure, or deletion without explicit authorization and verified targets.
- Prefer approved tokenization, keyed pseudonymization, or platform-native controls; do not present unsalted or fast general-purpose hashes as adequate protection for identifiers.
- Keep policy intent separate from platform implementation and verify enforcement with tests and audit evidence.
- Record exceptions with owner, rationale, compensating control, expiry, and review date.

## Deliverable

Provide the minimum useful set of:

- Scope and current-state findings
- Governance principles and decision rights
- Policy and control matrix
- Ownership and stewardship model
- Metadata, lineage, classification, contract, and evidence requirements
- Phased implementation plan with dependencies
- Risks, exceptions, success measures, and review cadence
