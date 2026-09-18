# Cost, quota, and cleanup

Treat all prices, quotas, storage multipliers, request limits, and model cost
comparisons as time-sensitive. Verify them before presenting an estimate or
performing material ingestion.

## Estimate before upload

Build an estimate from representative parsed samples:

- Source bytes and parsed text tokens.
- Expected chunks and overlap duplication.
- Indexing charge per token or documented billing unit.
- Stored source, embedding, and metadata footprint where applicable.
- Query volume, retrieved context tokens, and generation-model usage.

Show assumptions and a range. A fixed bytes-per-token ratio or storage
multiplier is only a rough planning heuristic and must not be presented as a
billable fact.

## Controls

- Deduplicate sources using stable hashes.
- Reject unexpectedly large uploads before sending data.
- Limit upload concurrency and daily ingestion volume.
- Use metadata filters for relevance and scope, not as a claimed billing
  optimization unless current pricing documentation supports that claim.
- Alert on store count, document count, quota consumption, ingestion failures,
  and cost anomalies.
- Separate development, test, and production stores.

## Cleanup

Create a retention and deletion path before ingestion. Resolve exact resource
names, confirm tenant/environment ownership, and obtain explicit authorization
before deleting documents or stores. Forced deletion is destructive and may
remove all documents in a store. Record the result and verify the resources no
longer appear after deletion.

Official pricing: https://ai.google.dev/pricing
