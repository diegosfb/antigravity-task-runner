#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $(basename "$0") <workflow-file>" >&2
  exit 1
fi

workflow_file="$1"

if [[ ! -f "$workflow_file" ]]; then
  echo "Workflow file not found: $workflow_file" >&2
  exit 1
fi

claude --dangerously-skip-permissions "$(cat "$workflow_file")"
