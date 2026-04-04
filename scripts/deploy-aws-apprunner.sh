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
service_name="$(read_setting_any "$infra_file" "WebService" "AWS Service" "Service Name" "Service")"
app_image="$(read_setting_any "$infra_file" "Application Image" "ApplicationImage" "Image")"
tag_override="${1:-${IMAGE_TAG:-}}"
tag_from_infra="$(read_setting_any "$infra_file" "Tag" "Image Tag")"
account_id="$(read_setting_any "$infra_file" "AccountID" "Account Id" "Account")"
auto_deploy="$(read_setting_any "$infra_file" "Auto Deploy")"
service_arn="$(read_setting_any "$infra_file" "Service ARN" "ServiceArn")"

if [[ -z "$region" || -z "$service_name" || -z "$account_id" || -z "$app_image" ]]; then
  echo "Error: Missing required fields in $infra_file. Need Region, WebService, AccountID, Application Image."
  exit 1
fi

tag="${tag_override:-$tag_from_infra}"
if [[ -z "$tag" ]]; then
  tag="latest"
fi

if [[ -z "$auto_deploy" ]]; then
  auto_deploy="true"
fi
auto_deploy=$(echo "$auto_deploy" | tr '[:upper:]' '[:lower:]')

aws_account=""
if aws_account=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
  echo "AWS account in use: $aws_account"
else
  echo "Error: AWS credentials are not available. Configure credentials or inject them via @config-manager."
  exit 1
fi

if [[ "$app_image" == *".amazonaws.com/"* ]]; then
  if [[ "$app_image" == *":"* ]]; then
    ecr_image="$app_image"
  else
    ecr_image="${app_image}:${tag}"
  fi
else
  registry="${account_id}.dkr.ecr.${region}.amazonaws.com"
  ecr_image="${registry}/${app_image}:${tag}"
fi

if [[ -z "$service_arn" ]]; then
  service_arn=$(aws apprunner list-services \
    --region "$region" \
    --query "ServiceSummaryList[?ServiceName=='${service_name}'].ServiceArn | [0]" \
    --output text)
fi

if [[ -z "$service_arn" || "$service_arn" == "None" ]]; then
  echo "Error: Unable to resolve App Runner service ARN for ${service_name}."
  exit 1
fi

repo_name="$app_image"
if [[ "$repo_name" == *".amazonaws.com/"* ]]; then
  repo_name="${repo_name##*/}"
  repo_name="${repo_name%%:*}"
fi

if ! aws ecr describe-images --repository-name "$repo_name" --image-ids imageTag="$tag" --region "$region" >/dev/null 2>&1; then
  echo "Error: Image tag '$tag' not found in ECR repository '$repo_name' (region ${region})."
  echo "Build and push the image first using ./scripts/build-artifacts.sh or your CI pipeline."
  exit 1
fi

access_role_arn=$(aws apprunner describe-service \
  --region "$region" \
  --service-arn "$service_arn" \
  --query "Service.SourceConfiguration.AuthenticationConfiguration.AccessRoleArn" \
  --output text)

if [[ -z "$access_role_arn" || "$access_role_arn" == "None" ]]; then
  echo "Error: Unable to resolve App Runner access role ARN for ${service_name}."
  exit 1
fi

container_port=$(aws apprunner describe-service \
  --region "$region" \
  --service-arn "$service_arn" \
  --query "Service.SourceConfiguration.ImageRepository.ImageConfiguration.Port" \
  --output text)

if [[ -z "$container_port" || "$container_port" == "None" ]]; then
  container_port="8080"
fi

echo "Updating App Runner service to image ${ecr_image} (auto_deploy=${auto_deploy})..."
aws apprunner update-service \
  --region "$region" \
  --service-arn "$service_arn" \
  --source-configuration "ImageRepository={ImageIdentifier=${ecr_image},ImageRepositoryType=ECR,ImageConfiguration={Port=${container_port}}},AuthenticationConfiguration={AccessRoleArn=${access_role_arn}},AutoDeploymentsEnabled=${auto_deploy}"

service_url=$(aws apprunner describe-service \
  --region "$region" \
  --service-arn "$service_arn" \
  --query "Service.ServiceUrl" \
  --output text)

echo "Deployment triggered for ${service_name} in ${region} (image tag ${tag})."
echo "Service URL: https://${service_url}"
