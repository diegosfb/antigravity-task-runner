# GDPR-Oriented Processing and Data-Subject Rights

## Legal Boundary

Use this reference to implement requirements already scoped by qualified privacy or legal reviewers. Verify current official text, regulator guidance, jurisdiction, organizational role, exemptions, and deadlines before relying on any requirement.

## Processing Inventory

Maintain an approved record connecting:

- Processing purpose and responsible owner
- Data subjects and categories
- Systems, recipients, processors, and regions
- Approved lawful basis and balancing or consent evidence where applicable
- Retention and deletion behavior
- Security safeguards and transfer mechanism
- Rights handling and escalation contacts

Technical teams should preserve traceability to the approved record rather than independently selecting a lawful basis.

## Rights Workflow

A request workflow should support the rights determined applicable by counsel and policy, such as access, correction, deletion, restriction, objection, portability, consent withdrawal, or review of automated decisions.

Core controls include:

1. Authenticate the requester proportionately without collecting unnecessary new data.
2. Record receipt, scope, jurisdiction, status, owner, and approved deadline.
3. Discover data across sources, derived products, processors, archives, and relevant backups.
4. Apply exemptions, legal holds, conflicting obligations, and identity resolution through approved review.
5. Execute authorized export, correction, restriction, or deletion using bounded and auditable jobs.
6. Verify completeness and securely deliver the result.
7. Retain minimal evidence of fulfillment under the approved retention rule.

## Safety

- Do not return data solely from an asserted identifier such as an email address.
- Avoid bulk exports into ordinary object storage or email attachments.
- Do not use string-built table or column names from request input.
- Do not equate nulling selected columns with complete erasure.
- Model downstream, backup, fraud, financial, and legal-hold exceptions explicitly.
- Keep request exports and operational logs free of unrelated subjects' data.

Test end-to-end with synthetic subjects, including identity conflicts, partial failures, derived datasets, processors, and recovery behavior.
