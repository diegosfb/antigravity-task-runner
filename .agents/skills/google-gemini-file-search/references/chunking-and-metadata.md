# Chunking and metadata

## Chunking

Choose chunk size and overlap empirically using representative questions.
Smaller chunks can improve precise lookup but lose surrounding context; larger
chunks preserve narrative context but may dilute retrieval. Overlap can reduce
boundary loss while increasing storage and duplicate evidence.

Start with a documented baseline, then evaluate retrieval quality for the
actual corpus. Technical references, prose, contracts, and FAQs usually need
different settings. Do not present one token count or overlap percentage as a
universal optimum.

Measure at least:

- Recall of the expected supporting passage.
- Precision of the top retrieved chunks.
- Citation usefulness and context completeness.
- Index size, ingestion time, latency, and cost.

## Metadata design

Use a small, stable schema containing fields that drive filtering or lifecycle
management, such as tenant, document type, product, version, language, status,
effective date, and source identifier.

- Verify current field-count, type, length, and filter-syntax limits.
- Use consistent names and controlled values.
- Keep authorization in the application/service layer; metadata filters are
  defense in depth.
- Avoid embedding secrets or unnecessary personal data in metadata.
- Preserve source and version identifiers needed for replacement and deletion.
- Test filters with precedence-sensitive combinations of `AND`, `OR`, and
  parentheses before production use.

JSON-encoding several values into one field saves keys but weakens native
filtering and validation. Use it only when the field is informational rather
than queryable.
