#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

read_setting() {
  local file="$1"
  local key="$2"
  awk -F': ' -v k="$key" 'tolower($1)==tolower(k){$1=""; sub(/^: /,""); print; exit}' "$file" \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

read_setting_any() {
  local file="$1"
  shift
  local key
  for key in "$@"; do
    local val
    val="$(read_setting "$file" "$key")"
    if [[ -n "$val" ]]; then
      echo "$val"
      return 0
    fi
  done
  echo ""
}

infra_ref=""
if [[ -f "$ENV_FILE" ]]; then
  infra_ref="$(awk -F'=' '/^INFRASTRUCTURE=/{sub(/^INFRASTRUCTURE=/, ""); print; exit}' "$ENV_FILE")"
fi

if [[ -z "$infra_ref" ]]; then
  echo "Error: INFRASTRUCTURE not set in .env. Run ./scripts/switch-env.sh first."
  exit 1
fi

if [[ "$infra_ref" = /* ]]; then
  infra_file="$infra_ref"
else
  infra_file="$PROJECT_ROOT/$infra_ref"
fi

if [[ ! -f "$infra_file" ]]; then
  echo "Error: Infrastructure file $infra_file not found."
  exit 1
fi

region="$(read_setting_any "$infra_file" "Region")"
service_name="$(read_setting_any "$infra_file" "WebService" "Service Name" "Service")"
project_id="$(read_setting_any "$infra_file" "GCP ProjectID" "Project ID" "ProjectID")"
repo_id="$(read_setting_any "$infra_file" "Artifact Registry Repo" "ArtifactRegistryRepo")"
app_image="$(read_setting_any "$infra_file" "Application Image" "ApplicationImage")"
tag_override="${1:-${IMAGE_TAG:-}}"
tag_from_infra="$(read_setting_any "$infra_file" "Tag" "Image Tag")"

if [[ -z "$region" || -z "$service_name" || -z "$project_id" || -z "$repo_id" || -z "$app_image" ]]; then
  echo "Error: Missing required fields in $infra_file. Need GCP ProjectID, Region, WebService, Artifact Registry Repo, Application Image."
  exit 1
fi

tag="${tag_override:-$tag_from_infra}"
if [[ -z "$tag" ]]; then
  tag="latest"
fi

active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [[ -z "$active_account" ]]; then
  echo "Error: No active GCP account. Run 'gcloud auth login' or inject credentials via @config-manager."
  exit 1
fi

echo "GCP account in use: $active_account"

gcloud config set project "$project_id" >/dev/null

image_uri="${region}-docker.pkg.dev/${project_id}/${repo_id}/${app_image}:${tag}"

if ! gcloud artifacts docker images describe "$image_uri" --project "$project_id" >/dev/null 2>&1; then
  echo "Error: Image ${image_uri} not found in Artifact Registry."
  echo "Build and push the image first using ./scripts/build-artifacts.sh or your CI pipeline."
  exit 1
fi

echo "Deploying image ${image_uri} to Cloud Run service ${service_name} in ${region}..."
gcloud run deploy "$service_name" --image "$image_uri" --region "$region" --allow-unauthenticated --project "$project_id"

service_url=$(gcloud run services describe "$service_name" --region "$region" --project "$project_id" --format='value(status.url)')

echo "Deployment complete."
echo "Service URL: $service_url"
