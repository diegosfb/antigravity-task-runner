# Context Caching

## Confirm Support

Verify that the selected model, API surface, account, region, and SDK version support explicit caching. Confirm minimum content, TTL, billing, and lifecycle behavior from official documentation.

## Use When Economical

Caching helps when a sufficiently large, stable prefix is reused enough times before expiry. Compare cache creation and storage cost against uncached requests using measured traffic. Do not claim a fixed savings percentage.

## Lifecycle

- Define cache ownership, tenant boundary, source version, and retention.
- Avoid mixing data from different users or authorization contexts.
- Store cache names as opaque resource identifiers, not as model identifiers unless current SDK documentation specifies that shape.
- Handle creation, update, listing, expiration, invalidation, and deletion failures.
- Invalidate when source content, policy, permissions, or system instructions change.

Do not cache secrets or data beyond its approved retention period.

Implement caching from current official examples after verifying model eligibility, request structure, TTL, file-state handling, and generation calls.
