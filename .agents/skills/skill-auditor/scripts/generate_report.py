#!/usr/bin/env python3
"""
generate_report.py — Build a markdown audit report from audit_skill.py JSON output.

Usage:
    python3 audit_skill.py <path> --json > /tmp/audit.json
    python3 check_overlap.py <path> --json > /tmp/overlap.json   (optional)
    python3 generate_report.py /tmp/audit.json <output.md> [--overlap /tmp/overlap.json] [--usage /tmp/usage.json] [--security /tmp/security.json] [--title "Skill Audit"]

Produces a report with:
  - A portfolio assessment for overlap decisions, retirement/demotion candidates,
    inventory risks, and an ordered remediation sequence
  - A summary table across all skills (verdict, desc chars, lines, broken refs, orphans)
  - A per-skill section with every non-passing finding spelled out
  - Clearly marked TODO blocks for the qualitative sections (tool/MCP opportunities,
    references & assets, next actions) that the reviewing agent fills in afterward.

The script deliberately does NOT invent recommendations — deterministic findings come
from the audit, judgment comes from the agent. Fill every <!-- TODO --> block before
delivering the report; delete a block only if there is genuinely nothing to say.
"""

import json
import re
import sys
from datetime import date


def get_check(result, name):
    for c in result["checks"]:
        if c["check"] == name:
            return c
    return {"status": "-", "detail": "-"}


def extract_num(detail, pattern):
    m = re.search(pattern, detail)
    return m.group(1) if m else "-"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(2)
    json_path, out_path = args[0], args[1]
    title = "Skill Audit"
    if "--title" in sys.argv:
        title = sys.argv[sys.argv.index("--title") + 1]
    overlap = None
    if "--overlap" in sys.argv:
        with open(sys.argv[sys.argv.index("--overlap") + 1], "r", encoding="utf-8") as f:
            overlap = json.load(f)
    usage = None
    if "--usage" in sys.argv:
        with open(sys.argv[sys.argv.index("--usage") + 1], "r", encoding="utf-8") as f:
            usage = json.load(f)
    security = None
    if "--security" in sys.argv:
        with open(sys.argv[sys.argv.index("--security") + 1], "r", encoding="utf-8") as f:
            security = json.load(f)

    with open(json_path, "r", encoding="utf-8") as f:
        results = json.load(f)

    lines = [f"# {title} — {date.today().isoformat()}", ""]

    # Overall verdict counts
    n = len(results)
    n_fail = sum(1 for r in results if r["verdict"] == "FAIL")
    n_warn = sum(1 for r in results if r["verdict"] == "WARN")
    n_pass = n - n_fail - n_warn
    lines += [f"**{n} skill(s) audited — {n_pass} passing, {n_warn} with warnings, {n_fail} failing.**", ""]

    if security is not None:
        findings = security.get("findings", [])
        lines += ["## Agent-content security", "",
                  "| Risk | Safe without review | Active candidates | Suppressed | Skipped |",
                  "|---|---|---:|---:|---:|",
                  "| {}/100 ({}) | {} | {} | {} | {} |".format(
                      security.get("risk_score", "-"), security.get("severity", "unknown"),
                      "yes" if security.get("safe_to_use") else "no", len(findings),
                      len(security.get("suppressed", [])), len(security.get("skipped", []))), "",
                  "Static findings are candidates requiring contextual review. See the scanner JSON for redacted evidence and fingerprints.", ""]

    # Usage-aware portfolio judgment follows the bundled report template.
    lines += [
        "## Portfolio assessment", "",
        "### Duplicate and overlap decisions", "",
        "<!-- TODO: Evaluate deterministic overlap candidates plus obvious domain families. "
        "Trace agent, workflow, skill, and documentation callers. For every material family choose "
        "MERGE, KEEP + SHARPEN, KEEP SPECIALIZED, DEMOTE, RETIRE, or REMOVE DUPLICATE; identify "
        "the canonical destination, unique resources and operational contracts to preserve, and "
        "proposed routing language. -->", "",
        "### Retirement or demotion candidates", "",
        "<!-- TODO: Identify skills whose value is baseline, superseded, or internal-only. Include "
        "actual callers and state what telemetry or confirmation is needed before removal. -->", "",
        "### Inventory and metadata findings", "",
        "<!-- TODO: Summarize catalog drift, untracked/incomplete skills, provenance or version issues, "
        "broken resources, and portfolio-level maintenance risks. -->", "",
        "### Recommended sequence", "",
        "<!-- TODO: Order repairs and consolidations by dependency and risk: broken contracts first, "
        "safe merges, routing sharpness, catalog synchronization, then evidence-based retirement. -->", "",
    ]

    # Summary table
    lines += ["## Summary", "",
              "| Skill | Verdict | Desc chars | SKILL.md lines | Broken refs | Orphans |",
              "|---|---|---|---|---|---|"]
    for r in results:
        desc = extract_num(get_check(r, "description_length")["detail"], r"^(\d+)")
        md_lines = extract_num(get_check(r, "skill_md_lines")["detail"], r"is (\d+) lines")
        lines.append(f"| {r['skill']} | {r['verdict']} | {desc} | {md_lines} | "
                     f"{len(r['broken_refs'])} | {len(r['orphans'])} |")
    lines.append("")

    # Overlap analysis section
    if overlap is not None:
        lines += ["## Overlap analysis", ""]
        if not overlap:
            lines += ["No overlapping skills detected.", ""]
        else:
            lines += ["| Level | Skill A | Skill B | Description similarity | Body similarity | Basis | Shared vocabulary (sample) |",
                      "|---|---|---|---:|---:|---|---|"]
            for p in overlap:
                desc_sim = p.get("description_similarity", p.get("similarity", "-"))
                body_sim = p.get("body_similarity", "-")
                basis = p.get("match_basis", "description")
                shared = p.get("shared_terms", []) if basis != "body" else p.get("shared_body_terms", [])
                lines.append(f"| {p['level']} | {p['skill_a']['name']} | {p['skill_b']['name']} | "
                             f"{desc_sim} | {body_sim} | {basis} | {', '.join(shared[:8])} |")
            lines += ["",
                      "<!-- TODO: For each surfaced pair, record its usage and choose MERGE, "
                      "KEEP + SHARPEN, KEEP SPECIALIZED, DEMOTE, RETIRE, or REMOVE DUPLICATE. "
                      "Include mutual routing text when sharpening and a preservation/migration "
                      "plan when consolidating. Byte-identical DUPLICATE pairs should name the "
                      "authoritative copy to retain. -->", ""]

    if usage is not None:
        lines += ["## Usage evidence", ""]
        if not usage:
            lines += ["No repository references found for the traced skills. Absence of callers is not proof that explicit invocation never occurs.", ""]
        else:
            lines += ["| Skill | Category | Location | Context |", "|---|---|---|---|"]
            for item in usage:
                context = str(item.get("context", "")).replace("|", "\\|")
                location = f"{item.get('path', '-')}:{item.get('line', '-')}"
                lines.append(f"| {item.get('skill', '-')} | {item.get('category', '-')} | "
                             f"`{location}` | {context} |")
            lines.append("")

    # Per-skill sections: failures first, then warns, then passes
    order = {"FAIL": 0, "WARN": 1, "PASS": 2}
    for r in sorted(results, key=lambda x: (order.get(x["verdict"], 3), x["skill"])):
        lines += [f"## {r['skill']} — {r['verdict']}", "", f"Path: `{r['path']}`", ""]

        issues = [c for c in r["checks"] if c["status"] != "PASS"]
        lines.append("### Guideline compliance")
        if not issues:
            lines += ["", "All checks pass.", ""]
        else:
            lines.append("")
            for c in issues:
                lines.append(f"- **[{c['status']}] {c['check']}** — {c['detail']}")
            for b in r["broken_refs"]:
                lines.append(f"  - Broken reference: `{b['path']}` (referenced in `{b['referenced_in']}`)")
            for o in r["orphans"]:
                lines.append(f"  - Orphaned file: `{o}` — never mentioned in SKILL.md or references")
            lines.append("")

        if r["verdict"] == "PASS" and not issues:
            lines += ["<!-- TODO: If no improvement opportunities exist for this passing skill, "
                      "replace the sections below with a single line and move on. -->", ""]

        lines += ["### Tool & MCP opportunities", "",
                  "<!-- TODO: Read this skill's SKILL.md. Propose bundled scripts for repeated "
                  "deterministic work, and MCP servers/connectors (matched to what is actually "
                  "connected) for steps that touch external systems. Flag hardcoded data that "
                  "will go stale. Tie each proposal to a specific step in the skill. -->", "",
                  "### References & assets", "",
                  "<!-- TODO: Propose reference-file splits if SKILL.md is near/over 500 lines, "
                  "template assets for output-producing skills, per-variant references for "
                  "multi-domain skills. Confirm fixes for any broken refs/orphans listed above. -->", "",
                  "### Recommended next actions", "",
                  "<!-- TODO: Ordered list, smallest fix first. -->", ""]

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Report scaffold written to {out_path} — fill in the TODO blocks before delivering.")


if __name__ == "__main__":
    main()
