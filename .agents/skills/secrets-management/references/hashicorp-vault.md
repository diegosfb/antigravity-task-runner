# HashiCorp Vault

Use Vault when centralized policy, dynamic credentials, PKI, transit
cryptography, or multi-platform integration justify operating it.

## Design decisions

- Choose an HA storage backend and document quorum, backup, restore, sealing,
  unsealing, disaster recovery, and upgrade procedures.
- Separate administrative, human, CI/CD, and workload authentication.
- Prefer workload-native authentication such as Kubernetes, cloud identity, or
  OIDC over long-lived tokens and shared AppRole Secret IDs.
- Scope policies to exact paths and capabilities; avoid broad wildcard access.
- Define token and lease TTLs, renewal behavior, orphan-token handling, and
  revocation trees.
- Send audit devices to protected, monitored storage without logging returned
  secret values elsewhere.

## Secrets engines

- **KV:** versioned static values. Configure retention and deletion semantics.
- **Database:** short-lived database users with bounded roles and tested revoke
  statements.
- **PKI:** short-lived certificates, constrained roles, revocation, and CRL or
  OCSP operations.
- **Transit:** managed encryption, signing, or verification where applications
  should not possess master keys.
- **Cloud engines:** temporary provider credentials constrained by provider-side
  IAM as well as Vault policy.

## Operational safeguards

Do not expose root tokens, unseal material, recovery keys, Secret IDs, or
rendered values in source, commands, logs, plans, support bundles, or CI output.
Test lease renewal, revocation, leader loss, sealed-state behavior, storage
restore, and application behavior when Vault is unavailable.

Vault configuration and API behavior are version-sensitive. Verify commands
and supported storage or authentication methods against the deployed version's
official documentation.
