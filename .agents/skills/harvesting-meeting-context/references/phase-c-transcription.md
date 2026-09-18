# harvesting-meeting-context — Phase C: Dual-Path Transcription, Retry & Stitching

## Context Contract

- **Inputs:** `TRANSCRIPT_INDEX.items[]` (PENDING items from Phase B), `TRANSCRIPT_INDEX.dependencies` (Phase A), `TRANSCRIPT_INDEX.config` (chunk_seconds, retry_max, language, whisper_model, transcription_preference); `REPAIR_DIRECTIVES` if any
- **Outputs:** Per item: `{output_path}/batches/{batch_id}/transcripts/{item.id}-{slug}.md` and `{output_path}/batches/{batch_id}/metadata/{item.id}-{slug}.json`. Updated `_progress.json` after every chunk. Updated `00-index.md` after every item.
- **Carries Forward:** Per-item: `chunks_completed`, `transcription_path` (may flip to "hybrid" on fallback), `status`, `transcript_file`, `metadata_file`, `last_error`, `retry_attempts`. Aggregates: `completed_items`, `failed_items`.
- **Flush After:** All chunk audio files in `.tmp/{item.id}/`, all in-memory `transcript_segments`, all whisper temp output. Cleaned per item, before moving to the next.
- **Dependency:** Phase B must be COMPLETE (`TRANSCRIPT_INDEX.items` populated, `manifest.md` written)
- **H1 Title:** `# {project_name} -- {item.id} {slug}` (per transcript file)

## Mode-Specific Behavior

- **REPAIR:** For each item, check if a `REPAIR_DIRECTIVE` targets `{item.id}` or `global`. If not, SKIP — preserve `{output_path}/batches/{batch_id}/transcripts/{item.id}-{slug}.md` and `{output_path}/batches/{batch_id}/metadata/{item.id}-{slug}.json` verbatim, do NOT re-run ffmpeg or transcription, do NOT delete the item's intermediate files (there shouldn't be any — Step 3 cleans up per item). When the directive matches, load the existing transcript and metadata from the SAME paths, re-run the targeted stage (most directives mean "re-transcribe from scratch"), rewrite both files IN PLACE.
- **BUILD:** Run all 5 stages (A: extract, B: chunk, C: transcribe, D: stitch, E: write) for every PENDING item.
- **RESUME:** If `_progress.json` shows an item with `chunks_completed > 0` AND `chunks_completed < chunks_total`, restart only the missing chunks. The chunk audio files in `.tmp/` will likely be gone after a context reset, so re-run Stage B as well — re-encoding chunks is cheap compared to re-transcribing them, and matching chunk file names by index keeps Stage C deterministic.

---

## Per-Item Transcription Loop

The full loop is described in the SKILL.md Step 3. This file specifies the
sub-stages in detail. The loop body MUST follow this order:

```
LOAD source           ← Stage 0 (Pattern 5: per-unit source load)
EXTRACT audio         ← Stage A (only if container is video)
CHUNK                 ← Stage B (only if chunks_total > 1)
TRANSCRIBE chunks     ← Stage C (with retry + fallback)
STITCH                ← Stage D
FIDELITY CHECK        ← Pattern 6 (pre-write gate)
WRITE outputs         ← Stage E
UPDATE INDEX          ← Pattern 2
UPDATE living tracker ← Pattern 7
FLUSH                 ← Pattern 1
LOG and CONTINUE      ← Anti-AP-09: Do NOT stop. Process ALL items.
```

---

## Stage A — Audio Extraction (video sources only)

```
IF item.audio_extracted_from_video == true:
  out = "{output_path}/batches/{batch_id}/.tmp/{item.id}/source.mp3"
  mkdir -p "{output_path}/batches/{batch_id}/.tmp/{item.id}"
  RUN ffmpeg -y -hide_banner -loglevel error \
             -i "{item.source_file}" \
             -vn -ac 1 -ar 16000 -b:a 64k -f mp3 \
             "{out}"
  IF ffmpeg exit code != 0:
    item.status = FAILED
    item.last_error = "audio extraction failed: {stderr first line}"
    CONTINUE to next item.
  STAGE_A_INPUT = out
ELSE:
  STAGE_A_INPUT = item.source_file   # use original directly
```

Re-encoding to mono / 16 kHz / 64 kbps mp3 keeps file size small (typically 0.5 MB
per minute) — important because each chunk gets uploaded to the cloud API.

---

## Stage B — Chunking

```
IF item.chunks_total == 1:
  chunk_files = [STAGE_A_INPUT]   # no chunking needed; entire file is one chunk
ELSE:
  chunk_dir = "{output_path}/batches/{batch_id}/.tmp/{item.id}"
  mkdir -p "{chunk_dir}"
  pattern  = "{chunk_dir}/chunk_%03d.mp3"
  
  # Use stream copy when input is already mp3 — fast and lossless.
  # Re-encode when input is wav (segment + copy doesn't work well with PCM).
  IF item.container_format starts with "mp3":
    codec_args = "-c copy"
  ELSE:
    codec_args = "-ac 1 -ar 16000 -b:a 64k"
  
  RUN ffmpeg -y -hide_banner -loglevel error \
             -i "{STAGE_A_INPUT}" \
             -f segment -segment_time {config.chunk_seconds} \
             -reset_timestamps 1 {codec_args} \
             "{pattern}"
  
  IF ffmpeg exit code != 0:
    item.status = FAILED
    item.last_error = "chunking failed: {stderr first line}"
    CONTINUE to next item.
  
  chunk_files = sorted(glob("{chunk_dir}/chunk_*.mp3"))
  
  # Pattern 6 — pre-write fidelity sub-check
  IF len(chunk_files) != item.chunks_total:
    # Off-by-one is acceptable when duration is not an exact multiple of chunk_seconds:
    # ceil() in Phase B may have rounded up while ffmpeg produced one fewer chunk.
    # Adjust item.chunks_total to match reality and continue.
    item.chunks_total = len(chunk_files)
    LOG: "{item.id}: adjusted chunks_total to {item.chunks_total} (matched ffmpeg output)"
```

`-reset_timestamps 1` makes each chunk start at t=0, which simplifies downstream
timestamp arithmetic. We re-add the offset during stitching.

---

## Stage C — Transcribe Each Chunk

Initialize:
```
transcript_segments = []   # in-memory, but per-chunk only — flush after Stage D
chunk_used_path = []       # per-chunk: which path was actually used (for hybrid metadata)
```

### C.1 Cloud API path (omni_parser)

```
FUNCTION transcribe_via_cloud(chunk_file, language, retry_max):
  attempt = 0
  WHILE attempt <= retry_max:
    TRY:
      result = omni_parser(file=chunk_file, mode="transcribe", language=language)
      # Expected result shape (best-effort across versions):
      #   { text: str, segments: [{start, end, speaker?, text}], language: str, duration: float }
      RETURN { ok: true, payload: result }
    EXCEPT:
      err_class = classify_error(exception)
      # err_class ∈ {timeout, http_5xx, http_429, http_4xx_permanent, network, unknown}
      
      IF err_class in [http_4xx_permanent]:
        RETURN { ok: false, reason: "permanent: {err_class}", payload: {stderr/excerpt} }
      
      IF err_class in [timeout, http_5xx, http_429, network, unknown]:
        attempt += 1
        IF attempt > retry_max:
          RETURN { ok: false, reason: "retries exhausted: {err_class}", payload: ... }
        # Exponential backoff: 5s, 15s, 45s ...
        sleep_seconds = 5 * (3 ** (attempt - 1))
        # On 429, honour Retry-After if present
        IF err_class == http_429 AND server provided Retry-After: sleep_seconds = max(sleep_seconds, retry_after)
        SLEEP sleep_seconds
        CONTINUE  # retry
```

`classify_error` maps the exception/HTTP code into a small, actionable set so the
retry policy can be precise:
- 4xx (other than 408/429) → permanent. No retry. Probably a malformed chunk or
  unsupported codec; falling back to whisper for the same chunk often succeeds.
- 408 / 429 / 5xx / connection reset / DNS failure / read timeout → transient. Retry
  with backoff up to `retry_max` attempts.

### C.2 Local whisper path

```
FUNCTION transcribe_via_whisper(chunk_file, language, model):
  whisper_dir = "{output_path}/batches/{batch_id}/.tmp/{item.id}/whisper_{chunk_index:03d}"
  mkdir -p "{whisper_dir}"
  
  args = [
    "whisper", "{chunk_file}",
    "--model", "{model}",
    "--output_dir", "{whisper_dir}",
    "--output_format", "json",
    "--verbose", "False",
  ]
  IF language and language != "auto":
    args += ["--language", language]
  
  RUN args with timeout = max(900, chunk_duration * 4)   # 15 min floor, 4× duration ceiling
  IF exit code != 0:
    RETURN { ok: false, reason: "whisper failed: {stderr first line}" }
  
  json_file = first file matching {whisper_dir}/*.json
  PARSE json_file → result = { text, segments: [{start, end, text}], language }
  RETURN { ok: true, payload: result }
```

Whisper has no `speaker` field by default — the metadata's `speaker_diarization`
will say `none` for whisper-produced chunks. (Optional: pyannote/whisperx can add
diarization later; out of scope for this skill's first version.)

### C.3 Per-chunk orchestration

```
FOR EACH chunk_index, chunk_file in enumerate(chunk_files):
  start_offset = chunk_index * config.chunk_seconds   # seconds
  
  IF item.transcription_path == "cloud_api":
    res = transcribe_via_cloud(chunk_file, config.language, config.retry_max)
    
    IF NOT res.ok:
      IF config.transcription_preference == "auto":
        # Per-chunk fallback to whisper. Mark item as hybrid in metadata.
        LOG: "{item.id} chunk {chunk_index}: cloud failed ({res.reason}). Falling back to whisper."
        res = transcribe_via_whisper(chunk_file, config.language, config.whisper_model)
        chunk_used_path.append("local_whisper")
        IF item.transcription_path != "hybrid":
          item.transcription_path = "hybrid"
      ELSE:
        # Cloud-only or local-only never reach here with cloud failure but
        # if cloud-only and cloud failed: mark chunk as failed.
        chunk_used_path.append("cloud_api_failed")
    ELSE:
      chunk_used_path.append("cloud_api")
  
  ELIF item.transcription_path == "local_whisper":
    res = transcribe_via_whisper(chunk_file, config.language, config.whisper_model)
    chunk_used_path.append("local_whisper")
    IF NOT res.ok:
      chunk_used_path[-1] = "local_whisper_failed"
  
  IF res.ok:
    # Apply timestamp offset so segments are anchored to the original timeline,
    # not the chunk-local timeline.
    payload_segments = [{ start: s.start + start_offset,
                          end:   s.end   + start_offset,
                          speaker: s.speaker if present else None,
                          text:  s.text } for s in res.payload.segments]
    transcript_segments.append({
      chunk_index, start_offset, segments: payload_segments,
      detected_language: res.payload.language, used_path: chunk_used_path[-1],
      raw_text: res.payload.text
    })
    item.chunks_completed += 1
  ELSE:
    transcript_segments.append({
      chunk_index, start_offset, segments: [],
      detected_language: None,
      used_path: chunk_used_path[-1],
      failure_reason: res.reason,
      raw_text: ""
    })
  
  # Pattern 7 — living tracker per chunk (cheap; users see real progress on long meetings)
  WRITE _progress.json with item.chunks_completed updated.
  
  # FLUSH per-chunk whisper temp output (Pattern 1, fine-grained):
  rm -rf "{output_path}/batches/{batch_id}/.tmp/{item.id}/whisper_{chunk_index:03d}"
  
  Do NOT stop. Process ALL chunks for this meeting.

# After the chunk loop:
chunks_failed = count(transcript_segments WHERE used_path ends with "_failed")
IF chunks_failed == item.chunks_total:
  item.status = FAILED
  item.last_error = "all chunks failed transcription"
  # Skip to cleanup — Stage D and E still write a metadata file with status: FAILED but no transcript.
ELIF chunks_failed > 0:
  # Partial — proceed to stitch with placeholders.
  pass
```

---

## Stage D — Stitching

The goal is one markdown transcript per item with monotonic timestamps and clearly
marked failures, ready for downstream consumption by `meeting-analysis.md`.

```
SORT transcript_segments by chunk_index (already in order, but be defensive).

stitched_segments = []
FOR EACH cseg in transcript_segments:
  IF cseg.segments is empty:
    # Failed chunk: insert a single placeholder segment covering the chunk window.
    stitched_segments.append({
      start: cseg.start_offset,
      end:   cseg.start_offset + config.chunk_seconds,
      speaker: None,
      text: f"[CHUNK {cseg.chunk_index:03d} UNAVAILABLE — {cseg.failure_reason}]",
      tool: cseg.used_path
    })
  ELSE:
    FOR EACH seg in cseg.segments:
      stitched_segments.append({ ...seg, tool: cseg.used_path })

# Tolerate small overlap at chunk boundaries: if next segment starts before the
# previous one ended (rounding artefact), nudge its start to prev.end + 0.001.
FOR i in range(1, len(stitched_segments)):
  prev = stitched_segments[i-1]
  cur  = stitched_segments[i]
  IF cur.start < prev.end:
    cur.start = prev.end + 0.001
    IF cur.end < cur.start:
      cur.end = cur.start
```

### Markdown rendering

Each transcript file uses this exact structure:

```markdown
---
id: {item.id}
slug: {item.slug}
source_file: {item.source_file}
source_sha256: {item.source_sha256}
duration_seconds: {item.duration_seconds}
language_detected: {majority language across segments, or "mixed"}
transcription_path: {item.transcription_path}        # cloud_api | local_whisper | hybrid
chunks_total: {item.chunks_total}
chunks_completed: {item.chunks_completed}
generated_at: {ISO 8601 UTC}
session_id: {SESSION_ID}
status: {COMPLETE | COMPLETE_WITH_GAPS | FAILED}
---

# {item.id} — {item.slug}

## Quality Notes
{Only emit this section if status != COMPLETE. List specific issues:
 - chunks_failed (with chunk indexes)
 - language mismatch (if any chunks reported a different language than the majority)
 - boundary anomalies (if any were corrected)}

## Transcript

{For each stitched segment, render one row:}

[{HH:MM:SS}] {speaker or "—"}: {text}
```

Timestamps use `HH:MM:SS` (zero-padded). Speaker is `—` when the tool didn't return
a speaker name. Each segment is a single line — multi-paragraph wrap is intentional
because downstream extraction relies on `(meeting-NN @ HH:MM:SS)` citations.

If the transcription tool returned a single `text` field with no segments (some
omni_parser modes), wrap it as one segment: `start = 0 + start_offset`, `end =
start_offset + chunk_duration`.

---

## Stage E — Write Outputs (Mandatory tool calls)

### E.1 Metadata JSON schema

`{output_path}/batches/{batch_id}/metadata/{item.id}-{item.slug}.json`:

```json
{
  "id": "{item.id}",
  "slug": "{item.slug}",
  "source_file": "{absolute path}",
  "source_sha256": "{hex}",
  "container_format": "{from ffprobe}",
  "audio_codec": "{from ffprobe}",
  "duration_seconds": {int},
  "file_size_bytes": {int},
  "language_requested": "{config.language}",
  "language_detected": "{majority lang, or 'mixed'}",
  "transcription_path": "cloud_api | local_whisper | hybrid",
  "tools": {
    "ffmpeg_version": "{from dependencies}",
    "whisper_version": "{from dependencies, or null}",
    "whisper_model":   "{config.whisper_model, or null}",
    "omni_parser":     {"used": true|false}
  },
  "chunks": [
    { "index": 0, "start_offset_seconds": 0,  "duration_seconds": {int}, "tool": "cloud_api | local_whisper | failed", "retry_attempts": {int}, "failure_reason": null }
  ],
  "chunks_total": {int},
  "chunks_completed": {int},
  "chunks_failed": {int},
  "transcript_file": "transcripts/{item.id}-{item.slug}.md",
  "generated_at": "{ISO 8601 UTC}",
  "session_id": "{SESSION_ID}",
  "status": "COMPLETE | COMPLETE_WITH_GAPS | FAILED"
}
```

### E.2 Pre-write fidelity check (Pattern 6)

Before either Write call, verify:

- [ ] `chunks_completed + chunks_failed == chunks_total` (no missing accounting)
- [ ] Last segment's `end` ≤ `duration_seconds + 5` (allow 5s rounding tolerance)
- [ ] Stitched timestamps are monotonically non-decreasing
- [ ] No segment has `text` matching a TODO/placeholder that wasn't a known failure
- [ ] `transcription_path` matches the actual paths used (`hybrid` if any chunk used a different path)
- [ ] Status field is one of {COMPLETE, COMPLETE_WITH_GAPS, FAILED}; FAILED items still get a metadata file but no transcript.md
- [ ] When `status == FAILED`, the transcript file is NOT written (only metadata is — so REPAIR can target the meeting and the audit can show the failure)

If any check fails: log a "Quality Note", upgrade status from COMPLETE to
COMPLETE_WITH_GAPS, and proceed to write. Do NOT block — the user gets *some*
transcript even when imperfect.

### E.3 Write calls

```
WRITE "{output_path}/batches/{batch_id}/transcripts/{item.id}-{item.slug}.md"   # only if status != FAILED
WRITE "{output_path}/batches/{batch_id}/metadata/{item.id}-{item.slug}.json"    # always

UPDATE TRANSCRIPT_INDEX:
  item.status            ← COMPLETE | COMPLETE_WITH_GAPS | FAILED
  item.transcript_file   ← "transcripts/{item.id}-{item.slug}.md" (or null if FAILED)
  item.metadata_file     ← "metadata/{item.id}-{item.slug}.json"
  TRANSCRIPT_INDEX.completed_items += (1 if status starts with COMPLETE else 0)
  TRANSCRIPT_INDEX.failed_items    += (1 if status == FAILED else 0)

WRITE _progress.json
WRITE/Edit "{output_path}/batches/{batch_id}/00-index.md"   # only the row for this item, in place

# Cleanup intermediate files for this item (Pattern 1)
rm -rf "{output_path}/batches/{batch_id}/.tmp/{item.id}/"

# Flush in-memory transcript state
del transcript_segments, chunk_used_path
```

`Do NOT stop. Process ALL items in TRANSCRIPT_INDEX.items WHERE status == PENDING.`
`Continue until completed_items + failed_items + (count of pre-existing SKIPPED items) == total_items.`

---

## Source Fidelity Check (per item, before completing the item)

- [ ] `metadata.tools.{ffmpeg_version, whisper_version}` come from `TRANSCRIPT_INDEX.dependencies` — not invented
- [ ] `metadata.chunks[]` has exactly `chunks_total` entries
- [ ] Every chunk entry has a `tool` field equal to one of {cloud_api, local_whisper, cloud_api_failed, local_whisper_failed}
- [ ] `transcription_path` field equals "hybrid" only if `metadata.chunks[*].tool` contains both cloud and local non-failed values
- [ ] `source_sha256` in metadata matches `item.source_sha256` (re-hash to guard against mid-run edits)
- [ ] No segment text contains the literal placeholder string from the failure template unless `chunks_failed > 0`

If a check fails, fix in-place and re-verify. If it still fails after one fix attempt, write a Quality Note and downgrade status — never silently corrupt the metadata.

## Post-Section Protocol (per item)

1. **Write** `{output_path}/batches/{batch_id}/transcripts/{item.id}-{item.slug}.md` (if not FAILED). Mandatory tool call.
2. **Write** `{output_path}/batches/{batch_id}/metadata/{item.id}-{item.slug}.json`. Mandatory tool call.
3. **Update** `TRANSCRIPT_INDEX.items[id={item.id}]` fields: `status`, `transcript_file`, `metadata_file`, `chunks_completed`, `transcription_path`, `last_error` (null on success), `retry_attempts`.
4. **Update** `TRANSCRIPT_INDEX.completed_items` and `TRANSCRIPT_INDEX.failed_items` (count from items, do NOT trust running counters).
5. **Update** `{output_path}/batches/{batch_id}/00-index.md` — replace the placeholder row for this item with `✅ COMPLETE ({chunks_completed}/{chunks_total} chunks, {duration}s, {transcription_path})` or the appropriate status icon.
6. **Save** `_progress.json` mirroring the index.
7. **Flush** `transcript_segments`, `chunk_used_path`, raw whisper json content, the stitched segments list — retain only `TRANSCRIPT_INDEX`.
8. **Cleanup** `{output_path}/batches/{batch_id}/.tmp/{item.id}/` directory.
9. **Verify** both files exist and parse (json must round-trip; markdown must contain the frontmatter + Transcript section).
10. **Log:** `"{item.id} {status} — chunks {chunks_completed}/{chunks_total}, lines {N}, path {transcription_path}, retries {retry_attempts}."`

## Post-Section Protocol (after the loop)

1. **Verify** `TRANSCRIPT_INDEX.completed_items + TRANSCRIPT_INDEX.failed_items + count(SKIPPED) == TRANSCRIPT_INDEX.total_items` — count from actual items.
2. **Update** the manifest summary row counts (do NOT use stale running counters).
3. **Log:** `"Phase C complete. Completed {N}, with-gaps {G}, failed {F}, skipped {S}, total {T}."`
