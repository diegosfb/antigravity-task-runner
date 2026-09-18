# Errors and troubleshooting

Use symptoms to select a check; verify version-specific workarounds against the
current official documentation and SDK issue tracker.

| Symptom | Check |
|---|---|
| Document cannot be modified | Replace it through a controlled delete and re-upload workflow. |
| Quota exceeded unexpectedly | Recalculate indexed storage and token volume; do not equate them with raw file size. |
| Weak or truncated retrieval | Re-evaluate chunking, source quality, metadata filters, and known-answer probes. |
| Metadata rejected | Check current field count, supported types, lengths, and filter syntax. |
| Unexpected indexing bill | Recalculate tokens using sampled parsing rather than a fixed bytes-per-token assumption. |
| No results after upload | Confirm the operation completed and the document appears in the intended store. |
| Store deletion rejected | Determine whether documents remain; obtain authorization before any forced deletion. |
| Model/tool rejected | Verify the currently supported model and tool combination. |
| Missing title after Blob upload | Check the installed SDK version and whether display name survives the chosen upload path. |
| Missing grounding with JSON | Test response-mode compatibility; use a grounded first step if necessary. |
| Web and file tools conflict | Split them into separate requests and combine results at the application layer. |
| Batch response cannot be correlated | Retain application-side request IDs and validate ordering explicitly. |
| Polling stalls or fails | Use bounded polling, inspect operation errors, and verify the document separately. |

## Diagnostic order

1. Capture the sanitized error status, request mode, model, SDK version, and
   resource type without logging credentials or document content.
2. Reproduce with one small non-sensitive document and one known-answer query.
3. Confirm store and document resource names, operation state, and model/tool
   compatibility.
4. Remove optional response modes, streaming, batching, and filters one at a
   time to isolate the interaction.
5. Check official documentation and relevant Google SDK issues for the exact
   installed version.
6. Add a deterministic regression test for confirmed behavior.
