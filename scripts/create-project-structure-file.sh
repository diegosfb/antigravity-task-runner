#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST_PATH="${PROJECT_STRUCTURE_LIST:-$PROJECT_ROOT/project-structure-list.txt}"
OUTPUT_PATH="${PROJECT_STRUCTURE_ZIP:-$PROJECT_ROOT/project-structure.zip}"

if [ ! -f "$MANIFEST_PATH" ]; then
  echo "Warning: project-structure-list.txt is missing at $MANIFEST_PATH" >&2
  echo "Create project-structure-list.txt at the project root or set PROJECT_STRUCTURE_LIST to the manifest path." >&2
  exit 1
fi

python3 - "$PROJECT_ROOT" "$MANIFEST_PATH" "$OUTPUT_PATH" <<'PY'
import os
import stat
import sys
import zipfile
from pathlib import Path

project_root = Path(sys.argv[1]).resolve()
manifest_path = Path(sys.argv[2]).resolve()
output_path = Path(sys.argv[3]).resolve()

entries = []
for raw_line in manifest_path.read_text(encoding="utf-8").splitlines():
    item = raw_line.strip()
    if not item or item.startswith("#"):
        continue
    normalized = item[2:] if item.startswith("./") else item
    entry_path = Path(normalized)
    if entry_path.is_absolute() or ".." in entry_path.parts:
        raise SystemExit(f"Error: invalid project-structure-list.txt entry: {item}")
    entries.append(normalized)

if not entries:
    raise SystemExit(f"Error: {manifest_path} does not contain any files or folders to package.")

missing = [entry for entry in entries if not (project_root / entry).exists()]
if missing:
    print("Error: project-structure-list.txt references missing paths:", file=sys.stderr)
    for entry in missing:
        print(f"  {entry}", file=sys.stderr)
    raise SystemExit(1)

output_path.parent.mkdir(parents=True, exist_ok=True)

file_count = 0
directory_count = 0
with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for entry in entries:
        source_path = project_root / entry
        archive_name = entry.replace(os.sep, "/")
        if source_path.is_dir():
            directory_count += 1
            info = zipfile.ZipInfo(archive_name.rstrip("/") + "/")
            info.external_attr = (stat.S_IFDIR | 0o755) << 16
            archive.writestr(info, b"")
            continue

        file_count += 1
        mode = source_path.stat().st_mode & 0o777
        info = zipfile.ZipInfo(archive_name)
        info.external_attr = (stat.S_IFREG | mode) << 16
        archive.writestr(info, source_path.read_bytes())

print(f"Created {output_path}")
print(f"Packaged {file_count} files and {directory_count} directories from {manifest_path}")
PY
