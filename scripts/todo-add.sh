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
  echo "# TODO" > "$TODO_FILE"
  echo "" >> "$TODO_FILE"
fi

if grep -Fq "- [ ] $item" "$TODO_FILE" || grep -Fq "- [x] $item" "$TODO_FILE"; then
  echo "TODO already exists: $item"
  exit 0
fi

# Ensure there's a blank line after the header
if ! awk 'NR==2 && $0=="" {found=1} END{exit !found}' "$TODO_FILE"; then
  awk 'NR==1{print; print ""; next} {print}' "$TODO_FILE" > "${TODO_FILE}.tmp"
  mv "${TODO_FILE}.tmp" "$TODO_FILE"
fi

# Insert after the first blank line (keeps newest items near top)
awk -v new_item="$item" '
  BEGIN {inserted=0}
  {
    print
    if (!inserted && NR>1 && $0=="") {
      print "- [ ] " new_item
      inserted=1
    }
  }
  END { if (!inserted) print "- [ ] " new_item }
' "$TODO_FILE" > "${TODO_FILE}.tmp"

mv "${TODO_FILE}.tmp" "$TODO_FILE"

echo "Added TODO: $item"
