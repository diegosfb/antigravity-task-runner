# Infrastructure Management Guideline

This is the operational infrastructure contract for every agent designing,
provisioning, changing, reviewing, or deploying infrastructure. It governs
Infrastructure as Code, access, networking, encryption, logging, state,
validation, drift, recovery, cost, and production changes.

The precedence order is `constitution.md` → `AGENTS.md` → this guideline. The
security, GitHub Flow, and Jira Flow guidelines also apply. Infrastructure work
must not bypass frozen zones, review gates, or explicit production approvals.

## Infrastructure as Code is authoritative

- Define infrastructure with an approved IaC tool such as Terraform,
  CloudFormation, Bicep/ARM, Pulumi, or provider-native declarative tooling.
- Store source in version control and change it through short-lived branches
  and reviewed pull requests.
- Do not provision or modify production resources manually in a cloud console
  or with unrecorded imperative commands.
- If an emergency manual change is explicitly approved, record the incident,
  reconcile the exact change into IaC immediately, verify drift is cleared, and
  remove temporary access.
- Use reusable modules and the same code across DEV, QA, and PROD with
  environment-specific inputs.
- Pin provider/module versions, validate inputs, document interfaces, and use
  semantic versions for shared modules.
- Do not commit generated provider directories, local state, plan files that
  contain sensitive data, or environment credentials.

## Change workflow

Every infrastructure change follows:

1. Identify the requirement, environment, owner, risk, and rollback path.
2. Update IaC using the smallest scoped change.
3. Format and validate the configuration.
4. Generate a plan against the intended environment.
5. Run policy-as-code, security, compliance, cost, and static-analysis checks.
6. Review the plan for creates, updates, replacements, deletions, exposure,
   identity changes, and estimated cost.
7. Obtain required human approval. Production apply always requires explicit
   authorization for the exact reviewed plan and target.
8. Apply the reviewed plan through controlled automation where possible.
9. Verify health, security posture, logs, metrics, and intended outputs.
10. Record the result and confirm rollback readiness.

Do not apply an unreviewed or materially changed plan. Regenerate and reapprove
when inputs, state, provider behavior, or proposed actions change.

## State management

- Use a remote backend for shared and production IaC state.
- Enable encryption, state locking, versioning, access logging, and restricted
  least-privilege access.
- Separate state by environment and blast radius.
- Treat state and plan files as sensitive because providers may store values
  even when marked sensitive.
- Back up state and test restoration.
- Never edit state manually without an approved recovery plan and exact backup.
- Detect and reconcile drift; do not normalize unmanaged changes as acceptable.

## Identity and access

- Deny by default and grant least privilege.
- Use workload identity, managed identity, role assumption, or federation
  instead of long-lived access keys.
- Separate human, workload, CI/CD, and break-glass identities.
- Require MFA and just-in-time elevation for privileged human access.
- Scope service identities to one workload and environment.
- Audit privileged actions and review access regularly.
- Store credentials only through the approved secret-management mechanisms in
  `.agents/guidelines/security.md`.

## Public exposure and networking

Infrastructure is private by default.

- Place data stores, internal services, and administrative endpoints on private
  networks with private endpoints where supported.
- Restrict ingress and egress to explicit protocols, ports, sources, and
  destinations.
- Do not use unrestricted `0.0.0.0/0` or `::/0` access for administrative,
  database, or internal service ports.
- Put public applications behind an approved edge, load balancer, API gateway,
  WAF, or equivalent control with TLS, rate limits, and logging.
- Segment environments and trust zones; production must not trust DEV or QA by
  default.
- Document all required public endpoints, their owners, threats, protections,
  and removal criteria.

Any new or expanded public exposure requires documented justification, threat
assessment, explicit human approval, and a verified rollback. A tool's default
public setting is not justification.

## Encryption

- Encrypt data in transit with current TLS and validated certificates.
- Encrypt storage volumes, databases, object stores, queues, backups,
  snapshots, logs, artifacts, and IaC state at rest.
- Use provider-managed keys by default and customer-managed keys when required
  by regulation, tenant isolation, or risk.
- Apply least privilege to key use and administration, enable audit logging,
  and define rotation/recovery procedures.
- Never store encryption keys beside the protected data or in source control.
- Verify encryption settings in the generated plan and after deployment.

## Logging, monitoring, and auditability

Enable logging for every supported infrastructure layer:

- Cloud control-plane and organization audit logs.
- Identity, authentication, authorization, and key-access logs.
- Network flow, firewall, load balancer, gateway, DNS, and WAF logs.
- Compute, container, serverless, database, storage, queue, and application
  platform logs.
- IaC pipeline, deployment, policy, and configuration-change records.

Centralize logs in a protected account/project with encryption, retention,
integrity controls, and access restrictions. Prevent workloads from deleting
their own audit history. Logs must not contain secrets or unnecessary sensitive
payloads.

Also provide metrics, traces where applicable, dashboards, and actionable
alerts. Alert on symptoms, anomalous IAM activity, public exposure,
configuration drift, encryption changes, logging disablement, budget anomalies,
backup failures, and security-policy violations. Test alerts and escalation
paths.

## Policy, compliance, and testing

- Enforce organization guardrails with policy-as-code or provider policy.
- Scan IaC for insecure configurations before merge and apply.
- Validate required tags, encryption, private networking, logging, backups,
  identity, and region/compliance constraints.
- Run provider validation and plan checks; use automated infrastructure tests
  where risk warrants them.
- Block known critical security violations. Route uncertain findings to human
  review rather than silently suppressing them.
- Record justified exceptions with owner, scope, expiration, compensating
  controls, and removal plan.

## Environments and promotion

- Use separate cloud accounts, subscriptions, or projects for DEV, QA, and
  PROD.
- Reuse modules but isolate state, identities, secrets, networks, data, and
  quotas.
- Promote immutable application artifacts from DEV to QA to PROD; do not
  rebuild environment-specific binaries.
- Keep environment configuration external to code and secrets in the approved
  secret manager.
- Prevent lower environments from administering or directly accessing
  production.
- Use synthetic data in DEV and masked/anonymized production-like data in QA.

## Reliability, backups, and disaster recovery

- Define availability, RTO, and RPO from business requirements before choosing
  topology.
- Avoid single points of failure for workloads requiring high availability.
- Use multi-zone or multi-region designs when justified by the required
  availability and recovery objectives.
- Encrypt, version, and protect backups from modification or deletion.
- Document and test restore, failover, and rollback procedures.
- Track recovery-test results against RTO/RPO.
- Define graceful degradation for dependencies and secret-manager outages.

## Cost and ownership

Apply mandatory metadata such as:

- `Environment`
- `Owner`
- `Application`
- `CostCenter`
- `ManagedBy`

Enable budgets, anomaly alerts, and cost allocation. Right-size resources,
apply autoscaling or scale-to-zero where suitable, and use lifecycle policies
for storage. Cost optimization must not weaken security, reliability, or
compliance without an explicitly approved trade-off.

## Containers and runtime infrastructure

- Use minimal signed images referenced by immutable digest.
- Run non-root, drop unnecessary capabilities, restrict network access, and use
  read-only filesystems where practical.
- Keep secrets external to images and inject them through approved runtime
  mechanisms.
- Scan images and runtime configuration and retain an SBOM.
- Apply resource limits, health checks, runtime monitoring, and admission
  policies.
- Restrict registries and verify image provenance before deployment.

## Incident and emergency changes

Emergency access does not suspend this guideline.

1. Obtain explicit emergency authorization and identify the exact target.
2. Use time-limited break-glass access with audit logging.
3. Minimize the change and preserve evidence without exposing secrets.
4. Verify service and security posture.
5. Reconcile the change into IaC immediately.
6. Remove temporary access and resolve drift.
7. Record the incident, timeline, rationale, and follow-up controls.

## Completion

Infrastructure work is complete only when IaC and deployed state agree, the
reviewed plan was applied to the intended target, public exposure is minimized
and approved, encryption and logging are verified, policy/security checks pass,
monitoring and recovery paths work, cost/ownership metadata exists, and the
change and rollback are recorded.
