#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

read_setting() {
  local file="$1"
  local key="$2"
  awk -F': ' -v k="$key" 'tolower($1)==tolower(k){$1=""; sub(/^: /,""); print; exit}' "$file" \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

TAG_INPUT="${1:-${IMAGE_TAG:-}}"
if [[ -z "$TAG_INPUT" ]]; then
  if git_tag=$(git -C "$PROJECT_ROOT" describe --tags --abbrev=0 2>/dev/null); then
    TAG_INPUT="$git_tag"
  fi
fi

if [[ -z "$TAG_INPUT" ]]; then
  echo "Error: Unable to determine image tag. Provide it as an argument or set IMAGE_TAG."
  exit 1
fi

AWS_INFRA="$PROJECT_ROOT/config/Infrastructure/aws.yaml"
GCP_INFRA="$PROJECT_ROOT/config/Infrastructure/gcp.yaml"

aws_account=""
aws_region=""
aws_app_image=""
aws_arch=""

if [[ -f "$AWS_INFRA" ]]; then
  aws_account=$(read_setting "$AWS_INFRA" "AccountID")
  aws_region=$(read_setting "$AWS_INFRA" "Region")
  aws_app_image=$(read_setting "$AWS_INFRA" "Application Image")
  aws_arch=$(read_setting "$AWS_INFRA" "Target Architecture")
fi

gcp_project=""
gcp_region=""
gcp_repo=""
gcp_app_image=""
gcp_arch=""

if [[ -f "$GCP_INFRA" ]]; then
  gcp_project=$(read_setting "$GCP_INFRA" "GCP ProjectID")
  gcp_region=$(read_setting "$GCP_INFRA" "Region")
  gcp_repo=$(read_setting "$GCP_INFRA" "Artifact Registry Repo")
  gcp_app_image=$(read_setting "$GCP_INFRA" "Application Image")
  gcp_arch=$(read_setting "$GCP_INFRA" "Target Architecture")
fi

build_image_name="${aws_app_image:-${gcp_app_image:-battletris-server}}"
build_arch="${aws_arch:-${gcp_arch:-linux/amd64}}"

if [[ -n "$aws_account" && -n "$aws_region" || -n "$gcp_project" && -n "$gcp_region" && -n "$gcp_repo" ]]; then
  echo "Building Docker image once (platform ${build_arch})..."
  docker build --platform "$build_arch" -t "${build_image_name}:${TAG_INPUT}" .
else
  echo "Warning: No registry targets configured. Skipping build."
fi

if [[ -n "$aws_account" && -n "$aws_region" ]]; then
  aws_registry="${aws_account}.dkr.ecr.${aws_region}.amazonaws.com"
  aws_image_uri="${aws_registry}/${aws_app_image}:${TAG_INPUT}"

  echo "Logging in to ECR registry ${aws_registry}..."
  aws ecr get-login-password --region "$aws_region" | docker login --username AWS --password-stdin "$aws_registry"

  echo "Tagging image for ECR: ${build_image_name}:${TAG_INPUT} -> ${aws_image_uri}"
  docker tag "${build_image_name}:${TAG_INPUT}" "$aws_image_uri"

  echo "Pushing image to ECR: ${aws_image_uri}"
  docker push "$aws_image_uri"
fi

if [[ -f "$GCP_INFRA" ]]; then
  if [[ -n "$gcp_project" && -n "$gcp_region" && -n "$gcp_repo" && -n "$gcp_app_image" ]]; then
    gcp_image_uri="${gcp_region}-docker.pkg.dev/${gcp_project}/${gcp_repo}/${gcp_app_image}:${TAG_INPUT}"

    echo "Configuring Docker auth for Artifact Registry (${gcp_region}-docker.pkg.dev)..."
    gcloud auth configure-docker "${gcp_region}-docker.pkg.dev" -q

    echo "Tagging image for GCP: ${build_image_name}:${TAG_INPUT} -> ${gcp_image_uri}"
    docker tag "${build_image_name}:${TAG_INPUT}" "$gcp_image_uri"

    echo "Pushing image to Artifact Registry: ${gcp_image_uri}"
    docker push "$gcp_image_uri"
  else
    echo "Warning: GCP infra not fully configured (GCP ProjectID/Region/Artifact Registry Repo/Application Image). Skipping Artifact Registry push."
  fi
else
  echo "Warning: GCP infra file not found. Skipping Artifact Registry push."
fi

echo "Build once / deploy many artifact build complete. Tag: ${TAG_INPUT}"
