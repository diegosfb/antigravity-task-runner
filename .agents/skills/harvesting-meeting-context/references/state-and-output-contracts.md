# State and output contracts

## Output tree

```text
{output_path}/
|-- _batches.md
|-- _progress.json
`-- batches/{batch_id}/
    |-- 00-index.md
    |-- manifest.md
    |-- transcripts/meeting-NN-{slug}.md
    |-- metadata/meeting-NN-{slug}.json
    |-- meeting-analysis.md
    `-- TRANSCRIPT-AUDIT-{batch_id}-{session_id}.md
```

Each batch has an isolated namespace. `_batches.md` indexes batches and
`_progress.json` is the stable resume anchor for the active run.

## TRANSCRIPT_INDEX

Maintain one serializable state object as the sole carry-forward contract. It
contains:

- Run identity: `session_id`, `mode`, `output_path`, `source_path`, `batch_id`,
  `batch_id_source`, and `batch_dir`.
- Effective configuration: chunk thresholds, transcription preference, Whisper
  model, language, retry limit, and installation preference.
- Dependency and preflight results, including versions, measured free space,
  tool availability, blockers, and abort reason.
- One item per source with stable ID, absolute path, slug, source hash, media
  metadata, chunk counts, actual transcription path, status, output paths,
  retries, and last error.
- Aggregate counts, analysis path, repair log, blockers, and open questions.

Never carry full audio buffers or complete transcript text between phases.
Persist state after every phase, item, and completed chunk so an interrupted run
can resume from disk.

## Statuses

| Status | Meaning |
|---|---|
| `PENDING` | Discovered but not started. |
| `PROCESSING` | Currently being transcribed. |
| `COMPLETE` | Transcript and metadata written; checks passed. |
| `COMPLETE_WITH_GAPS` | Outputs written with explicit quality notes. |
| `FAILED` | Retries and permitted fallback exhausted. |
| `SKIPPED` | Excluded during preflight or not targeted in repair. |

## Fidelity invariants

- Derive durations, formats, languages, hashes, and tool versions from probes or
  tool output; never invent them.
- Re-hash each source during final validation. A changed source becomes
  `COMPLETE_WITH_GAPS` with a quality note.
- Metadata must identify the actual tool used for every chunk. Hybrid output
  records both cloud and local paths.
- Failed chunks use an explicit `[CHUNK NN UNAVAILABLE]` marker; never infer
  missing speech from neighboring content.
- Completed items must have parseable metadata and existing transcript paths.
- Transcript timestamps must be monotonic and remain within the measured media
  duration tolerance defined in the transcription phase.

## Analysis and audit outputs

Every extracted analysis bullet cites its meeting and timestamp. The final
audit reports run identity, dependencies, preflight measurements, per-item
outcomes, repair actions, failures, and open questions. The last write of every
run sets `_progress.json` to `COMPLETED` with `completed_at` and
`current_batch_id`.
