#!/usr/bin/env python3
"""Validate objective invariants of canonical agent definitions."""

import argparse
import re
import sys
from collections import Counter
from pathlib import Path


ALLOWED_ROLES = {"agent", "orchestrator", "subagent"}
HARNESS_ONLY_FIELDS = {
    "color",
    "kind",
    "mainAgent",
    "memory",
    "mode",
    "permissionMode",
    "permissions",
    "temperature",
}


def scalar(frontmatter, key):
    match = re.search(rf"(?m)^{re.escape(key)}:[ \t]*(.+?)[ \t]*$", frontmatter)
    if not match:
        return None
    value = match.group(1).strip()
    if value in {">", "|"}:
        lines = frontmatter[match.end() :].splitlines()
        folded = []
        for line in lines:
            if line and not line[0].isspace():
                break
            if line.strip():
                folded.append(line.strip())
        return " ".join(folded)
    return value.strip("\"'")


def references(frontmatter, key):
    match = re.search(rf"(?m)^{re.escape(key)}:[ \t]*(.*)$", frontmatter)
    if not match:
        return []
    same_line = match.group(1).strip()
    if same_line.startswith("[") and same_line.endswith("]"):
        return [item.strip().strip("\"'") for item in same_line[1:-1].split(",") if item.strip()]

    values = []
    for line in frontmatter[match.end() :].splitlines():
        if line and not line[0].isspace():
            break
        item = re.match(r"\s+(?:[a-zA-Z_-]+:\s*)?-\s*(.+?)\s*$", line)
        if item:
            values.append(item.group(1).strip().strip("\"'"))
            continue
        grouped = re.match(r"\s+[a-zA-Z_-]+:\s*\[([^]]*)\]", line)
        if grouped:
            values.extend(part.strip().strip("\"'") for part in grouped.group(1).split(",") if part.strip())
    return values


def top_level_keys(frontmatter):
    return set(re.findall(r"(?m)^([A-Za-z][A-Za-z0-9_-]*):", frontmatter))


def discover(agent_root):
    definitions = []
    invalid_markdown = []
    for path in sorted(agent_root.rglob("*.md")):
        relative = path.relative_to(agent_root)
        if len(relative.parts) == 1:
            if path.name in {"README.md", "agents-catalog.md"}:
                continue
            definitions.append(path)
        elif path.parent.name == path.stem:
            definitions.append(path)
        elif path.name.upper() == "AGENT.MD":
            invalid_markdown.append(path)
    return definitions, invalid_markdown


def parse_definition(path):
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", text, re.DOTALL)
    if not match:
        return None, None
    return match.group(1), match.group(2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".", help="Project root containing .agents")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    agent_root = root / ".agents" / "agents"
    skill_root = root / ".agents" / "skills"
    errors = []
    warnings = []

    if not agent_root.is_dir():
        print(f"ERROR: missing {agent_root}")
        return 1

    paths, legacy = discover(agent_root)
    for path in legacy:
        errors.append(f"noncanonical AGENT.md location: {path.relative_to(root)}")

    records = []
    for path in paths:
        frontmatter, body = parse_definition(path)
        rel = path.relative_to(root)
        if frontmatter is None:
            errors.append(f"{rel}: missing valid YAML frontmatter delimiters or Markdown body")
            continue
        if not body.strip():
            errors.append(f"{rel}: Markdown body is empty")

        name = scalar(frontmatter, "name")
        description = scalar(frontmatter, "description")
        role = scalar(frontmatter, "role")
        if not name:
            errors.append(f"{rel}: missing name")
        if not description:
            errors.append(f"{rel}: missing description")
        if role not in ALLOWED_ROLES:
            errors.append(f"{rel}: role must be agent, orchestrator, or subagent")
        if name and name != path.stem:
            errors.append(f"{rel}: name '{name}' does not match filename '{path.stem}'")
        if len(path.relative_to(agent_root).parts) > 1 and path.parent.name != path.stem:
            errors.append(f"{rel}: containing directory must match filename")

        nested = "subagents" in path.relative_to(agent_root).parts
        if nested and role != "subagent":
            errors.append(f"{rel}: nested definition must use role: subagent")
        if not nested and role == "subagent":
            warnings.append(f"{rel}: standalone subagent has no parent path")

        keys = top_level_keys(frontmatter)
        forbidden = sorted(keys & HARNESS_ONLY_FIELDS)
        if forbidden:
            errors.append(f"{rel}: harness-specific frontmatter: {', '.join(forbidden)}")
        if "tools" in keys and re.search(r"(?m)^tools:\s*$\n\s+\w+:\s*(?:true|false)", frontmatter):
            errors.append(f"{rel}: tools must express portable intent as a list, not a harness map")
        if role == "orchestrator":
            for field in ("inputs", "outputs", "execution"):
                if field not in keys:
                    errors.append(f"{rel}: orchestrator missing {field}")
            if "execution" in keys and "final_authority:" not in frontmatter:
                errors.append(f"{rel}: orchestrator execution missing final_authority")
            if "subagents" in keys and "delegation:" not in frontmatter:
                errors.append(f"{rel}: orchestrator declares subagents without execution.delegation")
        if role == "subagent":
            has_contract = "outputs" in keys or re.search(
                r"(?im)^(?:##\s+)?(?:expected return|output requirements|completion criteria)\b|\breturns?\s+to\s+(?:the\s+)?(?:caller|parent)",
                body,
            )
            if not has_contract:
                errors.append(f"{rel}: subagent lacks an explicit output/expected-return contract")

        records.append(
            {
                "path": path,
                "relative": rel,
                "name": name,
                "role": role,
                "skills": references(frontmatter, "skills"),
                "subagents": references(frontmatter, "subagents"),
            }
        )

    names = [record["name"] for record in records if record["name"]]
    for name, count in Counter(names).items():
        if count > 1:
            errors.append(f"duplicate agent name '{name}' appears {count} times")
    known_agents = set(names)

    for record in records:
        for skill in record["skills"]:
            if not (skill_root / skill / "SKILL.md").is_file():
                errors.append(f"{record['relative']}: missing skill '{skill}'")
        for subagent in record["subagents"]:
            if subagent not in known_agents:
                errors.append(f"{record['relative']}: missing subagent '{subagent}'")

    for record in records:
        parts = record["path"].relative_to(agent_root).parts
        if "subagents" not in parts:
            continue
        index = parts.index("subagents")
        if index == 0:
            errors.append(f"{record['relative']}: nested subagent has no parent agent")
            continue
        parent_name = parts[index - 1]
        parents = [candidate for candidate in records if candidate["name"] == parent_name]
        if not parents:
            errors.append(f"{record['relative']}: parent '{parent_name}' does not resolve")
        elif record["name"] not in parents[0]["subagents"]:
            errors.append(f"{record['relative']}: parent '{parent_name}' does not declare this subagent")

    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")
    print(
        f"Summary: agents={len(records)} errors={len(errors)} warnings={len(warnings)} "
        f"result={'PASS' if not errors else 'FAIL'}"
    )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
