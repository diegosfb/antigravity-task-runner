# Repair and downstream integration

## Repair mode

Repair always reuses the resolved batch namespace. Load persisted state before
acting and preserve all untargeted transcripts and metadata verbatim.

| Target | Effect |
|---|---|
| `meeting-NN <directive>` | Re-run transcription for one meeting. |
| `dependency:{name} reinstall` | With explicit installation authorization, reinstall one dependency and retry affected items. |
| `analysis regenerate` | Rebuild only the batch analysis. |
| `batch:{batch_id} <directive>` | Select a batch when the output contains several. |
| `global` | Re-run all phases for the resolved batch. |

If the target batch does not exist, abort rather than creating it. Repair must
reuse the prior `session_id` where the audit contract requires continuity.

## Build collision and resume

- A normal build must not overwrite a populated batch. Require repair mode, a
  different `batch_id`, or explicit user-directed cleanup.
- Resume from `_progress.json`, revalidate source existence and hashes, and
  restart only incomplete work. Recreate disposable chunks when necessary.
- Continue across independent item failures and report every failure in the
  final audit; do not silently declare a partial run complete.

## Downstream contract

The primary downstream artifact is:

```text
{output_path}/batches/{batch_id}/meeting-analysis.md
```

For multiple batches, consumers read `{output_path}/_batches.md`, select the
intended rows, and load the linked analyses. Preserve citations qualified by
batch, meeting, and timestamp when merging. Deduplicate equivalent findings
without discarding source attribution.

Each analysis includes `batch_id` and `source_meetings` in frontmatter. Each
metadata JSON includes `batch_id`, enabling traceability without relying only
on directory layout.

## Optional context-pack integration

If the project already maintains a `context-pack/`, record the completed batch,
outputs, blockers, and decisions in its active context and progress artifacts.
Do not create an unrelated memory-bank structure solely for this skill.

## Evaluation resource

Use [../evals/evals.json](../evals/evals.json) when evaluating skill behavior.
Keep evaluation runs isolated from real recordings and production output.
