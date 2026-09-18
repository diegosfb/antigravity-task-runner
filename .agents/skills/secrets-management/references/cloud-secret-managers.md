# Cloud secret managers

Select the provider-native manager when workloads primarily run in one cloud
and managed identity, auditing, replication, and availability meet the need.
Verify current features, limits, pricing, and regional behavior in official
provider documentation.

## AWS

Use IAM roles and workload credentials to access AWS Secrets Manager or Systems
Manager Parameter Store where appropriate. Scope `GetSecretValue` and related
permissions to exact resources and conditions. For managed rotation, validate
the create, set, test, and finish stages; alarm on stuck or failed rotations.
Use cross-region replication only with explicit residency and recovery design.
Review CloudTrail coverage and resource policies.

## Azure

Use managed identities and Azure RBAC with least privilege for Key Vault access.
Distinguish secrets, cryptographic keys, and certificates. Configure network
boundaries, logging, soft delete, purge protection, backup/recovery, and tenant
isolation intentionally. Treat purge as destructive and require explicit
authorization after resolving the exact vault and object versions.

## Google Cloud

Use workload identity and narrowly scoped Secret Manager IAM roles. Choose
automatic or regional replication according to residency and availability
requirements. Manage versions explicitly, disable or destroy obsolete versions
only after consumer verification, and enable audit logging and anomaly alerts.

## Cross-cloud considerations

Avoid copying the same static credential into several managers unless a
documented migration or continuity requirement demands it. Define one source of
truth, synchronization ownership, version mapping, rotation order, rollback,
and failure behavior. Provider-managed encryption does not replace application
authorization, data classification, or incident response.
