# Fundamentals and architecture

## Secret lifecycle

Every secret needs an owner, purpose, authorized consumers, storage location,
creation time, expiration where supported, rotation method, emergency
revocation procedure, and destruction requirements.

Manage the full lifecycle:

1. Generate with a cryptographically secure source and appropriate strength.
2. Store encrypted with controlled, audited access.
3. Distribute over authenticated transport with minimal copies.
4. Use for the shortest practical period and avoid exposing values in memory,
   logs, diagnostics, or child processes.
5. Rotate through a tested overlap or dynamic-credential strategy.
6. Revoke promptly and propagate invalidation to every consumer.
7. Delete according to retention, backup, and recovery policy.

## Architecture selection

Prefer a centralized, highly available secret manager integrated with workload
identity. It provides one policy and audit plane but introduces availability,
latency, and bootstrap dependencies. Define cache behavior, fail-closed policy,
break-glass access, recovery, and regional failure handling.

Prefer dynamic or short-lived credentials when the target system supports
them. They reduce rotation coordination and exposure duration but require
reliable issuance, lease renewal, revocation, and clock handling.

## Envelope encryption

Use a managed key-encryption key to wrap data-encryption keys. Store ciphertext
with the wrapped data key, algorithm identifier, key version, and authenticated
metadata. Keep plaintext keys only as long as necessary. Key rotation strategy
depends on whether the key-encryption key or data-encryption key changes.

Do not invent cryptographic algorithms, key derivation, serialization, or nonce
management. Use reviewed platform cryptography and obtain security review for
cryptographic design changes.

## Client-side or zero-knowledge designs

If the server must be unable to decrypt user data, derive and hold keys on the
trusted client and store only authenticated ciphertext server-side. Document
account recovery, key backup, device enrollment, sharing, metadata leakage,
audit limitations, and permanent-loss scenarios. Do not call a system
zero-knowledge merely because the database stores encrypted values.
