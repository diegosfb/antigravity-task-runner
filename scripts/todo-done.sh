#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TODO_FILE="$PROJECT_ROOT/TODO.md"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <todo item>"
  exit 1
fi

item="$*"
if [[ -z "$item" ]]; then
  echo "Error: TODO item cannot be empty."
  exit 1
fi

if [[ ! -f "$TODO_FILE" ]]; then
  echo "Error: TODO.md not found."
  exit 1
fi

if grep -Fq "- [x] $item" "$TODO_FILE"; then
  echo "TODO already marked done: $item"
  exit 0
fi

if ! grep -Fq "- [ ] $item" "$TODO_FILE"; then
  echo "Error: TODO not found: $item"
  exit 1
fi

ITEM="$item" TODO_FILE="$TODO_FILE" python - <<'PY'
import os
from pathlib import Path

item = os.environ["ITEM"]
path = Path(os.environ["TODO_FILE"])
lines = path.read_text().splitlines()
updated = False
for i, line in enumerate(lines):
    if line == f"- [ ] {item}":
        lines[i] = f"- [x] {item}"
        updated = True
        break

if updated:
    path.write_text("\n".join(lines) + "\n")
    print(f"Marked done: {item}")
else:
    raise SystemExit("Error: TODO not found")
PY
