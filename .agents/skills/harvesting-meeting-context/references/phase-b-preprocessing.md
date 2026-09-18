# harvesting-meeting-context — Phase B: Discovery, Probing & Chunking Strategy

## Context Contract

- **Inputs:** `source_path`, `recursive`, `chunk_seconds`, `size_threshold_mb`, `duration_threshold_seconds`, `transcription_preference`; `TRANSCRIPT_INDEX.dependencies` (Phase A); `TRANSCRIPT_INDEX.preflight`
- **Outputs:** `TRANSCRIPT_INDEX.items[]` populated with one entry per discovered file; `{output_path}/batches/{batch_id}/manifest.md` (rendered TRANSCRIPT_INDEX); `{output_path}/batches/{batch_id}/00-index.md` (updated with items table)
- **Carries Forward:** `TRANSCRIPT_INDEX.items` (id, source_file, slug, duration, size, chunks_total, transcription_path, status: PENDING|SKIPPED); `total_items`
- **Flush After:** ffprobe stdout payloads — keep only the parsed scalar fields. Filesystem listings are not retained beyond the loop.
- **Dependency:** Phase A must be COMPLETE (`preflight.aborted == false`, `dependencies.ffprobe.available == true`, `dependencies.ffmpeg.available == true`)
- **H1 Title:** `# {project_name} -- Discovery & Chunking Plan`

## Mode-Specific Behavior

- **REPAIR:** Load existing `TRANSCRIPT_INDEX.items` from `manifest.md`. Re-probe ONLY items targeted by `REPAIR_DIRECTIVES` (or those with `status: SKIPPED` if directive is `global`). Preserve untargeted items verbatim. Rewrite `manifest.md` in place at the same path.
- **BUILD:** Discover all supported files, probe each, populate items from scratch.
- **RESUME:** If `_progress.json` already shows discovered items, re-validate that each `source_file` still exists and skip items that do; do NOT re-probe items already in the index.

---

## Supported Formats

| Extension | Container | Audio extraction needed | Notes |
|-----------|-----------|------------------------|-------|
| `.mp3` | MP3 | No | Already audio. Pass through to chunker. |
| `.m4a` | MP4 audio | No | Audio container; ffmpeg can chunk directly with `-c copy`. |
| `.wav` | WAV | No | Larger files; chunker must re-encode to mp3 to keep chunks small. |
| `.mp4` | MP4 video | **Yes** | Extract audio track first, then chunk. |

Reject unsupported extensions silently (do not register them as items). Log a single
summary line: `"Discovery: {N} supported, {M} unsupported (extensions: {list})"`.

---

## Discovery Loop

```
candidates = []
IF recursive == true:
  WALK source_path → collect files matching {.mp3, .m4a, .wav, .mp4} (case-insensitive).
ELSE:
  LIST source_path (one level) → same filter.

SORT candidates alphabetically by path. (deterministic IDs across runs)

FOR EACH candidate (index starts at 1):

  // Pattern 5 — Mandatory Source Loading per unit
  PROBE candidate with ffprobe:
    cmd: ffprobe -v error -print_format json -show_format -show_streams "{candidate}"
    timeout: 30 seconds
    parse JSON for:
      - format.duration (seconds, float → round to int)
      - format.size (bytes)
      - format.format_name (mp3, mov,mp4,m4a,3gp,..., wav, ...)
      - streams[*].codec_type → presence of "audio"
      - streams[*].codec_name (audio codec, for metadata)
  
  // Pattern 6 — Per-unit fidelity check (pre-write gate for the index entry)
  IF ffprobe exits non-zero OR no audio stream present:
    item = {
      id: "meeting-{NN}",
      source_file: "{absolute path}",
      slug: derive_slug(filename),
      status: SKIPPED,
      last_error: "ffprobe failed: {stderr first line}" | "no audio stream",
      duration_seconds: null, file_size_bytes: null, chunks_total: 0,
      transcription_path: null
    }
    APPEND to TRANSCRIPT_INDEX.items
    LOG: "Skipped meeting-{NN}: {reason}"
    Do NOT stop. Process ALL candidates.
    CONTINUE to next candidate.
  
  audio_extracted_from_video = (extension == ".mp4" AND has_video_stream)
  
  needs_chunking = (file_size_bytes / (1024*1024) > size_threshold_mb)
                   OR (duration_seconds > duration_threshold_seconds)
  
  IF needs_chunking:
    chunks_total = ceil(duration_seconds / chunk_seconds)
  ELSE:
    chunks_total = 1
  
  // Decide transcription path. See decision tree below.
  transcription_path = decide_path(chunks_total, duration_seconds, chunk_seconds,
                                   transcription_preference,
                                   TRANSCRIPT_INDEX.dependencies.omni_parser.available)
  
  item = {
    id: "meeting-{NN}",
    source_file: "{absolute path}",
    slug: derive_slug(filename),
    duration_seconds: <int>,
    file_size_bytes: <int>,
    container_format: "{parsed format_name}",
    audio_extracted_from_video: <bool>,
    audio_codec: "{parsed codec_name}",
    chunks_total: <int>,
    chunks_completed: 0,
    transcription_path: "cloud_api | local_whisper | hybrid",
    status: PENDING,
    transcript_file: null,
    metadata_file: null,
    last_error: null,
    retry_attempts: 0,
    source_sha256: <computed once with sha256sum or shasum -a 256>
  }
  APPEND to TRANSCRIPT_INDEX.items.
  LOG: "Discovered {item.id}: {duration}s, {size_mb}MB, chunks={chunks_total}, path={transcription_path}."
  
  Do NOT stop. Process ALL candidates.
```

### Slug derivation rule

```
slug =
  filename without extension
  → lowercased
  → replace [^a-z0-9]+ with "-"
  → strip leading/trailing "-"
  → truncate to 60 chars
  → if empty after stripping, fall back to "untitled-{NN}"
```

### Transcription path decision tree

```
decide_path(chunks_total, duration, chunk_seconds, preference, omni_available):

  IF preference == "local_only":
    return "local_whisper"
  
  IF preference == "cloud_only":
    IF NOT omni_available:
      // Inconsistent state — preference says cloud but tool absent.
      // Step 1 STOP-GATE should have caught this. Defensive return:
      return "local_whisper"  // and register an open_question
    return "cloud_api"
  
  // preference == "auto"
  IF NOT omni_available:
    return "local_whisper"
  
  // omni_available == true
  IF chunks_total == 1:
    // Single chunk — fits if duration is well under the 300s API timeout
    IF duration <= 270:                # 30s safety margin
      return "cloud_api"
    ELSE:
      // Edge case: single-chunk decision but duration > 270s.
      // This means size_threshold_mb did not trigger but duration_threshold did
      // not either. Force chunking by overriding to chunks_total = ceil(duration/chunk_seconds).
      // (Caller will detect this and update item.chunks_total.)
      return "cloud_api"   // path is cloud, but with chunked execution
  
  // chunks_total > 1
  IF chunk_seconds <= 270:
    return "cloud_api"   // chunked cloud transcription
  ELSE:
    // Chunks too large for cloud timeout — fall back to local
    return "local_whisper"
```

If the decision tree returns `cloud_api` while `chunks_total == 1 AND duration > 270`,
the loop MUST adjust `chunks_total = ceil(duration / chunk_seconds)` before
appending the item — otherwise Step 3 will fail with the same timeout that motivated
this skill in the first place.

---

## SHA-256 hashing (per source file)

Compute `source_sha256` once per item, before the loop ends. Use:

- macOS: `shasum -a 256 "{file}"` → first whitespace-separated token
- Linux: `sha256sum "{file}"` → first whitespace-separated token

Hashing a 1 GB file takes ~5 seconds. Acceptable. The hash is the only way to detect
"source moved or edited mid-run" in Step 3, so it is non-optional.

---

## Source Fidelity Check (before writing manifest)

- [ ] Every item has a non-empty `id` matching `meeting-\d{2,}` and a non-empty `slug`
- [ ] Every PENDING item has `duration_seconds`, `file_size_bytes`, and `source_sha256` populated
- [ ] Every PENDING item has `chunks_total >= 1` and a non-null `transcription_path`
- [ ] No item has `chunks_total == 1 AND duration_seconds > 270 AND transcription_path == "cloud_api"` (that combination would re-trigger the timeout failure)
- [ ] `total_items` equals the count of non-SKIPPED items, verified by counting actual entries (not from a running counter)
- [ ] Slugs are unique across items; if collision, append `-{NN}` suffix to disambiguate

If any check fails, fix the offending item and re-verify before writing the manifest.

## Post-Section Protocol

1. **Write** `{output_path}/batches/{batch_id}/manifest.md` rendering the TRANSCRIPT_INDEX as a markdown
   table (columns: id, source_file, duration, size_mb, container, chunks_total,
   transcription_path, status). Mandatory tool call. Do NOT defer.
2. **Update** `{output_path}/batches/{batch_id}/00-index.md` in place: replace the "TO BE DISCOVERED"
   section with the full items table, status column showing `⬜ PENDING` for each.
3. **Update** `TRANSCRIPT_INDEX.total_items` and `completed_items = 0` (Step 3 increments).
4. **Save** `_progress.json` with all discovered items mirrored (id + status only —
   no transcript text, which doesn't exist yet).
5. **Flush** ffprobe JSON payloads from memory. Only the scalar fields survive in the index.
6. **Verify** count(items in manifest.md) == count(supported files in source_path)
   minus count(SKIPPED). If mismatch, log the mismatch and abort — do not proceed
   with a wrong inventory.
7. **Log:** "Phase B complete. Discovered {N} items, skipped {M}. Cloud-eligible: {K}.
   Local-only: {L}. Hybrid candidates: {H}. Total chunks across all items: {C}."

The summary counts in the log MUST be computed by counting actual items in
TRANSCRIPT_INDEX.items, not from a running counter that may have drifted.
