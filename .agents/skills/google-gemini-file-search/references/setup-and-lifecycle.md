# Setup and store lifecycle

## Before implementation

- Verify the current `@google/genai` version, File Search API surface, supported
  models, file formats, quotas, and regional availability in official Google
  documentation.
- Read the API key from environment-backed secret storage. Never place it in
  source, commands, logs, or client-side bundles.
- Decide store ownership, environment isolation, naming, retention, and cleanup
  before uploading data.

## Lifecycle

1. Initialize `GoogleGenAI` with a server-side credential.
2. List stores with pagination and reuse an intentionally matching store, or
   create one with a stable display name.
3. Upload documents and poll each long-running operation until it succeeds,
   fails, or reaches a bounded timeout.
4. Verify indexed documents through the documents listing before querying.
5. Treat indexed documents as immutable: update by deleting and re-uploading.
6. Delete documents or stores only with explicit authorization and verified
   resource names. `force` deletion can remove indexed content transitively.

Use [../scripts/create-store.ts](../scripts/create-store.ts) as a starting point
for store creation. Read [../scripts/README.md](../scripts/README.md) before
running it. Verify its SDK calls against the installed version.

## Polling

Poll with a fixed maximum duration and a reasonable interval. Surface operation
errors; do not interpret a polling error as successful indexing. If status
retrieval times out, list the target store's documents and report the result as
indeterminate unless the expected document is present and queryable.

## Official sources

- https://ai.google.dev/gemini-api/docs/file-search
- https://ai.google.dev/api/file-search/file-search-stores
- https://ai.google.dev/api/file-search/documents
- https://googleapis.github.io/js-genai/
