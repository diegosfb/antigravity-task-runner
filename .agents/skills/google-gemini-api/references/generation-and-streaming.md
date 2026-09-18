# Generation and Streaming

## Request Design

Use the installed SDK's documented request shape for contents, roles, system instructions, generation configuration, and structured output. Preserve the full model turn when maintaining tool or chat history; do not reconstruct only visible text if the API requires additional parts.

Bound input size and output tokens. Validate structured output against an application schema even when the API accepts a response schema.

## Streaming

SDK streaming should use the installed version's async iteration interface and support cancellation, timeout, partial output, and final usage metadata.

For REST streaming, use the documented transport and parser. Incrementally decode multi-byte text, retain incomplete frames, validate event payloads, and flush the decoder at end-of-stream. Do not silently discard parse failures.

Decide whether partial output may be shown before safety, policy, tool, or schema validation completes. Avoid persisting an incomplete answer as final state.

## Chat State

Store only necessary history, enforce tenant isolation, cap turns or tokens, and define retention. Summarization changes semantics and should be tested. Never trust a client-provided system instruction or privileged history without authorization.

## Templates

- [streaming-chat.ts](../templates/streaming-chat.ts)

The template may contain stale SDK or model assumptions; verify it before use. Build REST streaming from current official transport documentation rather than a copied parser.
