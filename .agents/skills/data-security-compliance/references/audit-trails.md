# Audit Trails

## Objectives

Audit trails should provide trustworthy evidence of sensitive access and administrative action while minimizing new privacy and security risk. Define the investigation, compliance, and operational questions the trail must answer before choosing fields.

## Event Design

Capture, where appropriate:

- Trusted event time and unique event identifier
- Actor, workload identity, role, and authentication context
- Action, protected resource class, and authorization outcome
- Tenant or security boundary
- Correlation, request, job, or change identifier
- Policy or reason code
- Result and aggregate affected count

Do not record secrets, tokens, plaintext sensitive fields, full queries containing values, request bodies, exports, or unnecessary network identifiers.

## Integrity and Isolation

- Restrict applications to append through a narrow writer identity.
- Separate audit readers, operators, and administrators.
- Replicate or export to controlled immutable or tamper-evident storage when required.
- Protect ordering, integrity metadata, time synchronization, and delivery acknowledgements.
- Monitor dropped, delayed, duplicated, or malformed events.
- Apply approved retention, legal holds, encryption, and regional controls.

A database permission example alone does not make a trail immutable; privileged administrators, schema changes, and disabled pipelines remain threats.

## Verification

Test successful and denied access, privilege changes, exports, privacy requests, retention actions, key operations, event-pipeline failure, duplicate delivery, clock skew, unauthorized alteration, and investigation access.

Reconcile expected events against source operations and document known blind spots. Keep evidence accessible only to authorized investigators and reviewers.
