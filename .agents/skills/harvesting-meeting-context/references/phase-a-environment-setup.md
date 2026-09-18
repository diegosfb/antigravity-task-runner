# harvesting-meeting-context — Phase A: Environment Setup & Dependency Installation

## Context Contract

- **Inputs:** `source_path`, `output_path`, `auto_install`, `transcription_preference`, `min_free_disk_mb`, `whisper_model`, host platform (auto-detected via `uname -s`)
- **Outputs:** `TRANSCRIPT_INDEX.dependencies.{ffmpeg, ffprobe, whisper, python3, omni_parser}` populated; `TRANSCRIPT_INDEX.preflight` populated; `{output_path}/batches/{batch_id}/00-index.md` (initial header)
- **Carries Forward:** `TRANSCRIPT_INDEX` with full dependency state machine + preflight booleans; install logs persisted in audit
- **Flush After:** Probe stdout/stderr buffers for each tool — only the parsed availability + version survives in the index
- **Dependency:** Step 1 must be COMPLETE (session initialized, STOP-GATE passed); `_progress.json` already on disk
- **H1 Title:** `# {project_name} -- Environment Setup`

## Mode-Specific Behavior

- **REPAIR:** Load `TRANSCRIPT_INDEX.dependencies` from `manifest.md`. If a `REPAIR_DIRECTIVE` targets `dependency:{name} reinstall`, force re-install that one tool — preserve the other dependency states verbatim. Rewrite the manifest in place. If no dependency directive, SKIP this phase entirely and re-use the prior dependency state.
- **BUILD:** Run the full probe → install → verify state machine for every required tool.
- **RESUME:** If `_progress.json.dependencies` shows all tools `available: true`, skip to Step 2. Otherwise resume from the first tool with `available: false`.

---

## Required Tools — Detection & Install Matrix

| Tool | Probe Command | macOS Install | Linux (apt) Install | Linux (dnf) Install | Verification |
|------|---------------|---------------|---------------------|---------------------|--------------|
| ffmpeg | `ffmpeg -version` | `brew install ffmpeg` | `sudo apt-get install -y ffmpeg` | `sudo dnf install -y ffmpeg` | `ffmpeg -version` exits 0 |
| ffprobe | `ffprobe -version` | (bundled with ffmpeg) | (bundled) | (bundled) | `ffprobe -version` exits 0 |
| python3 | `python3 --version` | (preinstalled) | `sudo apt-get install -y python3 python3-pip` | `sudo dnf install -y python3 python3-pip` | `python3 --version` exits 0 |
| openai-whisper | `command -v whisper && whisper --help` | `pip3 install --user openai-whisper` | `pip3 install --user openai-whisper` | `pip3 install --user openai-whisper` | `whisper --help` exits 0 |
| omni_parser (MCP) | check whether the tool is callable in this runtime | N/A — provided by harness | N/A | N/A | the tool name is present in available tools |

The cloud `omni_parser` is **not** installable by this skill — it is a harness-side MCP
tool. If unavailable, the skill records `omni_parser.available = false` with a reason
and downgrades to `local_only` when `transcription_preference == auto`.

---

## Auto-Install State Machine

Run this loop sequentially (NOT in parallel — Homebrew and pip are serialized):

```
PLATFORM = uname -s            # Darwin | Linux
HAS_BREW = command -v brew     # for macOS
PKG_MGR  = on Linux, prefer apt-get; fallback to dnf; fallback to "unknown"

FOR EACH tool in [ffmpeg, ffprobe, python3, whisper]:

  // Pattern 5 — Mandatory Source Loading per unit:
  // freshly probe each tool. Do NOT trust the result of a previous tool's probe.
  PROBE: run the probe command from the matrix above with a 10-second timeout.
  
  IF probe succeeds:
    PARSE version from stdout (first line, regex {tool}\s+version\s+(\S+))
    UPDATE TRANSCRIPT_INDEX.dependencies.{tool} = {
      available: true,
      version: <parsed>,
      installed_by_skill: false,
      install_log: ""
    }
    LOG: "{tool} present: {version}"
    CONTINUE to next tool.
  
  IF probe fails AND auto_install == false:
    UPDATE TRANSCRIPT_INDEX.blockers += {
      tool: "{tool}",
      reason: "missing and auto_install=false",
      remediation: "<exact platform install command from matrix>"
    }
    UPDATE TRANSCRIPT_INDEX.preflight.aborted = true
    UPDATE TRANSCRIPT_INDEX.preflight.abort_reason = "missing dependency: {tool}"
    LOG: "BLOCKER: {tool} missing. Run: <exact command>. Aborting."
    BREAK — do NOT attempt remaining tools; abort cleanly so the user has a single
    error to react to rather than a cascade.
  
  IF probe fails AND auto_install == true:
    REQUEST explicit user authorization before running any package-manager or
    pip installation command. Show the exact command, target package, expected
    download or disk impact when known, and whether elevated privileges are
    required. `auto_install=true` enables this assisted path; it does not grant
    permission by itself.
    IF authorization is denied or unavailable:
      RECORD a blocker with the exact manual remediation command and ABORT.

    SELECT install_command per platform:
      Darwin + HAS_BREW → brew variant from matrix
      Darwin + !HAS_BREW → record blocker "Homebrew required for unattended install on macOS"; ABORT
      Linux + apt-get → apt variant
      Linux + dnf → dnf variant
      Linux + neither → record blocker "no supported package manager"; ABORT
    
    AFTER authorization, RUN install_command non-interactively:
      - Pass non-interactive flags: `-y` for apt/dnf, `--quiet` for brew if available.
      - Capture full stdout+stderr to install_log (cap at 8KB; truncate from middle).
      - Set timeout: ffmpeg install 5 minutes, whisper pip install 8 minutes (the
        whisper install pulls torch which is large).
      - Do not prompt inside the package manager. If sudo is required and the
        runtime is non-interactive (no controlling terminal), record blocker
        "sudo required for {pkg_mgr}" and ABORT.
    
    AFTER install:
      RE-PROBE (Pattern 6 — pre-write fidelity check before marking as available):
        IF re-probe succeeds:
          UPDATE TRANSCRIPT_INDEX.dependencies.{tool} = {
            available: true,
            version: <parsed>,
            installed_by_skill: true,
            install_log: <captured>
          }
          LOG: "{tool} installed by skill: {version}"
        ELSE:
          UPDATE TRANSCRIPT_INDEX.blockers += {
            tool: "{tool}",
            reason: "install command exited 0 but re-probe still fails",
            install_log: <captured>
          }
          UPDATE TRANSCRIPT_INDEX.preflight.aborted = true
          BREAK.
  
  Do NOT stop. Process ALL tools unless an abort condition triggered.
```

**Special case — whisper model download:** the first run of `whisper` for a given
model downloads weights to `~/.cache/whisper/`. To make the run truly unattended,
warm the cache after install with a 1-second silent input:

```
ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=16000 -t 1 \
       {output_path}/batches/{batch_id}/.tmp/silence.wav  -y
whisper {output_path}/batches/{batch_id}/.tmp/silence.wav --model {whisper_model} \
        --output_dir {output_path}/batches/{batch_id}/.tmp/whisper_warmup --output_format txt
rm -rf {output_path}/batches/{batch_id}/.tmp/whisper_warmup {output_path}/batches/{batch_id}/.tmp/silence.wav
```

Run the warmup ONLY when `whisper.installed_by_skill == true` OR
`transcription_preference == local_only`. Skip otherwise to avoid unnecessary
download time.

---

## Pre-flight Checks

After dependency resolution, run these checks. All record into `TRANSCRIPT_INDEX.preflight`.

### 1. Free disk space

```
free_mb = stat -f -c '%a*%S/1024/1024' {output_path}    # macOS uses statfs
                                                         # Linux: df -m {output_path}
TRANSCRIPT_INDEX.preflight.free_disk_mb = free_mb
IF free_mb < min_free_disk_mb:
  blockers += { reason: "insufficient disk: {free_mb}MB < {min_free_disk_mb}MB",
                remediation: "free disk under {output_path} or pass min_free_disk_mb=lower" }
  preflight.aborted = true
```

### 2. Network reachability (only if cloud path may be used)

```
IF transcription_preference != local_only:
  curl -sS --max-time 8 -o /dev/null -w "%{http_code}" \
       https://api.clients.geai.globant.com/health   # or the omni_parser host equivalent
  network_reachable = (http_code in 200..399)
ELSE:
  network_reachable = "skipped"
TRANSCRIPT_INDEX.preflight.network_reachable_to_api = network_reachable
```

A 4xx response still counts as reachable (network is fine; auth/path may differ).
Only timeouts and 5xx are treated as unreachable.

### 3. omni_parser tool availability (capability-language probe)

```
TRY: list the runtime's available tools or attempt a minimal no-op call.
IF omni_parser is callable: dependencies.omni_parser.available = true
ELSE: dependencies.omni_parser.available = false
      dependencies.omni_parser.reason_unavailable = "<runtime reason or 'tool not bound in this session'>"
```

Do NOT assume cloud unreachable just because `omni_parser` is missing — they are
independent signals. The `transcription_path` decision in Step 2 considers both.

---

## Source Fidelity Check (before writing manifest header)

- [ ] Every required tool has a `dependencies.{tool}` entry with `available` (true|false) and a non-null version-or-null
- [ ] Every install_log is captured for any tool with `installed_by_skill == true`
- [ ] `preflight.free_disk_mb` is a real measurement, not a default value
- [ ] `preflight.network_reachable_to_api` is set unless `transcription_preference == local_only`
- [ ] Blockers list is empty IFF `preflight.aborted == false`
- [ ] No tool/framework names appear outside the dependency table (technology-neutral elsewhere)

If any check fails, fix the index entry and re-verify before proceeding to Step 2.

## Post-Section Protocol

1. **Write** the initial header to `{output_path}/batches/{batch_id}/00-index.md` with mode, session,
   started timestamp, dependency table (one row per tool with status icon), preflight
   table, and an empty items table marked "[ ] TO BE DISCOVERED". Mandatory tool call.
2. **Update** `TRANSCRIPT_INDEX.dependencies` and `TRANSCRIPT_INDEX.preflight` with all
   probe and install results.
3. **Update** progress tracker entry `STEP-1` in `_progress.json` → `"COMPLETE"` with
   metrics: `{ "deps_present": N, "deps_installed": M, "blockers": K }`.
4. **Save** `_progress.json` to disk. Save `TRANSCRIPT_INDEX` (rendered as `manifest.md`
   stub for now — full manifest is written in Step 2 after items are discovered).
5. **Flush** install_log strings from active context if combined size > 16KB. Persist
   them to `{output_path}/.audit/install-logs/` so the final audit can include them
   without re-running probes.
6. **Verify** `{output_path}/batches/{batch_id}/00-index.md` exists, is non-empty, contains a row for
   every required tool, and `_progress.json` shows `STEP-1: COMPLETE`.
7. **Log:** "Phase A complete. Tools available: {N}/{required}. Installed: {M}. Blockers: {K}."

## STOP-GATE for this phase

If `TRANSCRIPT_INDEX.preflight.aborted == true`, do NOT proceed to Step 2.
Write the audit (Step 5 template, with `status: ABORTED_PREFLIGHT`) and exit cleanly.
Do NOT attempt to discover items or transcribe — there is no point if a required tool
is missing and could not be installed.
