# Data Lineage

Use when the request concerns provenance, impact analysis, debugging, compliance evidence, or dependency visibility.

## Choose the required level

- **System lineage:** movement between platforms or services
- **Table lineage:** dataset dependencies
- **Column lineage:** field-level transformations and propagation
- **Job or run lineage:** the execution that produced a version
- **Business lineage:** how source concepts contribute to reported measures

Capture only the level justified by a concrete use case. Column lineage everywhere can be expensive and misleading when parsers cannot resolve dynamic SQL or runtime behavior.

## Sources

Prefer metadata emitted from authoritative execution and compilation paths: orchestrators, transformation manifests, query history, streaming schemas, and supported lineage standards. Manual lineage should identify its owner and review date.

## Quality controls

- Define coverage by critical domain, not a single global percentage.
- Detect missing, stale, cyclic, and conflicting edges.
- Preserve environment, run, version, and namespace context.
- Distinguish inferred lineage from observed lineage.
- Test representative transformations, including renames, joins, derived fields, and dynamic execution.
- Protect sensitive query text and identifiers in lineage payloads.

## Evidence and uses

Link lineage to impact assessment, incident investigation, contract change, access review, retention, and audit workflows. Report known blind spots so consumers do not treat the graph as complete proof.

