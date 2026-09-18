#!/usr/bin/env bash
# Compatibility wrapper for manual artifact synchronization.
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec python3 "$script_dir/vault-event.py" sync "$@"
