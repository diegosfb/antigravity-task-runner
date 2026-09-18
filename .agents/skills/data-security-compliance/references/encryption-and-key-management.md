# Encryption and Key Management

## Define the Protection Goal

Distinguish protection against lost media, storage administrators, database readers, application compromise, network interception, and unauthorized exports. Storage encryption alone does not address every threat; field encryption can also reduce searchability and complicate recovery.

## Architecture Choices

- Platform-managed storage encryption: baseline protection for supported storage services.
- Application or field encryption: protects selected values before persistence when the threat model requires it.
- Envelope encryption: uses a data-encryption key protected by a key-encryption key in an approved managed service.
- Tokenization: replaces sensitive values when controlled lookup or reference is needed; see [tokenization.md](tokenization.md).

Use current, reviewed authenticated-encryption libraries and provider SDKs. Do not prescribe an algorithm, nonce strategy, or key size without matching current organizational standards and platform guidance.

## Key Controls

- Generate, store, and use keys through approved KMS, HSM, or secret-management services.
- Prefer workload identity and narrow decrypt permissions over distributed static credentials.
- Separate key administration from data administration where feasible.
- Bind encryption context or associated data to the intended tenant, field, or record where supported.
- Prevent plaintext keys and decrypted values from entering logs, traces, crash reports, or persistent caches.
- Record key ownership, purpose, consumers, region, recovery, rotation, revocation, and destruction rules.

## Rotation and Migration

Design rotation as a versioned migration:

1. Inventory consumers, ciphertext formats, backups, replicas, and dependent jobs.
2. Introduce key or ciphertext version metadata.
3. Enable reads for old and new versions before changing writes.
4. Re-encrypt through bounded, resumable, idempotent batches when required.
5. Verify counts, decryptability, performance, and rollback.
6. Retire old decrypt access only after all consumers and recovery paths are proven.

Production rotation and key destruction require explicit authorization. Never print progress containing plaintext or keys.

## Review and Testing

Cryptographic changes require security review. Test unauthorized decrypt attempts, tenant separation, corruption handling, service outages, rotation recovery, backup restore, and safe telemetry.
