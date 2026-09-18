#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
project_root="$(dirname -- "$script_dir")"
vault_dir="$project_root/docs/vault"

if [ "$(uname -s)" != "Darwin" ]; then
  printf 'open-obsidian-vault: macOS is required\n' >&2
  exit 1
fi

if [ ! -d "$vault_dir" ]; then
  printf 'open-obsidian-vault: vault directory not found: %s\n' "$vault_dir" >&2
  exit 1
fi

if ! open -Ra Obsidian >/dev/null 2>&1; then
  printf 'open-obsidian-vault: Obsidian is not installed\n' >&2
  exit 1
fi

config_file="${OBSIDIAN_CONFIG_FILE:-$HOME/Library/Application Support/obsidian/obsidian.json}"
if [ ! -f "$config_file" ]; then
  printf 'open-obsidian-vault: Obsidian vault registry not found: %s\n' "$config_file" >&2
  exit 1
fi

python3 - "$config_file" "$vault_dir" <<'PY'
import json
import os
import secrets
import shutil
import sys
import tempfile
from datetime import datetime
from time import time

config_path = os.path.realpath(sys.argv[1])
vault_path = os.path.realpath(sys.argv[2])

try:
    with open(config_path, encoding="utf-8") as source:
        config = json.load(source)
except (OSError, ValueError) as error:
    raise SystemExit("open-obsidian-vault: invalid vault registry: {}".format(error))

vaults = config.setdefault("vaults", {})
matching_id = next(
    (
        vault_id
        for vault_id, entry in vaults.items()
        if os.path.realpath(entry.get("path", "")) == vault_path
    ),
    None,
)

changed = False
if matching_id is None:
    matching_id = secrets.token_hex(8)
    while matching_id in vaults:
        matching_id = secrets.token_hex(8)
    vaults[matching_id] = {
        "path": vault_path,
        "ts": int(time() * 1000),
        "open": True,
    }
    changed = True
elif vaults[matching_id].get("open") is not True:
    vaults[matching_id]["open"] = True
    changed = True

if changed:
    backup = "{}.backup.{}".format(
        config_path, datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
    )
    shutil.copy2(config_path, backup)
    descriptor, temporary = tempfile.mkstemp(
        prefix="obsidian.json.", suffix=".tmp", dir=os.path.dirname(config_path)
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(config, output, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, os.stat(config_path).st_mode)
        os.replace(temporary, config_path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
PY

vault_uri="$(python3 -c 'import sys; from urllib.parse import quote; print("obsidian://open?path=" + quote(sys.argv[1], safe=""))' "$vault_dir")"
exec open "$vault_uri"
