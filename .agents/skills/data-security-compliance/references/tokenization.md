# Tokenization

## When to Use It

Use tokenization or pseudonymization when systems need stable references, limited joins, or controlled retrieval without broadly exposing the original value. It does not automatically remove data from regulatory scope; reversibility, linkability, and retained mappings matter.

## Architecture

A protected token service should:

- Generate opaque, non-meaningful tokens with sufficient entropy.
- Store mappings encrypted and isolated from primary application data.
- Authorize tokenization and detokenization separately.
- Scope tokens by tenant, domain, and purpose where cross-context linking is undesirable.
- Audit sensitive operations without logging original values.
- Apply retention, deletion, backup, and legal-hold policy to mappings.

Prefer established payment or specialist tokenization services for regulated data when appropriate.

## Avoid Unsafe Constructions

- Do not derive identifiers with an unkeyed fast hash of low-entropy sensitive data; dictionary attacks can recover common values.
- Do not store the original value as plaintext in a nominal token vault.
- Do not use deterministic encryption merely for convenience without leakage analysis and security review.
- Do not expose a broad detokenization endpoint or grant lookup access to general application roles.
- Do not assume a token is anonymous when other datasets can relink it.

## Design Decisions

Document whether tokens must be stable, format-preserving, single-use, tenant-scoped, or non-reversible. Record collision handling, idempotency, access policy, regional placement, rotation, deletion, outage behavior, and migration strategy.

## Verification

Test authorization boundaries, tenant isolation, replay, enumeration resistance, duplicate requests, deletion propagation, audit completeness, backup recovery, and absence of originals from logs and errors.
