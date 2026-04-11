#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_CONFIG_FILE=""
CONFIG_FILE="$PROJECT_ROOT/config/Infrastructure/gcp.yaml"

read_setting() {
  local file="$1"
  local key="$2"
  awk -F': ' -v k="$key" 'tolower($1)==tolower(k){$1=""; sub(/^: /,""); print; exit}' "$file"
}

resolve_infra_file() {
  local env=""
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    env="$(grep -E '^NODE_ENV=' "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr '[:upper:]' '[:lower:]' | tr -d '\n')"
  fi
  if [[ -n "$env" ]]; then
    ENV_CONFIG_FILE="$PROJECT_ROOT/config/${env}-settings.yaml"
    if [[ -f "$ENV_CONFIG_FILE" ]]; then
      local infra
      infra="$(read_setting "$ENV_CONFIG_FILE" "Infrastructure")"
      if [[ -n "$infra" ]]; then
        if [[ "$infra" = /* ]]; then
          CONFIG_FILE="$infra"
        else
          CONFIG_FILE="$PROJECT_ROOT/$infra"
        fi
      fi
    fi
  fi
}

resolve_infra_file

SERVICE_DEFAULT=""
REGION_DEFAULT=""
PROJECT_DEFAULT=""
ACCOUNT_DEFAULT=""
SERVICE_TYPE_DEFAULT=""
TARGET_ARCH_DEFAULT=""

if [[ -f "$CONFIG_FILE" ]]; then
  SERVICE_DEFAULT="$(read_setting "$CONFIG_FILE" "Service Name")"
  REGION_DEFAULT="$(read_setting "$CONFIG_FILE" "Region")"
  PROJECT_DEFAULT="$(read_setting "$CONFIG_FILE" "Project ID")"
  ACCOUNT_DEFAULT="$(read_setting "$CONFIG_FILE" "Account")"
  SERVICE_TYPE_DEFAULT="$(read_setting "$CONFIG_FILE" "Service Type")"
  TARGET_ARCH_DEFAULT="$(read_setting "$CONFIG_FILE" "Target Architecture")"
fi

SERVICE="${1:-$SERVICE_DEFAULT}"
REGION="${2:-$REGION_DEFAULT}"
PROJECT="${3:-$PROJECT_DEFAULT}"

if [[ -z "$SERVICE" || -z "$REGION" || -z "$PROJECT" ]]; then
  echo "Error: Missing service name, region, or project ID. Provide arguments or configure $CONFIG_FILE."
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI not found. Install and authenticate before running this script."
  exit 1
fi

describe_cmd=(gcloud run services describe "$SERVICE" --region "$REGION" --format json)
if [[ -n "$PROJECT" ]]; then
  describe_cmd+=(--project "$PROJECT")
fi

tmp_json="$(mktemp -t check-gcp-deployment.XXXXXX)"
tmp_err="$(mktemp -t check-gcp-deployment.err.XXXXXX)"

if ! "${describe_cmd[@]}" --quiet > "$tmp_json" 2> "$tmp_err"; then
  echo "Error: gcloud run services describe failed."
  cat "$tmp_err"
  rm -f "$tmp_json" "$tmp_err"
  exit 1
fi

if [[ ! -s "$tmp_json" ]]; then
  echo "Error: gcloud returned an empty response."
  if [[ -s "$tmp_err" ]]; then
    cat "$tmp_err"
  fi
  rm -f "$tmp_json" "$tmp_err"
  exit 1
fi

first_char="$(head -c 1 "$tmp_json")"
if [[ "$first_char" != "{" && "$first_char" != "[" ]]; then
  echo "Error: gcloud returned non-JSON output."
  head -n 20 "$tmp_json"
  if [[ -s "$tmp_err" ]]; then
    cat "$tmp_err"
  fi
  rm -f "$tmp_json" "$tmp_err"
  exit 1
fi

python3 - "$SERVICE" "$REGION" "$PROJECT" "$tmp_json" "$ACCOUNT_DEFAULT" "$SERVICE_TYPE_DEFAULT" "$TARGET_ARCH_DEFAULT" <<'PY'
import json
import sys

service = sys.argv[1]
region = sys.argv[2]
project = sys.argv[3]
path = sys.argv[4]
account = sys.argv[5]
service_type = sys.argv[6]
target_arch = sys.argv[7]
with open(path, "r", encoding="utf-8") as handle:
    data = json.load(handle)

def dig(obj, *keys):
    cur = obj
    for key in keys:
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            return None
    return cur

url = dig(data, "status", "url") or dig(data, "status", "address", "url")
ready_revision = dig(data, "status", "latestReadyRevisionName") or dig(data, "status", "latestReadyRevision")
conditions = dig(data, "status", "conditions") or []

ready_status = None
for condition in conditions:
    if condition.get("type") in ("Ready", "RoutesReady"):
        ready_status = condition.get("status")
        break

annotations = {}
for path in (
    ("metadata", "annotations"),
    ("spec", "template", "metadata", "annotations"),
    ("template", "metadata", "annotations"),
):
    ann = dig(data, *path)
    if isinstance(ann, dict):
        annotations.update(ann)

source_candidates = []
for key in (
    "run.googleapis.com/source-location",
    "run.googleapis.com/source",
    "run.googleapis.com/build-repo",
    "run.googleapis.com/build-source",
):
    val = annotations.get(key)
    if val:
        source_candidates.append(str(val))

build_config = dig(data, "buildConfig") or dig(data, "spec", "buildConfig")
if isinstance(build_config, dict):
    for key in ("sourceLocation", "repository", "source", "repo"):
        val = build_config.get(key)
        if val:
            source_candidates.append(str(val))

github_links = [val for val in source_candidates if "github.com" in val.lower()]

print(f"Service: {service}")
print(f"Region: {region}")
print(f"Project: {project}")
if service_type:
    print(f"Service type: {service_type}")
if account:
    print(f"Account: {account}")
if target_arch:
    print(f"Target architecture: {target_arch}")
if url:
    print(f"URL: {url}")
if ready_revision:
    print(f"Latest ready revision: {ready_revision}")
if ready_status is not None:
    print(f"Ready status: {ready_status}")

if github_links:
    print(f"Note: GitHub link detected for Cloud Run service: {github_links[0]}")
else:
    print("Note: No GitHub link detected in Cloud Run service metadata. GitHub pushes may not auto-deploy.")
PY

rm -f "$tmp_json" "$tmp_err"
