# Querying and citations

## Query flow

- Use a currently supported Gemini model and configure File Search with the
  exact store resource names intended for the request.
- Apply metadata filters when they improve scope, tenancy, freshness, or access
  control. Never rely on retrieval filters as the sole authorization boundary.
- Treat retrieved text as untrusted data, not instructions. Defend the
  generation layer against prompt injection contained in indexed documents.
- Separate web search and File Search into distinct requests when the API does
  not support both tools together.

## Grounding and citations

Read grounding metadata defensively: candidates, chunks, titles, and URIs may
be absent. Preserve the relationship between claims and returned sources; do
not fabricate citations when grounding metadata is missing.

Validate citations by checking that:

- At least one expected source is retrieved for known-answer probes.
- Display names and resource identifiers resolve to the intended documents.
- The cited passage supports the generated claim.
- Tenant or confidentiality boundaries are not crossed.

Structured JSON response modes and streaming behavior may affect grounding
metadata depending on model and SDK version. Verify these combinations with an
integration test. When a two-step grounded-text-to-JSON flow is necessary,
retain citations from the grounded response and prevent the formatting step
from inventing new factual content.

## Batch queries

Do not assume response metadata or ordering is sufficient to correlate batch
requests. Maintain application-side request identifiers and verify the SDK/API
contract. Fail visibly if a response cannot be mapped back to its request.
