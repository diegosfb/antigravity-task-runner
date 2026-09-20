---
name: skill-auditor
description: Audit installed skills for authoring compliance, broken resources, exact duplicates, trigger collisions, functional overlap, caller usage, and portfolio value. Use for requests such as "check my skills", "find duplicate or unnecessary skills", "audit skill quality", or "which skills should merge". Produces a structured report with merge, sharpen, specialize, demote, retire, and removal recommendations plus a safe preservation plan.
metadata:
  version: "1.2.1"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Productivity Tools"
---

# Skill Auditor

Reviews installed skills against authoring guidelines and produces a per-skill report with a compliance verdict plus concrete improvement proposals.

## Workflow

### Step 0: Scan the complete agent-content trust boundary

Before trusting or executing installed skill content, use the shared security subskill against the whole `.agents` tree—not just the selected `SKILL.md` files:

```bash
python3 .agents/skills/agent-content-security/scripts/security_scan.py .agents \
  --format json --output /tmp/agent-content-security.json
```

Read [agent-content-security](../agent-content-security/SKILL.md) before triage. The scan is offline and must never execute inspected scripts. Review findings in context, distinguish examples from reachable behavior, warn immediately about plausible live credentials without disclosing values, and include dispositions and fingerprints in the final report.

### Step 1: Locate the skills to review

Skills live wherever the harness mounts them. Check these locations (not all exist in every environment):

- `/mnt/skills/organization/` — org-installed skills (usually the ones the user cares about)
- `/mnt/skills/user/` — the user's personal skills
- `/mnt/skills/plugins/` — plugin-bundled skills
- `/mnt/skills/public/`, `/mnt/skills/examples/` — Anthropic built-ins (audit only if asked; the user typically can't change these)
- In Claude Code / repo contexts: `.claude/skills/`, `skills/` in the project root

If the user names a specific skill or folder, scope to that. Otherwise default to organization + user + plugins, and ask before auditing built-ins.

### Step 2: Run the deterministic audit

Run the bundled script — do not hand-count characters or lines, the script is faster and exact:

```bash
python3 .agents/skills/skill-auditor/scripts/audit_skill.py <path-to-skill-or-root-folder>          # human-readable
python3 .agents/skills/skill-auditor/scripts/audit_skill.py <path-to-skill-or-root-folder> --json   # for programmatic use
```

It accepts either a single skill directory or a root folder (it discovers every `SKILL.md` beneath it) and checks, per skill:

| Check | Rule | Severity |
|---|---|---|
| frontmatter | `name` and `description` present | FAIL if missing |
| description_length | description ≤ 1024 characters | FAIL if over |
| skill_md_lines | SKILL.md < 500 lines | FAIL if over |
| total_lines | total text lines across all files | WARN if ≥ 500 (OK when progressive disclosure is real) |
| broken_references | every relative path mentioned in SKILL.md / references exists | FAIL if broken |
| orphaned_assets | bundled files under scripts/, references/, assets/ are mentioned somewhere | WARN if orphaned |

Exit code 0 = all pass, 1 = at least one FAIL. Treat WARNs as judgment calls, not violations — a large `references/` corpus that's loaded on demand is the *point* of progressive disclosure, not a defect.

### Step 2b: Check for overlapping skills

Skills compete for triggering via their descriptions: two skills with colliding descriptions means Claude picks unpredictably (or loads both, wasting context). Run:

```bash
python3 .agents/skills/skill-auditor/scripts/check_overlap.py <path> [<path> ...] [--json]
```

It compares every skill pair across all given folders and flags: **DUPLICATE** (byte-identical SKILL.md — same skill installed twice), **HIGH** (same name in two places, or description similarity ≥ 0.60), and **MODERATE** (description or body similarity ≥ 0.35). Description similarity detects trigger competition; body similarity surfaces functional-overlap candidates whose workflows use different discovery wording.

Treat each flagged pair as a candidate for the usage-aware decision in Step 2c. Byte-identical duplicates should identify the authoritative copy. Description collisions need mutual routing language when the skills are distinct; body-only similarity needs workflow and output comparison before any action.

A MODERATE flag between skills in adjacent domains (e.g., two security skills) is often fine as-is — shared vocabulary isn't overlap if the trigger *phrases*, workflows, or outputs diverge. Only act when a realistic user request could plausibly trigger either skill or their implementations substantially repeat one another.

### Step 2c: Trace usage and analyze functional overlap

Similarity is candidate generation, not the decision. For each flagged pair and each obvious domain family, read [functional-overlap-analysis.md](references/functional-overlap-analysis.md) and compare triggers, workflow, outputs, audience, lifecycle phase, resources, operational contracts, and callers.

Trace actual repository references before recommending merge, demotion, retirement, or removal:

```bash
python3 .agents/skills/skill-auditor/scripts/trace_skill_usage.py <repo-root> <skill-a> <skill-b> --json
```

Search beyond flagged pairs when the catalog or agent assignments reveal two skills with the same responsibility but different wording. Distinguish agent/workflow assignments from skill integration notes and incidental documentation. Report one of: **MERGE**, **KEEP + SHARPEN**, **KEEP SPECIALIZED**, **DEMOTE**, **RETIRE**, or **REMOVE DUPLICATE**. A removal recommendation must identify current callers and every unique script, reference, asset, configuration key, output contract, or approval behavior that must be preserved or intentionally retired.

### Step 3: Qualitative review — read each SKILL.md

The script can't judge usefulness. For each skill, read the SKILL.md body (and skim any references) and evaluate:

**Tools & execution capabilities.** A skill that only contains prose instructions makes Claude re-derive the same work every invocation. Look for:
- Repeated deterministic work described in prose (counting, parsing, converting, templating, validating) → propose a bundled `scripts/` helper so it's written once and executed, not re-reasoned.
- Steps that fetch, look up, or act on external systems → propose the matching MCP server or connector. Match against what's actually available in the environment (check the tool list / connected MCP servers) rather than suggesting hypotheticals. Common pairings:
  - Documents/policies referenced by name → Google Drive MCP (fetch current version dynamically, never hardcode content)
  - Notifications, approvals, team workflows → Slack MCP
  - Tickets/issues → Atlassian/Jira MCP
  - Design artifacts → Figma MCP
  - Diagrams the skill asks Claude to describe in text → Mermaid Chart MCP or the visualizer
  - Web lookups for volatile facts baked into the skill body → web_search at runtime instead of frozen content
- If the skill needs a tool that isn't connected, say so explicitly and note it as a setup prerequisite rather than silently assuming it.
- Flag the inverse problem too: skills that hardcode data that will go stale (versions, URLs, policy text, prices) when a tool could fetch it live.

**References & assets.** Propose additions and validate existing ones:
- SKILL.md approaching 500 lines → identify which sections are conditional/deep-dive material and propose moving them to `references/<topic>.md` with a clear pointer ("read X when Y").
- Output-producing skills (docs, decks, reports) with the template described in prose → propose an actual template file in `assets/` so output is consistent.
- Multi-domain skills (e.g., per-framework or per-cloud variants) → propose one reference file per variant so only the relevant one loads.
- Reference files >300 lines → check they have a table of contents.
- Cross-check the script's `broken_refs` and `orphans` output: broken references must be fixed (fix the path or restore the file); orphans should either be wired into SKILL.md with guidance on when to read them, or removed.

### Step 4: Generate the report

Always deliver the findings as an actual report file, not just chat text. Two-stage process:

1. **Scaffold from the audit data** — the deterministic findings are pre-filled so nothing gets transcribed by hand:

```bash
python3 .agents/skills/skill-auditor/scripts/audit_skill.py <path> --json > /tmp/audit.json
python3 .agents/skills/skill-auditor/scripts/check_overlap.py <path> --json > /tmp/overlap.json
python3 .agents/skills/skill-auditor/scripts/trace_skill_usage.py <repo-root> <candidate-skill-names...> --json > /tmp/usage.json
audit_output_dir="$(git rev-parse --show-toplevel)/tmp"
mkdir -p "$audit_output_dir"
python3 .agents/skills/skill-auditor/scripts/generate_report.py /tmp/audit.json "$audit_output_dir/skill-audit-report.md" --overlap /tmp/overlap.json --usage /tmp/usage.json --security /tmp/agent-content-security.json
```

The scaffold follows [the report output template](assets/skill-audit-report-template.md). It contains the portfolio assessment, summary table, overlap evidence, retirement/demotion candidates, inventory findings, recommended sequence, and per-skill compliance findings (failures first), with `<!-- TODO -->` blocks for qualitative judgment.

2. **Fill in every TODO block** with the Step 2c and Step 3 analysis: usage-aware overlap decisions, preservation plans, retirement/demotion candidates, inventory risks, tool and MCP opportunities, references and assets, and recommended next actions. Delete a block only if there is genuinely nothing to recommend — for a fully passing skill with no opportunities, collapse its section to one line. Don't pad. Never deliver a report with placeholders or TODO markers still in it.

In a Git repository, always save the finished report as `<repo-root>/tmp/skill-audit-report.md`; keep the intermediate JSON files in the system `/tmp`. The repository-local `tmp/` directory is the stable user-facing output location and may be Git-ignored. Present that report file to the user. If the user wants a Word or PDF version, convert from the Markdown using the relevant document skill and save the converted artifact beside the report.

### Step 5: Offer to fix

Installed skill paths are usually read-only. If the user wants fixes applied, copy the skill to a writable location (`/home/claude/<skill-name>/` or `/tmp/`), make the edits there (trim description, split SKILL.md into references, fix paths, add proposed scripts), re-run `audit_skill.py` on the copy to confirm it now passes, and deliver the updated skill folder (packaged as `.skill` if a packaging tool is available, otherwise as files).

## Judgment notes

- The 1024-char description limit is hard (the platform truncates or rejects beyond it). The 500-line limit is a strong guideline: the fix is hierarchy, not deletion — move depth into references, keep workflow in SKILL.md.
- When proposing MCP servers, usefulness beats coverage. One connector that removes a manual step is worth more than five plausible-sounding integrations. Tie every proposal to a specific sentence or step in the skill being reviewed.
- Never modify skills in place under `/mnt/skills/` — those mounts are read-only and the attempt will just fail.
- Descriptions should be a bit "pushy" (list concrete trigger phrases) because skills tend to under-trigger; if a reviewed skill has a terse one-line description, flag that as an improvement opportunity even though it passes the length check.
