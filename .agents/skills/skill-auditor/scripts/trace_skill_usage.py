#!/usr/bin/env python3
"""Trace where named skills are referenced in a repository.

Usage:
    python3 trace_skill_usage.py <repo-root> <skill-name> [<skill-name> ...] [--json]

The result distinguishes agent assignments, workflow callers, skill-to-skill
references, documentation, and other mentions. A reference is evidence of use,
not proof that the path executes at runtime; the auditor must inspect its context.
"""

import json
import os
import re
import sys
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__"}
TEXT_SUFFIXES = {".md", ".txt", ".yaml", ".yml", ".json", ".toml", ".py", ".js", ".ts", ".tsx", ".jsx", ".sh"}


def classify(relative_path):
    path = relative_path.as_posix()
    if path.startswith(".agents/agents/"):
        return "agent-assignment"
    if path.startswith(".agents/workflows/"):
        return "workflow"
    if path.startswith(".agents/skills/"):
        return "skill-reference"
    if path.startswith("docs/") or path in {"README.md", "USAGE.md", "AGENTS.md"}:
        return "documentation"
    return "other"


def iter_text_files(root):
    for directory, names, files in os.walk(root):
        names[:] = [name for name in names if name not in SKIP_DIRS]
        for name in files:
            path = Path(directory, name)
            if path.suffix.lower() in TEXT_SUFFIXES or name in {"AGENTS.md", "SKILL.md"}:
                yield path


def main():
    raw = sys.argv[1:]
    as_json = "--json" in raw
    args = [arg for arg in raw if arg != "--json"]
    if len(args) < 2:
        print(__doc__)
        sys.exit(2)

    root = Path(args[0]).resolve()
    names = args[1:]
    if not root.is_dir():
        sys.exit(f"Repository root does not exist: {root}")

    results = []
    patterns = {
        name: re.compile(rf"(?<![A-Za-z0-9_-]){re.escape(name)}(?![A-Za-z0-9_-])")
        for name in names
    }
    for path in iter_text_files(root):
        relative = path.relative_to(root)
        text = path.read_text(encoding="utf-8", errors="replace")
        for line_number, line in enumerate(text.splitlines(), 1):
            for name, pattern in patterns.items():
                own_dir = Path(".agents/skills") / name
                if relative == own_dir / "SKILL.md":
                    continue
                if pattern.search(line):
                    results.append({
                        "skill": name,
                        "category": classify(relative),
                        "path": relative.as_posix(),
                        "line": line_number,
                        "context": line.strip()[:300],
                    })

    results.sort(key=lambda item: (item["skill"], item["category"], item["path"], item["line"]))
    if as_json:
        print(json.dumps(results, indent=2))
    elif not results:
        print("No references found.")
    else:
        for item in results:
            print(f"{item['skill']}\t{item['category']}\t{item['path']}:{item['line']}\t{item['context']}")


if __name__ == "__main__":
    main()
