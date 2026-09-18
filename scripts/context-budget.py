#!/usr/bin/env python3
"""
context-budget.py

Estimate project-controlled startup/discovery context for a shared .agents
library and report the full instruction-library size.

Usage:
  ./.agents/context-budget.py
  ./.agents/context-budget.py --harness claude
  ./.agents/context-budget.py --harness all --budget 10000
  ./.agents/context-budget.py --json

Notes:
- Token counts are estimates. If tiktoken is installed, it is used; otherwise
  a conservative character/word heuristic is used.
- This measures repository-controlled context/discovery material, not hidden
  harness system prompts or provider-side tool schemas.
"""

from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Iterable

HARNESS_ALIASES = {
    "claude": "Claude Code",
    "codex": "Codex",
    "gemini": "Gemini CLI",
    "antigravity": "Antigravity",
    "opencode": "OpenCode",
}

DESCRIPTION_TARGET = 100

@dataclass
class Item:
    kind: str
    name: str
    path: str
    tokens: int
    description_tokens: int = 0

def find_root(start: Path) -> Path:
    p = start.resolve()
    for candidate in [p, *p.parents]:
        if (candidate / ".agents").is_dir():
            return candidate
    raise SystemExit("ERROR: Could not find a project root containing .agents/")

def token_counter():
    try:
        import tiktoken  # type: ignore
        try:
            enc = tiktoken.get_encoding("o200k_base")
        except Exception:
            enc = tiktoken.get_encoding("cl100k_base")
        return (lambda s: len(enc.encode(s))), "tiktoken"
    except Exception:
        # Reasonable cross-model approximation for English/code/YAML.
        def estimate(s: str) -> int:
            if not s:
                return 0
            words = len(re.findall(r"\S+", s))
            chars = len(s)
            return max(words, round(chars / 4))
        return estimate, "heuristic (~4 chars/token)"

count_tokens, TOKEN_METHOD = token_counter()

def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")

def frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not m:
        return "", text
    return m.group(1), text[m.end():]

def yaml_scalar(fm: str, key: str) -> str:
    lines = fm.splitlines()
    for i, line in enumerate(lines):
        m = re.match(rf"^{re.escape(key)}:\s*(.*)$", line)
        if not m:
            continue
        tail = m.group(1).strip()
        if tail in (">", "|", ">-", "|-"):
            vals = []
            for nxt in lines[i+1:]:
                if nxt.startswith((" ", "\t")):
                    vals.append(nxt.strip())
                elif not nxt.strip():
                    continue
                else:
                    break
            return " ".join(vals)
        return tail.strip("\"'")
    return ""

def canonical_agents(root: Path) -> list[Path]:
    base = root / ".agents" / "agents"
    if not base.is_dir():
        return []
    result: list[Path] = []
    # Flat form: .agents/agents/<name>.md
    result.extend(p for p in base.glob("*.md") if p.name.lower() != "readme.md")
    # Directory form: .agents/agents/<name>/<name>.md
    for d in base.iterdir():
        if d.is_dir():
            p = d / f"{d.name}.md"
            if p.is_file():
                result.append(p)
    return sorted(set(result))

def canonical_skills(root: Path) -> list[Path]:
    base = root / ".agents" / "skills"
    if not base.is_dir():
        return []
    return sorted(base.glob("*/SKILL.md"))

def discovery_items(root: Path) -> tuple[list[Item], list[Item]]:
    agents, skills = [], []
    for p in canonical_agents(root):
        text = read(p)
        fm, _ = frontmatter(text)
        name = yaml_scalar(fm, "name") or p.stem
        desc = yaml_scalar(fm, "description")
        # Approximate discovery payload as name + description.
        payload = f"{name}\n{desc}".strip()
        agents.append(Item("agent", name, str(p.relative_to(root)),
                           count_tokens(payload), count_tokens(desc)))
    for p in canonical_skills(root):
        text = read(p)
        fm, _ = frontmatter(text)
        name = yaml_scalar(fm, "name") or p.parent.name
        desc = yaml_scalar(fm, "description")
        payload = f"{name}\n{desc}".strip()
        skills.append(Item("skill", name, str(p.relative_to(root)),
                           count_tokens(payload), count_tokens(desc)))
    return agents, skills

def instruction_files(root: Path, harness: str) -> list[Path]:
    candidates = [root / "AGENTS.md"]
    if harness == "claude":
        candidates.append(root / "CLAUDE.md")
    elif harness == "gemini":
        candidates.append(root / "GEMINI.md")
    # Harness-specific files are counted if present because they may add
    # project-controlled startup instructions.
    extra = {
        "opencode": [root / "opencode.json", root / "opencode.jsonc"],
        "codex": [root / ".codex" / "config.toml"],
    }
    candidates.extend(extra.get(harness, []))
    return [p for p in candidates if p.is_file()]

def full_library_files(root: Path) -> list[Path]:
    base = root / ".agents"
    if not base.is_dir():
        return []
    allowed = {".md", ".txt", ".yaml", ".yml", ".json", ".toml"}
    files = []
    for p in base.rglob("*"):
        if p.is_file() and p.suffix.lower() in allowed:
            files.append(p)
    return sorted(files)

def status(total: int, budget: int) -> str:
    ratio = total / budget if budget else 0
    if ratio <= 0.60:
        return "GOOD"
    if ratio <= 0.85:
        return "WATCH"
    return "HIGH"

def analyze(root: Path, harness: str, budget: int):
    agents, skills = discovery_items(root)
    core_files = instruction_files(root, harness)
    core = [Item("core", p.name, str(p.relative_to(root)), count_tokens(read(p)))
            for p in core_files]

    core_tokens = sum(x.tokens for x in core)
    agent_tokens = sum(x.tokens for x in agents)
    skill_tokens = sum(x.tokens for x in skills)
    startup = core_tokens + agent_tokens + skill_tokens

    libfiles = full_library_files(root)
    library_tokens = sum(count_tokens(read(p)) for p in libfiles)

    warnings = []
    for x in agents + skills:
        if x.description_tokens > DESCRIPTION_TARGET:
            warnings.append(
                f"{x.kind} '{x.name}' description is {x.description_tokens} tokens "
                f"(target <= {DESCRIPTION_TARGET})"
            )

    return {
        "harness": harness,
        "harness_name": HARNESS_ALIASES[harness],
        "token_method": TOKEN_METHOD,
        "budget": budget,
        "core": [asdict(x) for x in core],
        "agents": [asdict(x) for x in agents],
        "skills": [asdict(x) for x in skills],
        "core_tokens": core_tokens,
        "agent_discovery_tokens": agent_tokens,
        "skill_discovery_tokens": skill_tokens,
        "startup_tokens": startup,
        "budget_percent": round(startup / budget * 100, 1) if budget else 0,
        "status": status(startup, budget),
        "library_tokens": library_tokens,
        "startup_library_percent": round(startup / library_tokens * 100, 1)
            if library_tokens else 0,
        "warnings": warnings,
    }

def fmt(n: int) -> str:
    return f"{n:,}"

def print_report(result):
    print(f"\nCONTEXT BUDGET - {result['harness_name']}")
    print("=" * (17 + len(result["harness_name"])))
    print(f"Token method: {result['token_method']}")
    print("\nCore startup instructions")
    print("-------------------------")
    if result["core"]:
        for x in result["core"]:
            print(f"{x['path']:<42} {fmt(x['tokens']):>10} tokens")
    else:
        print("(none detected)")
    print(f"\nAgent discovery: {len(result['agents'])} agents")
    print(f"  Estimated discovery payload          {fmt(result['agent_discovery_tokens']):>10} tokens")
    if result["agents"]:
        avg = round(sum(x["description_tokens"] for x in result["agents"]) / len(result["agents"]))
        print(f"  Avg description                      {fmt(avg):>10} tokens")
    print(f"\nSkill discovery: {len(result['skills'])} skills")
    print(f"  Estimated discovery payload          {fmt(result['skill_discovery_tokens']):>10} tokens")
    if result["skills"]:
        avg = round(sum(x["description_tokens"] for x in result["skills"]) / len(result["skills"]))
        print(f"  Avg description                      {fmt(avg):>10} tokens")

    print("\nEstimated project-controlled startup")
    print("------------------------------------")
    print(f"Core instructions                      {fmt(result['core_tokens']):>10}")
    print(f"Agent discovery                        {fmt(result['agent_discovery_tokens']):>10}")
    print(f"Skill discovery                        {fmt(result['skill_discovery_tokens']):>10}")
    print("                                           ----------")
    print(f"TOTAL                                  {fmt(result['startup_tokens']):>10} tokens")
    print(f"Budget                                 {fmt(result['budget']):>10} tokens")
    print(f"Usage                                  {result['budget_percent']:>9.1f}%")
    print(f"Status                                 {result['status']:>10}")

    print("\nFull canonical text library")
    print("---------------------------")
    print(f"Total                                  {fmt(result['library_tokens']):>10} tokens")
    print(f"Startup / library                      {result['startup_library_percent']:>9.1f}%")

    if result["warnings"]:
        print("\nWarnings")
        print("--------")
        for w in result["warnings"]:
            print(f"- {w}")

    print("\nCaveat")
    print("------")
    print("This estimates repository-controlled material only. Hidden harness prompts,")
    print("provider tool schemas, runtime conversation history, and implementation-specific")
    print("discovery overhead are not measurable from the repository and are excluded.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--harness", choices=["all", *HARNESS_ALIASES], default="all")
    ap.add_argument("--budget", type=int, default=10000,
                    help="Recommended project-controlled startup budget (default: 10000)")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--root", type=Path, default=Path.cwd())
    args = ap.parse_args()

    root = find_root(args.root)
    harnesses = list(HARNESS_ALIASES) if args.harness == "all" else [args.harness]
    results = [analyze(root, h, args.budget) for h in harnesses]

    if args.json:
        print(json.dumps({"root": str(root), "results": results}, indent=2))
    else:
        print("AGENT CONTEXT BUDGET")
        print("====================")
        print(f"Project: {root}")
        for r in results:
            print_report(r)

if __name__ == "__main__":
    main()
