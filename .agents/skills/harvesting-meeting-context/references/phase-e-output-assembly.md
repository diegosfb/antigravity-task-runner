# harvesting-meeting-context — Phase E: Validation, Audit & Final Assembly

## Context Contract

- **Inputs:** All files written in Phases A–D loaded fresh from disk (NOT from memory): `manifest.md`, `00-index.md`, `transcripts/*.md`, `metadata/*.json`, `meeting-analysis.md` (if present); `TRANSCRIPT_INDEX` (in memory)
- **Outputs:** `{output_path}/batches/{batch_id}/TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md`; final `{output_path}/_progress.json` with `status: COMPLETED`; updated `{output_path}/batches/{batch_id}/00-index.md` summary header; Memory Bank writes (`context-pack/active-context.md`, `context-pack/progress.md` — only if the project maintains a `context-pack/` directory)
- **Carries Forward:** Nothing — this is the final phase. All state on disk.
- **Flush After:** All transcript and metadata file content after the validation pass. The audit is written from `TRANSCRIPT_INDEX` aggregates plus the validation report, so transcripts can be flushed once their checks pass.
- **Dependency:** Phases C and D must be COMPLETE (Phase D may have been SKIPPED in REPAIR; that is acceptable).
- **H1 Title:** `# {project_name} -- Transcription Audit ({SESSION_ID})`

## Mode-Specific Behavior

- **REPAIR:** Load the existing `TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md` and APPEND a new "Repair Run" section at the end (with timestamp, directives applied, items touched). Do NOT overwrite the original audit. Update the front-matter `last_repair_at` field. Rewrite at the same path.
- **BUILD:** Generate a fresh audit from scratch using the template below.
- **VALIDATE-ONLY:** (Not part of this skill's core mode set, but if `failure_feedback == "validate-only"` is passed, run the validation gate and write the audit with `status: VALIDATED_ONLY`; do not modify any other file.)

---

## Validation Gate

Load all final outputs from disk. Run each check sequentially. Each FAIL gets one
fix attempt; if the fix succeeds, log it; if it still fails, register an open
issue and continue (a single broken transcript should not abort the whole run).

### Check 1 — File presence parity

```
expected_transcripts = items WHERE status starts with COMPLETE
actual_transcripts   = listing of {output_path}/batches/{batch_id}/transcripts/*.md
expected_metadata    = items WHERE status in {COMPLETE, COMPLETE_WITH_GAPS, FAILED}
actual_metadata      = listing of {output_path}/batches/{batch_id}/metadata/*.json

ASSERT count(actual_transcripts) == count(expected_transcripts)
ASSERT count(actual_metadata)    == count(expected_metadata)

For each expected file:
  ASSERT exists on disk
  ASSERT non-empty (size > 0)
```

If a transcript is missing for an item with COMPLETE status: downgrade the item
to FAILED with `last_error = "post-write disappearance"` and continue.

### Check 2 — Metadata JSON validity

For each `metadata/*.json`:
- Parses cleanly (json.load equivalent succeeds)
- Has all required keys: `id`, `slug`, `source_file`, `source_sha256`,
  `duration_seconds`, `transcription_path`, `chunks_total`, `chunks_completed`,
  `chunks_failed`, `tools`, `transcript_file`, `generated_at`, `session_id`, `status`
- `chunks_completed + chunks_failed == chunks_total`
- `tools.ffmpeg_version` matches `TRANSCRIPT_INDEX.dependencies.ffmpeg.version`
- `session_id` matches the current `SESSION_ID`

### Check 3 — Transcript structural sanity

For each `transcripts/*.md`:
- Starts with a YAML frontmatter block delimited by `---`
- Frontmatter contains `id`, `source_sha256`, `transcription_path`, `status`
- Has a `## Transcript` H2 heading
- At least one segment line matching `^\[\d{2}:\d{2}:\d{2}\]` (unless status == FAILED, in which case there should be no transcript file at all — see Check 1)

### Check 4 — Source file integrity (mid-run drift detection)

For each item with status starting with COMPLETE:
```
re_hash = sha256({item.source_file})
IF re_hash != metadata.source_sha256:
  downgrade transcript status to COMPLETE_WITH_GAPS
  add open_question: { type: "source_drift", item: item.id,
                       description: "source file hash changed during run" }
```
This detects the case where someone edited or moved a source file mid-transcription.
The transcript is still valid evidence of *what was transcribed*, but the user
should know the source has drifted from it.

### Check 5 — Summary count parity (anti-AP-08)

```
actual_completed = count(items WHERE status starts with COMPLETE)
actual_failed    = count(items WHERE status == FAILED)
actual_skipped   = count(items WHERE status == SKIPPED)

ASSERT TRANSCRIPT_INDEX.completed_items == actual_completed
ASSERT TRANSCRIPT_INDEX.failed_items    == actual_failed
ASSERT total_items == actual_completed + actual_failed + actual_skipped

IF mismatch: fix index counts to match actuals (do NOT trust the running counters);
log the discrepancy as a fixed anti-pattern in the audit.
```

### Check 6 — Analysis section coverage (only if Phase D ran)

If `TRANSCRIPT_INDEX.aggregate_analysis_file` is set:
- The file exists at `{output_path}/batches/{batch_id}/meeting-analysis.md`
- The 13 expected H2 headings (10 context-pack + Decisions Log + Open Questions + Meeting Sources) are all present, even if a section says "_No findings detected._"
- Frontmatter `source_meetings` matches Phase D's actual processed count.

If any check FAILS, fix the file (re-run the section template's empty-state path) and re-verify.

---

## Audit File Template

`{output_path}/batches/{batch_id}/TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md`:

```markdown
---
session_id: {SESSION_ID}
mode: {BUILD | REPAIR}
status: {COMPLETE | COMPLETE_WITH_GAPS | ABORTED_PREFLIGHT | PARTIAL}
generated_at: {ISO 8601 UTC}
last_repair_at: {set on REPAIR runs, else null}
source_path: {absolute path}
output_path: {absolute path}
total_items: {N}
completed_items: {N}
completed_with_gaps_items: {N}
failed_items: {N}
skipped_items: {N}
---

# {project_name} -- Transcription Audit ({SESSION_ID})

## Session Summary

| Field | Value |
|-------|-------|
| Session ID | {SESSION_ID} |
| Mode | {BUILD | REPAIR} |
| Started | {ISO} |
| Completed | {ISO} |
| Duration | {hh:mm:ss wall clock} |
| Source path | {source_path} |
| Output path | {output_path} |
| Items processed | {N} |
| Cloud-only chunks | {C} |
| Local-only chunks | {L} |
| Hybrid items (mixed paths) | {H} |
| Total retries used | {R} |

## Dependencies Report

| Tool | Available | Version | Installed by skill | Install log path |
|------|-----------|---------|-------------------|------------------|
| ffmpeg | ✅ / ❌ | x.y.z | yes / no | .audit/install-logs/ffmpeg.log (if any) |
| ffprobe | ... | ... | ... | ... |
| python3 | ... | ... | ... | ... |
| openai-whisper | ... | ... | ... | ... |
| omni_parser | ... | (n/a) | (n/a) | reason if absent |

## Pre-flight

| Check | Result |
|-------|--------|
| Free disk MB | {value} (threshold: {threshold}) |
| Network reachable to cloud API | {bool / skipped} |
| omni_parser available | {bool} |
| Aborted before items processed | {bool — true means STOP-GATE fired} |

## Per-Item Results

| ID | Source file | Duration | Path | Status | Chunks (done/total) | Retries | Last error |
|----|-------------|----------|------|--------|---------------------|---------|-----------|
| meeting-01 | ... | 28m 14s | cloud_api | ✅ COMPLETE | 6/6 | 0 | — |
| meeting-02 | ... | 47m 02s | hybrid | ⚠️ COMPLETE_WITH_GAPS | 9/10 | 4 | chunk 7 failed both paths |
| meeting-03 | ... | n/a | n/a | ⏭️ SKIPPED | 0/0 | 0 | no audio stream |

## Failure Analysis

For each FAILED or COMPLETE_WITH_GAPS item, list:
- The chunks that failed
- The classification (timeout, http_5xx, codec_error, retries_exhausted, source_drift, …)
- Whether fallback was attempted
- The recommended REPAIR directive (e.g., `meeting-02 retry transcription`)

## REPAIR Log

Only present if `mode == REPAIR`:

| When | Directive | Target | Outcome |
|------|-----------|--------|---------|
| ... | ... | meeting-02 | succeeded / still failing |

## Validation Checks

| Check | Status | Notes |
|-------|--------|-------|
| File presence parity | ✅ | — |
| Metadata JSON validity | ✅ | — |
| Transcript structural sanity | ✅ | — |
| Source-file integrity (mid-run drift) | ⚠️ | meeting-02 source hash changed |
| Summary count parity | ✅ | — |
| Analysis section coverage | ✅ / skipped | — |

## Open Questions

| ID | Type | Description |
|----|------|-------------|

## Files Written

| Path | Lines | Status |
|------|-------|--------|
| 00-index.md | {N} | ✅ |
| manifest.md | {N} | ✅ |
| transcripts/meeting-01-...md | {N} | ✅ |
| metadata/meeting-01-....json | — | ✅ |
| meeting-analysis.md | {N} | ✅ / skipped |
| TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md | {self} | ✅ |
```

The status icons in the per-item table use `✅`, `⚠️`, `❌`, `⏭️` for visual scanning;
the `status` field in the frontmatter remains plain English (no emoji) so
downstream parsing is robust.

---

## Source Fidelity Check (before writing audit)

- [ ] Every count in tables comes from counting actual on-disk artifacts (lengths,
  globs), not from running counters in `TRANSCRIPT_INDEX` — the index counts are
  also written, but only after the actuals confirm them.
- [ ] Dependency table rows reflect `TRANSCRIPT_INDEX.dependencies` — no invented tool versions.
- [ ] Every per-item row has a `status` matching the metadata JSON's `status` (re-read each metadata file to verify).
- [ ] No row references an item ID not present in `TRANSCRIPT_INDEX.items`.
- [ ] The audit does NOT contain hardcoded vendor / framework names outside the
  Dependencies table or the per-item Path column. Tech-policy bullets remain in
  `meeting-analysis.md`.
- [ ] When REPAIR mode: the original audit body is preserved verbatim; only the
  "Repair Run" appendix is added.

If any check fails, fix in place and re-verify.

## Post-Section Protocol

1. **Write** `{output_path}/batches/{batch_id}/TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md`. Mandatory tool call. Do NOT defer.
2. **Update** `{output_path}/batches/{batch_id}/00-index.md` header with the final summary line:
   `Run complete. {N} transcripts ({W} with gaps, {F} failed, {S} skipped). Audit: TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md.`
3. **Save** final `_progress.json` with `status: COMPLETED`, `completed_at: <ISO>`, all items mirrored.
4. **Memory Bank — session-end writes (only if the project maintains a `context-pack/` directory; otherwise skip — the audit file is the durable record):**
   - **Overwrite** `context-pack/active-context.md` with: session id, mode, status, key decisions (e.g., dependencies installed, fallbacks taken), blockers (any FAILED items), and the list of transcript paths produced.
   - **Append** one milestone row to `context-pack/progress.md`:
     `| {SESSION_ID} | {date} | harvesting-meeting-context | {mode} | COMPLETE | **{N} transcripts ({W} with gaps), 1 analysis** | {summary one-liner} |`
5. **Flush** all loaded transcript/metadata content from active context.
6. **Verify** all output files exist, are non-empty, and parse where applicable.
7. **Log:** `"Phase E complete. Audit: TRANSCRIPT-AUDIT-{batch_id}-{SESSION_ID}.md. Summary: {N} ok, {W} with gaps, {F} failed, {S} skipped. Dependencies: {auto_installed}/{required} auto-installed."`

## LAST ACTION — MANDATORY

This is the very last action of the entire skill run, executed even if validation
flagged issues that did not abort the run:

```
WRITE _progress.json with:
  status: COMPLETED
  completed_at: <ISO 8601 UTC>
  total: TRANSCRIPT_INDEX.total_items
  completed: TRANSCRIPT_INDEX.completed_items + completed_with_gaps_items
  items: mirror of TRANSCRIPT_INDEX.items (id + status only)
```

Without this, the orchestrator may consider the skill still RUNNING and either
re-trigger it or send SIGINT during cleanup.
