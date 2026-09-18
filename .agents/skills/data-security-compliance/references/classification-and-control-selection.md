# Classification and Control Selection

## Start from the Organization's Policy

Use the approved classification taxonomy when one exists. Do not silently replace it with a generic tier model. Map external requirements and data categories into that taxonomy with the responsible security, privacy, legal, and data owners.

Common decision inputs include:

- Identifiability and sensitivity
- Harm from disclosure, alteration, loss, or delayed availability
- Contractual, sector, and jurisdictional requirements
- Data-subject expectations and processing purpose
- Aggregation, inference, and re-identification risk
- System exposure and administrator access

## Select Proportionate Controls

For each class and processing purpose, consider:

- Collection minimization and purpose limitation
- Identity, least privilege, separation of duties, and access review
- Transport, storage, field, or application-layer encryption
- Tokenization or pseudonymization
- Masking in non-production and analytical interfaces
- Audit events, monitoring, and alerting
- Retention, deletion, backup, and legal-hold behavior
- Regional placement and processor restrictions

Classification does not mechanically dictate a single control. Document the threat addressed, residual exposure, operational cost, and exception owner.

## Control Record

Capture:

- Data asset and owner
- Classification and approved rationale
- Purpose, subjects, systems, and regions
- Allowed identities and operations
- Required safeguards and evidence
- Retention and deletion rule
- Review cadence and exception expiry
- Incident and recovery contacts

Avoid embedding sensitive values or record samples in the control record.
