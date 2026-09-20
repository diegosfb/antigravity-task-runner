#!/usr/bin/env python3
"""Audit agent definitions and synchronize their generated documentation."""

import argparse
import datetime as dt
import hashlib
import json
import os
import re
from pathlib import Path


EXPECTED = ("inputs", "outputs")
DESCRIPTION_MAX = 1000
SYSTEM_MIN = 500
SYSTEM_RECOMMENDED_MAX = 3000
SYSTEM_MAX = 10000
YAML_RECOMMENDED_MAX_LINES = 50
CORE = {
    "architect-agent", "ba-agent", "code-review-agent", "deployment-agent",
    "developer-agent", "product-agent", "project-planner-agent",
    "sdlc-orchestrator", "test-agent", "ux-agent",
}
START = "<!-- agent-auditor:inventory:start -->"
END = "<!-- agent-auditor:inventory:end -->"
STOP = {"agent", "agents", "the", "and", "for", "with", "from", "that", "this", "into", "when", "use", "uses", "using"}
CAPABILITY_PATTERN = re.compile(r"\b(?:analy[sz]e|audit|build|create|coordinate|deploy|design|develop|diagnose|evaluate|execute|generate|implement|inspect|maintain|manage|monitor|optimi[sz]e|own|plan|produce|provide|research|review|route|run|secure|speciali[sz]e|test|troubleshoot|validate|verify|write)s?\b", re.I)
SCOPE_PATTERN = re.compile(r"\b(?:for|when|use|invoke|activate|route|dispatch|handle|own|responsible|speciali[sz])\w*\b", re.I)
ROLE_PATTERN = re.compile(r"\b(?:advisor|advocate|architect|auditor|checker|consultant|developer|dispatcher|engineer|expert|lead|manager|orchestrator|planner|recorder|reviewer|specialist)\b", re.I)
PLACEHOLDER_DESCRIPTION_PATTERN = re.compile(r"^(?:agent|assistant|helpful agent|general purpose agent|todo|tbd|description)$", re.I)


def frontmatter_and_body(text):
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not match:
        return "", text
    return match.group(1), text[match.end():]


def frontmatter_value(frontmatter, key):
    lines = frontmatter.splitlines()
    for index, line in enumerate(lines):
        match = re.match(r"^{}:\s*(.*)$".format(re.escape(key)), line)
        if not match:
            continue
        value = match.group(1).strip()
        if value in ("|", ">", "|-", ">-"):
            block = []
            for following in lines[index + 1:]:
                if following and not following[0].isspace():
                    break
                block.append(following.strip())
            return ("\n" if value.startswith("|") else " ").join(block).strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            return value[1:-1]
        return value
    return ""


def tool_scope(frontmatter):
    lines = frontmatter.splitlines()
    for index, line in enumerate(lines):
        match = re.match(r"^tools:\s*(.*)$", line)
        if not match:
            continue
        value = match.group(1).strip()
        if value.startswith("[") and value.endswith("]"):
            tools = [item.strip().strip("'\"") for item in value[1:-1].split(",") if item.strip()]
            return tools
        if value:
            return [item.strip() for item in value.split(",") if item.strip()]
        tools = []
        for following in lines[index + 1:]:
            item = re.match(r"^\s+-\s+(.+)$", following)
            if item:
                tools.append(item.group(1).strip().strip("'\""))
            elif following and not following[0].isspace():
                break
        return tools
    return None


def authoring_metrics(text):
    frontmatter, body = frontmatter_and_body(text)
    description = frontmatter_value(frontmatter, "description")
    explicit_system = frontmatter_value(frontmatter, "system") or frontmatter_value(frontmatter, "prompt")
    system_prompt = explicit_system or body.strip()
    tools = tool_scope(frontmatter)
    findings = []
    yaml_lines = len(frontmatter.splitlines())
    description_chars = len(description)
    system_chars = len(system_prompt)
    system_lines = len(system_prompt.splitlines())
    meaningful_description_words = tokens(description)
    description_is_clear = bool(
        description
        and not PLACEHOLDER_DESCRIPTION_PATTERN.fullmatch(description.strip())
        and (
            CAPABILITY_PATTERN.search(description)
            or (
                ROLE_PATTERN.search(description)
                and len(meaningful_description_words) >= 3
                and (SCOPE_PATTERN.search(description) or len(meaningful_description_words) >= 5)
            )
        )
    )
    if not description_is_clear:
        findings.append({"severity": "warn", "code": "DESCRIPTION_UNCLEAR", "message": "description does not clearly distinguish the agent through a concrete capability or a specialized role and scope"})
    if description_chars > DESCRIPTION_MAX:
        findings.append({"severity": "fail", "code": "DESCRIPTION_LONG", "message": "description exceeds the 1,000-character maximum"})
    if system_chars < SYSTEM_MIN:
        findings.append({"severity": "warn", "code": "SYSTEM_SHORT", "message": "system prompt is below the 500-character recommendation"})
    elif system_chars > SYSTEM_MAX:
        findings.append({"severity": "fail", "code": "SYSTEM_LONG", "message": "system prompt exceeds the 10,000-character maximum"})
    elif system_chars > SYSTEM_RECOMMENDED_MAX:
        findings.append({"severity": "warn", "code": "SYSTEM_VERBOSE", "message": "system prompt exceeds the 3,000-character recommendation"})
    if yaml_lines > YAML_RECOMMENDED_MAX_LINES:
        findings.append({"severity": "warn", "code": "YAML_VERBOSE", "message": "YAML frontmatter exceeds the 50-line recommendation; move detailed rules to Markdown or a referenced skill or rules file"})
    return {
        "yaml_lines": yaml_lines,
        "description_chars": description_chars,
        "system_chars": system_chars,
        "system_lines": system_lines,
        "tools": tools,
        "authoring_findings": findings,
    }


def is_definition(path, root):
    rel = path.relative_to(root)
    if path.name in ("README.md", "agents-catalog.md"):
        return False
    if any(part.lower() in ("references", "referenced", "review-references", "web-search-modules", "speccreator-handbook") for part in rel.parts):
        return False
    if len(rel.parts) == 2 and path.stem == rel.parts[0]:
        return True
    if "subagents" in rel.parts:
        index = rel.parts.index("subagents")
        tail = rel.parts[index + 1:]
        return len(tail) == 1 or (len(tail) == 2 and path.stem == tail[0])
    return False


def purpose(text, name):
    frontmatter, _ = frontmatter_and_body(text)
    value = frontmatter_value(frontmatter, "description")
    if value:
        return value[:300].rstrip() + ("…" if len(value) > 300 else "")
    blocks = re.split(r"\n\s*\n", text)
    for block in blocks:
        clean = " ".join(line.strip() for line in block.splitlines() if not line.startswith(("#", "---", "```", "<!--")))
        clean = re.sub(r"\[(.*?)\]\([^)]*\)", r"\1", clean).strip()
        if len(clean) >= 35 and not clean.startswith(("name:", "description:", "version:")):
            return clean[:300].rstrip() + ("…" if len(clean) > 300 else "")
    return "Defines the responsibilities and workflow contract for `{}`.".format(name)


def tokens(text):
    return {w for w in re.findall(r"[a-z][a-z0-9-]{2,}", text.lower()) if w not in STOP}


def load_agents(root):
    agents = []
    for path in sorted(root.rglob("*.md")):
        if not is_definition(path, root):
            continue
        rel = path.relative_to(root)
        text = path.read_text(encoding="utf-8", errors="replace")
        owner = rel.parts[0]
        kind = "subagent" if "subagents" in rel.parts else "agent"
        title = re.search(r"^#\s+(.+)$", text, re.M)
        headings = {h.lower() for h in re.findall(r"^#{2,3}\s+(.+)$", text, re.M)}
        missing = [s for s in EXPECTED if not any(s in h for h in headings)]
        broken = []
        for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", text):
            clean = target.split("#", 1)[0]
            if clean and not re.match(r"(?:https?://|mailto:)", clean) and not (path.parent / clean).resolve().exists():
                broken.append(target)
        metrics = authoring_metrics(text)
        agents.append({
            "name": path.stem, "owner": owner, "type": kind,
            "path": rel.as_posix(), "title": title.group(1).strip() if title else "",
            "purpose": purpose(text, path.stem), "missing_sections": missing,
            "broken_links": sorted(set(broken)), "digest": hashlib.sha256(text.encode()).hexdigest(),
            "tokens": tokens(text), **metrics,
        })
    return agents


def overlaps(agents):
    findings = []
    for i, left in enumerate(agents):
        for right in agents[i + 1:]:
            union = left["tokens"] | right["tokens"]
            score = len(left["tokens"] & right["tokens"]) / float(len(union) or 1)
            exact = left["digest"] == right["digest"]
            if exact or score >= 0.35:
                findings.append({"left": left["name"], "right": right["name"], "score": round(score, 3), "exact": exact})
    return sorted(findings, key=lambda x: (not x["exact"], -x["score"], x["left"], x["right"]))


def audit(root, catalog=None, workflows=None):
    agents = load_agents(root)
    overlap = overlaps(agents)
    catalog_text = catalog.read_text(encoding="utf-8", errors="replace") if catalog and catalog.exists() else ""
    workflow_names = {p.stem.lower() for p in workflows.rglob("*.md")} if workflows and workflows.exists() else set()
    top = [a for a in agents if a["type"] == "agent"]
    result = {
        "root": str(root), "agent_count": len(top), "subagent_count": len(agents) - len(top),
        "agents": [{k: v for k, v in a.items() if k not in ("tokens", "digest")} for a in agents],
        "overlap_candidates": overlap,
        "catalog_missing": [a["name"] for a in agents if a["name"] not in catalog_text],
        "workflow_missing": [a["name"] for a in top if a["name"].upper() not in workflow_names and a["name"] not in workflow_names],
    }
    return result


def catalog_text(root, agents):
    lines = ["# Agents Catalog", "", "This catalog inventories every agent definition under `.agents/agents`. Generated by `agent-auditor`; edit source definitions rather than this file.", ""]
    owners = sorted({a["owner"] for a in agents})
    for owner in owners:
        lines.extend(["## {}".format(owner), "", "| Agent | Type | What it does | Source |", "|---|---|---|---|"])
        for a in [x for x in agents if x["owner"] == owner]:
            label = a["name"]
            lines.append("| `{}` | {} | {} | [definition]({}) |".format(label, a["type"], a["purpose"].replace("|", "\\|"), a["path"]))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def inventory_block(agent, children, root, doc):
    source = Path(agent["path"])
    rel_source = Path(os.path.relpath(root / source, doc.parent))
    lines = [START, "", "## Audited agent inventory", "", "- Source: [`{}`]({})".format(agent["name"], rel_source.as_posix())]
    if children:
        lines.extend(["- Subagents:"] + ["  - `{}` — {}".format(c["name"], c["purpose"]) for c in children])
    else:
        lines.append("- Subagents: none")
    lines.extend(["", END])
    return "\n".join(lines)


def sync(root, catalog, workflows):
    agents = load_agents(root)
    catalog.parent.mkdir(parents=True, exist_ok=True)
    catalog.write_text(catalog_text(root, agents), encoding="utf-8")
    workflows.mkdir(parents=True, exist_ok=True)
    top = [a for a in agents if a["type"] == "agent"]
    index = ["# Agentic Workflows", "", "Generated inventory of agent workflow documentation. Existing authored pages are preserved; `agent-auditor` manages only marked inventory sections.", "", "| Agent | Category | Documentation |", "|---|---|---|"]
    for agent in top:
        # Preserve the repository's established (legacy misspelled) directory
        # so synchronization does not create a parallel documentation tree.
        category = "SDLC Agents" if agent["name"] in CORE else "Axiliary Agents"
        doc = workflows / category / (agent["name"].upper() + ".md")
        doc.parent.mkdir(parents=True, exist_ok=True)
        children = [a for a in agents if a["type"] == "subagent" and a["owner"] == agent["name"]]
        block = inventory_block(agent, children, root, doc)
        if doc.exists():
            text = doc.read_text(encoding="utf-8", errors="replace")
            if START in text and END in text:
                text = re.sub(re.escape(START) + r".*?" + re.escape(END), block, text, flags=re.S)
            else:
                text = text.rstrip() + "\n\n" + block + "\n"
        else:
            text = "# {}\n\n{}\n\n## Workflow position\n\nDescribe upstream and downstream handoffs.\n\n## Inputs\n\nDocument input artifacts and owners.\n\n## Outputs\n\nDocument output artifacts and consumers.\n\n## Ownership boundaries\n\nDocument owned decisions and exclusions.\n\n## Completion and handoff\n\nDocument observable completion criteria.\n\n{}\n".format(agent["title"] or agent["name"], agent["purpose"], block)
        doc.write_text(text, encoding="utf-8")
        index.append("| `{}` | {} | [{}]({}/{}) |".format(agent["name"], category, doc.stem, category.replace(" ", "%20"), doc.name))
    (workflows / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    return len(agents), len(top)


def render_report(data, security=None):
    today = dt.date.today().isoformat()
    lines = ["# Agent Audit Report — {}".format(today), "", "## Portfolio assessment", "", "Automated findings identify structural and similarity candidates; overlap decisions require qualitative review and caller tracing.", "", "## Claude authoring policy", "", "| Field | Recommended | Audit failure |", "|---|---:|---:|", "| YAML `description` | Clear capability plus distinguishing domain or activation context; no minimum | >1,000 characters |", "| System prompt | 500–3,000 characters (about 40–50 clear lines) | >10,000 characters |", "| YAML `tools` | Declared list or inherited defaults | None; informational only |", "| YAML frontmatter | At most 50 lines | Review warning above 50 lines |", "", "Descriptions should clearly distinguish the agent through its capability, domain, or activation context regardless of length, with two to four short trigger examples only when useful. Omitted `tools` inherit the Claude Code defaults and are reported only as tool-scope information. Move YAML business rules beyond 50 lines into focused references or Agent Skills.", ""]
    if security is not None:
        lines.extend(["## Agent-content security", "", "| Risk | Safe without review | Active candidates | Suppressed | Skipped |", "|---|---|---:|---:|---:|", "| {}/100 ({}) | {} | {} | {} | {} |".format(security.get("risk_score", "-"), security.get("severity", "unknown"), "yes" if security.get("safe_to_use") else "no", len(security.get("findings", [])), len(security.get("suppressed", [])), len(security.get("skipped", []))), "", "Static findings are candidates requiring contextual review. See the scanner JSON for redacted evidence and fingerprints.", ""])
    lines.extend(["## Summary", "", "| Agent | Type | Verdict | YAML lines | Description chars | System chars / lines | Tool scope | Missing sections | Broken links | Overlap candidates | Authoring findings |", "|---|---|---|---:|---:|---:|---|---|---:|---:|---|"])
    counts = {}
    for pair in data["overlap_candidates"]:
        counts[pair["left"]] = counts.get(pair["left"], 0) + 1
        counts[pair["right"]] = counts.get(pair["right"], 0) + 1
    verdicts = {}
    for a in data["agents"]:
        findings = a.get("authoring_findings", [])
        authoring_fail = any(f["severity"] == "fail" for f in findings)
        verdict = "FAIL" if a["broken_links"] or authoring_fail else ("WARN" if a["missing_sections"] or counts.get(a["name"], 0) or findings else "PASS")
        verdicts[a["name"]] = verdict
        missing = ", ".join(a["missing_sections"]) or "—"
        tool_label = "inherits all" if a.get("tools") is None else "{} declared".format(len(a["tools"]))
        finding_label = "; ".join(f["code"] for f in findings) or "—"
        lines.append("| `{}` | {} | {} | {} | {} | {} / {} | {} | {} | {} | {} | {} |".format(a["name"], a["type"], verdict, a.get("yaml_lines", 0), a.get("description_chars", 0), a.get("system_chars", 0), a.get("system_lines", 0), tool_label, missing, len(a["broken_links"]), counts.get(a["name"], 0), finding_label))
    lines.extend(["", "## Duplicate and overlap candidates", "", "| Agents | Exact duplicate | Similarity | Required review |", "|---|---|---:|---|"])
    for pair in data["overlap_candidates"]:
        lines.append("| `{}` / `{}` | {} | {:.3f} | Compare triggers, authority, outputs, callers, and preservation needs. |".format(pair["left"], pair["right"], "yes" if pair["exact"] else "no", pair["score"]))
    lines.extend(["", "## Catalog and workflow documentation drift", "", "- Missing catalog entries: {}".format(", ".join(data["catalog_missing"]) or "none"), "- Missing top-level workflow pages: {}".format(", ".join(data["workflow_missing"]) or "none"), ""])
    lines.extend(["## Per-agent findings", ""])
    overlaps = {}
    for pair in data["overlap_candidates"]:
        overlaps.setdefault(pair["left"], []).append((pair["right"], pair["score"], pair["exact"]))
        overlaps.setdefault(pair["right"], []).append((pair["left"], pair["score"], pair["exact"]))
    for a in data["agents"]:
        verdict = verdicts[a["name"]]
        if verdict == "PASS":
            continue
        findings = a.get("authoring_findings", [])
        lines.extend(["### {} — {}".format(a["name"], verdict), "", "Path: `{}`".format(a["path"]), "", "#### Why this verdict", ""])
        reasons = []
        if a["broken_links"]:
            reasons.append("FAIL because {} referenced Markdown link(s) do not resolve from this agent file.".format(len(a["broken_links"])))
        failed_authoring = [f for f in findings if f["severity"] == "fail"]
        if failed_authoring:
            reasons.append("FAIL because the authoring policy has {} failure-level finding(s): {}.".format(len(failed_authoring), ", ".join(f["code"] for f in failed_authoring)))
        warned_authoring = [f for f in findings if f["severity"] == "warn"]
        if warned_authoring:
            reasons.append("Review warning for authoring-policy finding(s): {}.".format(", ".join(f["code"] for f in warned_authoring)))
        if a["missing_sections"]:
            reasons.append("Review warning because expected responsibility sections are missing: {}.".format(", ".join(a["missing_sections"])))
        if overlaps.get(a["name"]):
            reasons.append("Review warning because {} lexical overlap candidate(s) require qualitative comparison; similarity alone is not a merge decision.".format(len(overlaps[a["name"]])))
        lines.extend("- {}".format(reason) for reason in reasons)
        lines.extend(["", "#### Detailed findings", ""])
        for finding in findings:
            lines.append("- **[{}] `{}`** — {}.".format(finding["severity"].upper(), finding["code"], finding["message"].rstrip(".")))
        if a["missing_sections"]:
            lines.append("- **[WARN] `MISSING_SECTIONS`** — Missing required section(s): {}. Add the agent's explicit input or output contract, or confirm that an equivalent heading is present.".format(", ".join(a["missing_sections"])))
        for link in a["broken_links"]:
            lines.append("- **[FAIL] `BROKEN_LINK`** — `{}` does not resolve relative to `{}`.".format(link, a["path"]))
        if a.get("tools") is None:
            lines.append("- Tool scope: inherited. Claude Code makes all available tools visible when `tools` is omitted; confirm that this matches the agent's authority.")
        else:
            lines.append("- Tool scope: {} explicitly declared tool(s): {}.".format(len(a["tools"]), ", ".join("`{}`".format(tool) for tool in a["tools"]) or "none"))
        for other, score, exact in sorted(overlaps.get(a["name"], []), key=lambda item: item[1], reverse=True):
            lines.append("- **[WARN] `OVERLAP_CANDIDATE`** — `{}` has similarity {:.3f}{}; compare triggers, authority, inputs, outputs, callers, and unique resources before deciding whether to sharpen or consolidate responsibilities.".format(other, score, " and is an exact duplicate" if exact else ""))
        lines.extend(["", "#### Recommended next actions", ""])
        actions = []
        if a["broken_links"]:
            actions.append("Correct or remove each broken relative link after locating the intended canonical resource.")
        codes = {f["code"] for f in findings}
        if "DESCRIPTION_LONG" in codes:
            actions.append("Shorten `description` to 1,000 characters or fewer while preserving precise triggers and exclusions.")
        if "DESCRIPTION_UNCLEAR" in codes:
            actions.append("Rewrite `description` so it clearly distinguishes the agent through its concrete capability, domain, or activation scope; no minimum length applies.")
        if "SYSTEM_LONG" in codes or "SYSTEM_VERBOSE" in codes:
            actions.append("Keep the core system prompt concise and move conditional procedures or domain detail into selectively loaded references.")
        if "SYSTEM_SHORT" in codes:
            actions.append("Add the minimum identity, authority, constraints, inputs, outputs, and completion criteria needed for reliable execution.")
        if "YAML_VERBOSE" in codes:
            actions.append("Reduce YAML frontmatter to 50 lines or fewer by moving detailed rules into Markdown or a focused external reference.")
        if a["missing_sections"]:
            actions.append("Add the missing responsibility contracts or record why this specialized agent intentionally uses a smaller structure.")
        if overlaps.get(a["name"]):
            actions.append("Trace callers and compare ownership contracts for the listed overlap candidates before choosing KEEP, SHARPEN, MERGE, DEMOTE, or RETIRE.")
        actions.append("Re-run `agent-auditor` and confirm that resolved findings no longer appear.")
        lines.extend("{}. {}".format(index, action) for index, action in enumerate(actions, 1))
        lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command")
    for command in ("audit", "sync", "report"):
        p = sub.add_parser(command)
        p.add_argument("root", type=Path)
        p.add_argument("--catalog", type=Path)
        p.add_argument("--workflows", type=Path)
        if command == "audit": p.add_argument("--json", action="store_true")
        if command == "report":
            p.add_argument("--output", type=Path, required=True)
            p.add_argument("--security", type=Path)
    args = parser.parse_args()
    if not args.command:
        parser.error("a command is required")
    catalog = args.catalog or args.root / "agents-catalog.md"
    workflows = args.workflows
    if args.command == "sync":
        if workflows is None: parser.error("sync requires --workflows")
        total, top = sync(args.root, catalog, workflows)
        print("Synchronized {} agents ({} top-level).".format(total, top))
        return
    data = audit(args.root, catalog, workflows)
    if args.command == "report":
        security = json.loads(args.security.read_text(encoding="utf-8")) if args.security else None
        args.output.write_text(render_report(data, security), encoding="utf-8")
        print("Wrote {}".format(args.output))
    elif args.json:
        print(json.dumps(data, indent=2, sort_keys=True))
    else:
        print("{} top-level agents, {} subagents".format(data["agent_count"], data["subagent_count"]))
        print("{} overlap candidates; {} broken links".format(len(data["overlap_candidates"]), sum(len(a["broken_links"]) for a in data["agents"])))
        print("Catalog missing: {}".format(", ".join(data["catalog_missing"]) or "none"))
        print("Workflow pages missing: {}".format(", ".join(data["workflow_missing"]) or "none"))


if __name__ == "__main__":
    main()
