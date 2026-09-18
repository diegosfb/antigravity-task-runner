# Upload and indexing

## Upload contract

For every upload, retain a stable application-side identifier that maps the
source object to the resulting Gemini document resource. Include a useful
display name and only metadata needed for filtering, governance, or deletion.

Before upload:

- Validate file type and size against current API limits.
- Scan or otherwise validate untrusted files according to the host system's
  security policy.
- Classify the content and confirm that sending it to the configured Google
  service is permitted.
- Estimate token volume, storage, and indexing cost.
- Deduplicate using a content hash when repeated ingestion is possible.

## Safe ingestion flow

1. Open the source as a bounded stream rather than loading large files fully
   into memory.
2. Upload with an intentional display name, metadata schema, and chunking
   configuration.
3. Persist the operation and source identifiers before polling.
4. Wait for completion with a timeout and bounded retry policy.
5. Verify the indexed document and record its resource name.
6. Run a representative retrieval probe before marking ingestion complete.

Limit concurrency rather than uploading every source with unbounded
`Promise.all`. Preserve each source-to-operation association and report partial
success explicitly.

## Updating documents

Indexed documents are not assumed to support in-place content or metadata
updates. Use a controlled replacement workflow:

1. Upload and validate the replacement where the API permits both versions.
2. Switch application metadata or filters to the new document.
3. Delete the prior document only after validation and explicit authorization.

If coexistence is unavailable, document the temporary retrieval gap and make
the delete-and-reupload operation recoverable from the source of truth.
