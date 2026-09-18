---
name: harvesting-meeting-context
description: >
  Transcribe meeting audio or video recordings into per-meeting Markdown
  transcripts and metadata, with chunking, retries, cloud-to-local fallback,
  resumable progress, aggregate analysis, and audit output. Use when asked to
  transcribe meetings or process a folder of MP3, M4A, WAV, or MP4 recordings.
license: Proprietary
metadata:
  version: "1.1.0"
  library: "Globant AIPods team / internal"
  library-url: ""
  pack: "Consulting & Professional Services"
  author: aipods-team
  category: tooling
  tags: transcription, meetings, context-pack, audio, utility
compatibility:
  - macOS (darwin) with Homebrew
  - Linux with apt-get / dnf (best-effort)
  - python3 with pip3
  - ffmpeg + ffprobe
  - openai-whisper
  - omni_parser MCP tool (optional; local whisper fallback when absent)
---

# Harvesting meeting context

Produce source-faithful, resumable transcript artifacts rather than prose-only
summaries. Process every eligible meeting, preserve per-source traceability, and
write progress frequently enough to recover from interruption.

## Required inputs

| Parameter | Required | Default | Purpose |
|---|---:|---|---|
| `source_path` | Yes | - | Directory containing supported recordings. |
| `output_path` | Yes | - | Parent directory for indexes and batch outputs. |
| `batch_id` | No | Derived | Kebab-case namespace for this recording corpus. |
| `chunk_seconds` | No | `300` | Maximum audio segment duration. |
| `size_threshold_mb` | No | `5` | File-size trigger for chunking. |
| `duration_threshold_seconds` | No | `360` | Duration trigger for chunking. |
| `transcription_preference` | No | `auto` | `auto`, `cloud_only`, or `local_only`. |
| `whisper_model` | No | `small` | Local Whisper model. |
| `auto_install` | No | `true` | Offer assisted dependency installation when missing. |
| `recursive` | No | `false` | Traverse source subdirectories. |
| `language` | No | `auto` | Requested language or automatic detection. |
| `failure_feedback` | No | Empty | Enables targeted repair mode. |
| `retry_max` | No | `3` | Maximum retries for a transient chunk failure. |
| `min_free_disk_mb` | No | `2048` | Required measured free space. |

Abort if a required path is missing or invalid. Derive `batch_id` from the
source basename or project brief when safe; otherwise use a dated fallback and
record an open question. Never overwrite a populated batch during a normal
build.

## Essential constraints

- Write `{output_path}/_progress.json` before any other output and update it
  after every phase, item, and completed chunk.
- Never invent transcript text, speaker labels, language, duration, file
  metadata, hashes, tool versions, or completion state.
- Use only measured or tool-produced values in metadata and audits.
- Treat recordings and transcripts as potentially sensitive. Keep them within
  the authorized paths and do not send them to a cloud service unless the
  selected preference and user authorization permit it.
- Probe dependencies first. `auto_install=true` allows offering installation;
  it never authorizes package-manager, pip, model-download, or elevated
  commands. Show the exact action and obtain explicit approval immediately
  before installation.
- Bound retries and polling. Respect `cloud_only` and `local_only`; use local
  fallback after cloud failure only in `auto` mode.
- Validate every item before writing it. Represent unavailable chunks with an
  explicit marker rather than inferred content.
- Keep the state index, not transcript bodies or audio buffers, between phases.
- Resolve and verify exact temporary paths before cleanup. Never delete source
  recordings.

Read [references/state-and-output-contracts.md](references/state-and-output-contracts.md)
for the output tree, state fields, statuses, fidelity invariants, and final audit
contract.

## Workflow

### 1. Initialize and preflight

Read
[references/phase-a-environment-setup.md](references/phase-a-environment-setup.md).
Resolve build, repair, or resume mode; initialize the batch; probe tools, disk,
network, and cloud-tool availability; and stop cleanly on blockers.

The optional [install-dependencies.sh](install-dependencies.sh) is not implicitly
authorized. Inspect it and obtain explicit approval before execution because it
can install system packages and Python dependencies.

### 2. Discover and plan

Read [references/phase-b-preprocessing.md](references/phase-b-preprocessing.md).
Discover supported files deterministically, probe each with `ffprobe`, compute
source hashes, select chunking and transcription paths, and persist the complete
manifest. Skip corrupt or audio-less sources while continuing the inventory.

### 3. Transcribe each meeting

Read [references/phase-c-transcription.md](references/phase-c-transcription.md).
For each pending or repair-targeted item: reload the source, extract audio when
needed, create bounded chunks, transcribe with the selected path, retry
transient failures, apply permitted fallback, stitch timestamped segments,
write transcript and metadata, update progress, and remove only that item's
verified temporary files. Continue through independent failures.

### 4. Extract aggregate context

Read
[references/phase-d-extraction-analysis.md](references/phase-d-extraction-analysis.md).
Load one completed transcript at a time, extract only supported signals, cite
the meeting and timestamp for every finding, and write the batch's
`meeting-analysis.md`. In repair mode, run this phase only when targeted.

### 5. Validate and audit

Read [references/phase-e-output-assembly.md](references/phase-e-output-assembly.md).
Reload outputs from disk, reconcile files and counts, parse every metadata JSON,
verify source hashes and required analysis sections, write the session audit,
update `_batches.md`, and make the final action the completed `_progress.json`
write.

## Repair and downstream use

Read
[references/repair-and-integration.md](references/repair-and-integration.md) for
target syntax, collision and resume behavior, multi-batch consumption, optional
context-pack updates, and the bundled evaluation resource.

## Completion criteria

- Every discovered source has an explicit final status.
- Every completed item has a transcript and parseable metadata on disk.
- Counts in the manifest, living index, progress file, and filesystem agree.
- Actual chunk tools, retries, failures, hashes, and quality gaps are recorded.
- Aggregate claims cite their meeting sources and timestamps.
- The batch audit and top-level batch index describe the on-disk result.
- `_progress.json` is the last write and records `COMPLETED` for the active batch.
