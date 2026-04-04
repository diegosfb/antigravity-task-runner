#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_name="$(basename "$root_dir")"

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
fi

PROJECT_NAME="$project_name" ROOT_DIR="$root_dir" DRY_RUN="$dry_run" python3 - <<'PY'
import os
import re
import sys

root_dir = os.environ["ROOT_DIR"]
project_name = os.environ["PROJECT_NAME"]
dry_run = os.environ.get("DRY_RUN", "false").lower() == "true"

pattern = re.compile(r"(?:AA2|AA2)", re.IGNORECASE)

skip_dirs = {".git", "node_modules", "dist", "build", ".venv", ".idea", ".vscode", "__pycache__"}

def is_binary(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        return b"\x00" in chunk
    except OSError:
        return True

updated_files = 0
replacements = 0

for dirpath, dirnames, filenames in os.walk(root_dir):
    dirnames[:] = [d for d in dirnames if d not in skip_dirs]
    for filename in filenames:
        path = os.path.join(dirpath, filename)
        if is_binary(path):
            continue
        try:
            with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
                original = f.read()
        except OSError:
            continue

        updated, count = pattern.subn(project_name, original)
        if count == 0:
            continue

        replacements += count
        updated_files += 1

        if not dry_run:
            try:
                with open(path, "w", encoding="utf-8", errors="surrogateescape") as f:
                    f.write(updated)
            except OSError:
                print(f"Warning: failed to write {path}", file=sys.stderr)

mode = "DRY-RUN" if dry_run else "APPLIED"
print(f"{mode}: replaced {replacements} occurrence(s) across {updated_files} file(s)")
PY
