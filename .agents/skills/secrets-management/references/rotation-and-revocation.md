# Rotation and revocation

## Zero-downtime rotation

Use overlapping validity only for the shortest tested window:

1. Generate a new version without exposing it in tooling output.
2. Update the protected resource when required.
3. Make consumers accept or retrieve the new version.
4. Verify authentication, authorization, health, and audit events.
5. Promote the new version and monitor errors.
6. Revoke the old version after every consumer has switched.
7. Verify rejection of the old credential and close the audit record.

Define ownership, sequencing, timeouts, rollback, and a stopping condition.
Never destroy the prior version before validating the replacement unless an
active incident requires immediate revocation.

## Database credentials

Prefer dynamic short-lived database users with minimal grants. When static
credentials are unavoidable, dual users can alternate current and standby
identities so one password changes while the other remains valid. Test grants,
connection pools, replicas, migrations, background jobs, and revocation.

## Certificates and signing keys

Account for issuance, distribution, trust-store propagation, overlap,
revocation, clock skew, and verification caches. Signing-key rotation requires
verifiers to recognize the new public key before it signs production artifacts
or tokens.

## Emergency revocation

If exposure is suspected, stop propagation, revoke or disable the credential,
rotate affected and derived credentials, update all consumers through the
approved manager, review relevant audit trails, and open an incident with scope
and ownership. Do not repeat the value in reports. Removing it from the latest
file or commit is not containment; assume it may have been copied.

History rewriting and backup destruction are separate destructive operations
requiring explicit authorization and a reviewed recovery plan.
