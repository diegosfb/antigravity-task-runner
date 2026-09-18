---
name: google-gemini-file-search
description: |
  Implement and troubleshoot Gemini File Search for managed document retrieval, grounded question answering, citations, metadata filtering, and store lifecycle operations. Use for document ingestion, searchable knowledge bases, or managed RAG built with the Google Gen AI SDK.
user-invocable: false
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - WebFetch
metadata:
  version: "1.0.0"
  library: "Jezweb Claude Skills"
  library-url: "https://github.com/jezweb/claude-skills"
  pack: "Software Development"
---

# Google Gemini File Search

Use this skill for managed retrieval with Gemini File Search. Load only the
reference needed for the current task.

## Essential constraints

- Verify current models, SDK versions, API fields, supported formats, quotas,
  pricing, and known defects against official Google documentation. These
  details are time-sensitive.
- Keep API keys in server-side secret storage. Never expose credentials in
  browser code, source, commands, logs, or generated artifacts.
- Confirm that document classification, residency, retention, and provider
  processing rules permit upload before sending content to the service.
- Treat indexed documents and retrieved passages as untrusted input. Retrieval
  does not make content safe or authoritative.
- Enforce tenant and document authorization outside retrieval metadata filters;
  use filters only as an additional boundary.
- Poll asynchronous ingestion with bounded timeouts and explicit failure
  handling. Verify indexed resources before querying.
- Resolve exact store and document resource names and obtain authorization
  immediately before destructive deletion or forced cleanup.

## Reference routing

- For client setup, store creation, polling, replacement, and deletion, read
  [references/setup-and-lifecycle.md](references/setup-and-lifecycle.md).
- For file validation, bounded concurrency, ingestion, and document updates,
  read [references/upload-and-indexing.md](references/upload-and-indexing.md).
- For retrieval requests, metadata filters, grounding, citations, structured
  output, and batch correlation, read
  [references/querying-and-citations.md](references/querying-and-citations.md).
- For corpus-specific chunking and metadata schema decisions, read
  [references/chunking-and-metadata.md](references/chunking-and-metadata.md).
- For symptom-led diagnosis and version-sensitive API problems, read
  [references/errors-and-troubleshooting.md](references/errors-and-troubleshooting.md).
- For estimation, quotas, guardrails, retention, and destructive cleanup, read
  [references/cost-quota-and-cleanup.md](references/cost-quota-and-cleanup.md).
- For integration tests, server/edge boundaries, streaming, and template
  status, read
  [references/testing-and-integration.md](references/testing-and-integration.md).

## Bundled resources

- [scripts/create-store.ts](scripts/create-store.ts) is a store-creation helper;
  inspect and verify it before execution.
- [scripts/README.md](scripts/README.md) documents the helper and planned work.
- [templates/README.md](templates/README.md) describes planned templates; do not
  claim those applications exist without checking the directory.
- [references/README.md](references/README.md) is the imported reference
  roadmap; the focused references above are authoritative for this skill.
- [PROJECT_STATUS.md](PROJECT_STATUS.md) records imported resource status.
- [README.md](README.md), [.claude-plugin/plugin.json](.claude-plugin/plugin.json),
  and [LICENSE](LICENSE) are package metadata, not runtime instructions.

## Official sources

- https://ai.google.dev/gemini-api/docs/file-search
- https://ai.google.dev/api/file-search/file-search-stores
- https://ai.google.dev/api/file-search/documents
- https://ai.google.dev/pricing
- https://googleapis.github.io/js-genai/

## Completion checks

- Confirm the intended store, tenant, metadata filters, and supported model.
- Verify ingestion completion and document listing before the first query.
- Test retrieval with known-answer documents and validate returned citations.
- Exercise timeouts, throttling, invalid input, missing grounding, and partial
  failures without exposing sensitive content.
- Verify cleanup behavior only in an isolated environment with explicit scope.
