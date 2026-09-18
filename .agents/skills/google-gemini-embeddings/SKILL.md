---
name: google-gemini-embeddings
description: |
  Reference guidance for implementing Gemini text embeddings, semantic search, retrieval, clustering, and vector-store integrations. Use when choosing embedding task types or dimensions, building batch or RAG flows, or diagnosing Gemini embedding failures.
user-invocable: false
metadata:
  version: "1.0.0"
  library: "Jezweb Claude Skills"
  library-url: "https://github.com/jezweb/claude-skills"
  pack: "Software Development"
---

# Google Gemini Embeddings

Use this skill for Gemini embedding decisions and implementations. Keep the
entrypoint lightweight: read only the reference needed for the current task.

## Essential constraints

- Use the supported Google Gen AI SDK and an embedding model verified against
  the current official documentation.
- Select a task type that matches the operation. For retrieval, embed indexed
  content as documents and user searches as queries.
- Keep the embedding dimension identical across generation, storage, indexing,
  and querying. Normalize vectors when required by the selected model,
  dimension, and similarity metric.
- Treat model names, SDK versions, quotas, limits, pricing, and reported API
  defects as time-sensitive. Verify them with official Google documentation
  before relying on exact values.
- Keep API keys in environment-backed secret storage. Do not log keys,
  sensitive embedding inputs, or raw vectors derived from sensitive content.
- Bound batches and retries. Use exponential backoff with jitter for transient
  failures, preserve input-to-output identity, and fail visibly on partial or
  reordered results.
- Cache or persist embeddings only when the source data's privacy, retention,
  deletion, and access-control requirements permit it.

## Reference routing

- For model choice, provider tradeoffs, and migration considerations, read
  [references/model-comparison.md](references/model-comparison.md).
- For selecting output dimensions, normalization, storage cost, and index
  compatibility, read
  [references/dimension-guide.md](references/dimension-guide.md).
- For chunking, ingestion, retrieval, reranking, and generation workflows, read
  [references/rag-patterns.md](references/rag-patterns.md).
- For Cloudflare Vectorize setup, metadata, querying, and operational patterns,
  read
  [references/vectorize-integration.md](references/vectorize-integration.md).
- For API, SDK, quota, dimension, and retrieval troubleshooting, read
  [references/top-errors.md](references/top-errors.md).
- When editing TypeScript embedding or vector-search code, also apply the
  concise repository rules in
  [rules/google-gemini-embeddings.md](rules/google-gemini-embeddings.md), while
  verifying any version-sensitive claims before use.

## Reusable templates

Adapt the smallest relevant template; do not load every example by default:

- [templates/basic-embeddings.ts](templates/basic-embeddings.ts) for one SDK
  embedding request.
- [templates/embeddings-fetch.ts](templates/embeddings-fetch.ts) for direct
  HTTP or edge-runtime requests.
- [templates/batch-embeddings.ts](templates/batch-embeddings.ts) for bounded
  batch processing.
- [templates/semantic-search.ts](templates/semantic-search.ts) for semantic
  search.
- [templates/clustering.ts](templates/clustering.ts) for clustering.
- [templates/rag-with-vectorize.ts](templates/rag-with-vectorize.ts) for a RAG
  flow backed by Cloudflare Vectorize.
- [templates/package.json](templates/package.json) only when scaffolding the
  accompanying TypeScript examples; verify dependency versions first.

## Version verification

Run [scripts/check-versions.sh](scripts/check-versions.sh) when exact SDK or
package versions matter. Treat its output as a compatibility signal, then
confirm current models, quotas, and API behavior in the official sources:

- https://ai.google.dev/gemini-api/docs/embeddings
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://googleapis.github.io/js-genai/

## Completion checks

- Confirm query and document task types are intentionally different in RAG.
- Confirm stored and queried vectors use the same model and dimension.
- Exercise empty input, oversized input, throttling, transient failure, and
  partial-batch behavior.
- Measure retrieval quality on representative data instead of assuming a
  dimension, distance metric, or provider comparison is universally best.
