# harvesting-meeting-context — Phase D: Context-Pack Extraction & Analysis

## Context Contract

- **Inputs:** `TRANSCRIPT_INDEX.items[]` items with `status` starting with `COMPLETE` and a populated `transcript_file`; `REPAIR_DIRECTIVES` (look for `analysis` or `global` targets)
- **Outputs:** `{output_path}/batches/{batch_id}/meeting-analysis.md` — a single aggregate file with bullets keyed to the 13 standard context-pack file names; updates `TRANSCRIPT_INDEX.aggregate_analysis_file` to that path
- **Carries Forward:** `TRANSCRIPT_INDEX.aggregate_analysis_file`; `TRANSCRIPT_INDEX.open_questions` may grow (every uncited inferred bullet is downgraded into `open_questions`)
- **Flush After:** Each transcript file's full text — load one at a time, extract per file into a small per-file structured payload, append to in-memory section bullets, then drop the transcript text. Do NOT hold all transcripts simultaneously.
- **Dependency:** Phase C must be COMPLETE for at least one item (`completed_items > 0`). If `completed_items == 0`, write a note in `meeting-analysis.md` and exit with a benign log.
- **H1 Title:** `# {project_name} -- Meeting Analysis (Context-Pack Targeted)`

## Mode-Specific Behavior

- **REPAIR:** If `REPAIR_DIRECTIVES` does not target `analysis` or `global`, SKIP entirely — preserve the existing `meeting-analysis.md` verbatim. If targeted, regenerate from scratch by re-loading every COMPLETE transcript on disk (do NOT trust prior in-memory state). Rewrite at the same path.
- **BUILD:** Generate from scratch.
- **RESUME:** Not applicable. This phase is single-shot. If interrupted, REPAIR with `analysis regenerate`.

---

## Why this phase exists

Meetings are an upstream signal for discovery-phase consumers (in this library:
`product-agent` for vision synthesis and `ba-agent` for requirements intake). The
analysis buckets bullets under standard context-pack file names (`domain.md`,
`arch-standards.md`, `tech-policy.md`, etc.) so a downstream agent can pull the
signals relevant to its phase with one read.

The output is **agent-native** — bullets, not narrative. A human reading the file
should still be able to follow it (it is, after all, derived from human meetings),
but the primary consumer is the next skill.

---

## Extraction Loop

```
extraction_buffer = empty registry keyed by context-pack section name
decisions_log     = []   # chronological list across all meetings
open_questions    = []   # explicit "?" or "we don't know" or low-confidence bullets

FOR EACH item in TRANSCRIPT_INDEX.items WHERE status starts with COMPLETE:

  // Pattern 5 — Mandatory Source Loading per unit
  LOAD "{output_path}/batches/{batch_id}/transcripts/{item.transcript_file}" → transcript_md
  PARSE frontmatter → meeting metadata; PARSE Transcript section → segments
  
  // Pattern 6 — pre-extraction fidelity check
  IF transcript_md is empty OR contains no segments:
    open_questions.append({ id: item.id, type: "transcript_empty",
                            description: "transcript file present but has no segments — extraction skipped" })
    FLUSH transcript_md from memory.
    CONTINUE.
  
  // Run the section detectors (see "Detector Catalogue" below).
  per_meeting_payload = run_detectors(item, segments)
  
  // Merge per_meeting_payload into extraction_buffer:
  FOR EACH section_name, bullets in per_meeting_payload.sections:
    extraction_buffer[section_name].extend(bullets)
  
  decisions_log.extend(per_meeting_payload.decisions)
  open_questions.extend(per_meeting_payload.open_questions)
  
  FLUSH transcript_md and segments from memory — extraction_buffer keeps only the bullet strings.
  
  Do NOT stop. Process ALL COMPLETE items.
```

`Do NOT stop. Continue until every COMPLETE item has been processed.` This is
explicit because partial analysis is worse than no analysis — the audit/output
must reflect the full corpus.

---

## Detector Catalogue (per section)

Each detector is a deterministic rule that scans `segments[].text` for keyword
patterns and emits structured bullets. Bullets MUST cite their source as
`(meeting-NN @ HH:MM:SS)`. Bullets MUST NOT paraphrase beyond what the segment
literally said — quote or near-quote, then add a one-line interpretation flagged
with `inferred:`.

### domain.md — Domain Terminology & Business Rules

Triggers:
- Capitalized noun phrases used as terms-of-art (`X is our term for Y`, `we call this Z`, `the {Term} is …`)
- Definitions: phrases following "means", "refers to", "is defined as"
- Business rules: phrases following "must", "always", "never", "cannot", "is not allowed", "is required"

Output bullets:
```
- {Term}: {definition or first usage} (meeting-NN @ HH:MM:SS)
- Rule: {paraphrase} (meeting-NN @ HH:MM:SS)  inferred: {one-line interpretation if not a direct quote}
```

### arch-standards.md — Architecture Decisions

Triggers (decision keywords): `we decided`, `we agreed`, `decision is`, `going with`, `we'll use`, `the choice is`, `we settled on`, `let's go with`. Spanish equivalents: `decidimos`, `acordamos`, `vamos con`, `optamos por`.

Output bullets, with rationale when adjacent text gives one ("because", "since", "to avoid"):
```
- Decision: {what was decided}. Rationale: {if present, else "not stated"}. (meeting-NN @ HH:MM:SS)
```

Every decision detected here is ALSO appended to `decisions_log` with full
attribution.

### tech-policy.md — Technology Choices

Triggers: vendor / tool / framework names mentioned in proximity to a decision
keyword OR in proximity to "approved", "rejected", "we will not use", "blocked by".

Capability-language note: this is the ONE section where technology names are
allowed and expected. Quote them verbatim. Do NOT add capability-language
paraphrases here — downstream skills want the exact tool name.

Output bullets:
```
- Approved: {tool/vendor} for {purpose}. (meeting-NN @ HH:MM:SS)
- Rejected: {tool/vendor} — reason: {if given}. (meeting-NN @ HH:MM:SS)
```

### security.md — Security Requirements

Triggers: `security`, `compliance`, `auth`, `encryption`, `PII`, `GDPR`, `HIPAA`, `SOC`, `audit log`, `access control`, `secret`, `vault`, `least privilege`, plus Spanish: `seguridad`, `cumplimiento`, `cifrado`.

Output bullets:
```
- Requirement: {description}. Source: {speaker if attributable, else "—"}. (meeting-NN @ HH:MM:SS)
```

### constraints.md — Hard Constraints

Triggers: `we cannot`, `the client requires`, `mandatory`, `non-negotiable`, `deadline is`, `must be done by`, `budget is`, `compliance requires`. Spanish: `no podemos`, `obligatorio`, `el cliente exige`.

Output bullets:
```
- Constraint: {paraphrase}. Type: deadline | regulatory | budget | technical | other.
  (meeting-NN @ HH:MM:SS)
```

### customer-background.md — Customer Context

Triggers: any segment where the speaker is identified as the client OR the segment
describes the client's business, market, stakeholders, motivations, or current
pain points. Use the "Quality Notes" speaker info from the transcript when
available; otherwise mark `speaker: —`.

Output bullets:
```
- Background: {paraphrase}. (meeting-NN @ HH:MM:SS)
- Pain point: {paraphrase}. (meeting-NN @ HH:MM:SS)
- Goal: {paraphrase}. (meeting-NN @ HH:MM:SS)
```

### test-standards.md — Testing & Quality

Triggers: `test`, `QA`, `coverage`, `regression`, `acceptance criteria`, `definition of done`, `quality gate`. Spanish: `prueba`, `cobertura`, `criterio de aceptación`.

Output bullets:
```
- Expectation: {description}. (meeting-NN @ HH:MM:SS)
```

### env-config.md — Environment & Configuration

Triggers: `staging`, `production`, `environment`, `config`, `cloud account`, `AWS`, `GCP`, `Azure` (the cloud names trigger configuration discussion, not vendor selection — those go to tech-policy). Also: ports, hostnames, region names, env-vars.

Output bullets:
```
- Env: {detail}. (meeting-NN @ HH:MM:SS)
```

### best-practices.md — Cross-Cutting Practices

Triggers: `best practice`, `convention`, `standard`, `we always do`, `our team rule is`. Spanish: `convención`, `regla del equipo`.

Output bullets:
```
- Practice: {description}. (meeting-NN @ HH:MM:SS)
```

### coding-standards.md — Code Style

Triggers: `lint`, `format`, `code review rule`, `naming convention`, `commit message`, `branch strategy`.

Output bullets:
```
- Standard: {description}. (meeting-NN @ HH:MM:SS)
```

### Decisions Log (chronological)

Aggregated from `arch-standards.md` and `tech-policy.md` detectors. One row per
decision, sorted by (meeting_id, timestamp).

### Open Questions

Triggers: literal `?`, phrases `we don't know`, `to be confirmed`, `TBD`, `we'll figure out`, `let's discuss later`, plus any inferred bullet flagged at extraction time as low-confidence.

Output bullets:
```
- Q: {question}. Raised by: {speaker}. (meeting-NN @ HH:MM:SS)
```

---

## Output File Template

`{output_path}/batches/{batch_id}/meeting-analysis.md`:

```markdown
---
generated_at: {ISO 8601 UTC}
session_id: {SESSION_ID}
batch_id: {batch_id}                         # carries forward to downstream consumers
batch_id_source: {param | source_path_basename | project_brief | default_fallback}
source_meetings: {count of items processed}
detectors_run: {count of detectors that produced ≥ 1 bullet}
---

# {project_name} -- Meeting Analysis (Context-Pack Targeted)

## For domain.md

### Domain Terms Introduced
{list of bullets from domain.md domain-terms detector, sorted by (meeting_id, timestamp)}

### Business Rules Mentioned
{list of bullets from domain.md business-rules detector}

## For arch-standards.md

### Architecture Decisions Made
{...}

## For tech-policy.md

### Technology Choices Discussed
{...}

## For security.md

### Security Requirements Raised
{...}

## For constraints.md

### Hard Constraints Mentioned
{...}

## For customer-background.md

### Customer Context and Goals
{...}

## For test-standards.md

### Quality and Testing Expectations
{...}

## For env-config.md

### Environment and Configuration Details
{...}

## For best-practices.md

### Team Conventions and Practices
{...}

## For coding-standards.md

### Code Style and Workflow Standards
{...}

## Decisions Log
{chronological table:}
| When | Meeting | Decision | Rationale | Source |
|------|---------|----------|-----------|--------|

## Open Questions
{bullet list with citations}

## Meeting Sources
{table:}
| ID | File | Duration | Path | Status |
|----|------|----------|------|--------|
| meeting-01 | {source_file} | {duration} | {transcription_path} | {status} |
```

If a detector produced **zero** bullets across all meetings, render the section
with a single line: `_No findings detected across {N} meetings._` Do NOT omit the
section — downstream skills look for the section heading by exact match.

---

## Source Fidelity Check (before writing meeting-analysis.md)

- [ ] Every bullet has a citation `(meeting-NN @ HH:MM:SS)` matching an existing item's `id` and a timestamp ≤ the item's `duration_seconds`
- [ ] No bullet contains a hallucinated meeting id (only ids in TRANSCRIPT_INDEX.items)
- [ ] No bullet paraphrases beyond what the segment literally said (every non-quote bullet is flagged `inferred:`)
- [ ] Decisions Log entry count == count of "Decision:" bullets across `arch-standards.md` and `tech-policy.md` sections combined (verify by counting actuals, not running counter)
- [ ] Frontmatter `source_meetings` matches `len(items WHERE status starts with COMPLETE)` — counted, not memorized
- [ ] Every section heading from the template is present (even when empty)

If any check fails: fix in place; if it still fails after one fix attempt, register an `open_questions` entry of type `analysis_self_check` and proceed.

## Post-Section Protocol

1. **Write** `{output_path}/batches/{batch_id}/meeting-analysis.md`. Mandatory tool call. Do NOT defer.
2. **Update** `TRANSCRIPT_INDEX.aggregate_analysis_file = "meeting-analysis.md"`.
3. **Update** `TRANSCRIPT_INDEX.open_questions` with everything `open_questions` registered above (deduplicate by content).
4. **Update** `{output_path}/batches/{batch_id}/00-index.md` with a row indicating analysis status: `✅ COMPLETE ({N} sections, {M} bullets, {K} open questions)`.
5. **Save** `_progress.json` mirroring updated index.
6. **Flush** `extraction_buffer`, `decisions_log`, `open_questions` from active memory — they are now persisted on disk.
7. **Verify** the file exists, is non-empty, contains all 11 section headings (10 context-pack sections + Decisions Log + Open Questions + Meeting Sources = 13 H2 headings actually; double-check the template).
8. **Log:** `"Phase D complete. Analyzed {N} meetings. Bullets: {total}. Decisions: {D}. Open questions: {Q}."`
