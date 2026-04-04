#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTIVE_ENV_FILE="$PROJECT_ROOT/.agent/.active_env"
ENV_CONFIG_FILE=""
CONFIG_FILE="$PROJECT_ROOT/config/Infrastructure/aws.yaml"

read_setting() {
  local file="$1"
  local key="$2"
  awk -F': ' -v k="$key" 'tolower($1)==tolower(k){$1=""; sub(/^: /,""); print; exit}' "$file"
}

resolve_infra_file() {
  if [[ -f "$ACTIVE_ENV_FILE" ]]; then
    local env
    env="$(tr '[:upper:]' '[:lower:]' < "$ACTIVE_ENV_FILE" | tr -d '\n')"
    ENV_CONFIG_FILE="$PROJECT_ROOT/config/${env}.yaml"
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

SERVICE_ARN_DEFAULT=""
REGION_DEFAULT=""
SERVICE_NAME_DEFAULT=""
ACCOUNT_DEFAULT=""
SERVICE_TYPE_DEFAULT=""
TARGET_ARCH_DEFAULT=""

if [[ -f "$CONFIG_FILE" ]]; then
  REGION_DEFAULT="$(read_setting "$CONFIG_FILE" "Region")"
  SERVICE_NAME_DEFAULT="$(read_setting "$CONFIG_FILE" "Service Name")"
  ACCOUNT_DEFAULT="$(read_setting "$CONFIG_FILE" "Account")"
  SERVICE_TYPE_DEFAULT="$(read_setting "$CONFIG_FILE" "Service Type")"
  TARGET_ARCH_DEFAULT="$(read_setting "$CONFIG_FILE" "Target Architecture")"
fi

SERVICE_ARN="${1:-$SERVICE_ARN_DEFAULT}"
REGION="${2:-$REGION_DEFAULT}"

if [[ -z "$SERVICE_ARN" && -z "$SERVICE_NAME_DEFAULT" ]]; then
  echo "Usage: $0 [service-arn] [region]"
  exit 1
fi

if [[ -z "$REGION" ]]; then
  echo "Error: Missing region. Provide an argument or configure $CONFIG_FILE."
  exit 1
fi

if [[ -z "$SERVICE_ARN" && -n "$SERVICE_NAME_DEFAULT" ]]; then
  SERVICE_ARN=$(aws apprunner list-services \
    --region "$REGION" \
    --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME_DEFAULT}'].ServiceArn | [0]" \
    --output text)
fi

if [[ -z "$SERVICE_ARN" || "$SERVICE_ARN" == "None" ]]; then
  echo "Error: Unable to resolve App Runner service ARN. Provide it as an argument or check $CONFIG_FILE."
  exit 1
fi

service_status=""
service_url=""
updated_at=""
service_name=""
latest_status=""
latest_type=""
latest_id=""
latest_started=""

fetch_service() {
  service_status=$(aws apprunner describe-service \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --query "Service.Status" \
    --output text)

  service_url=$(aws apprunner describe-service \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --query "Service.ServiceUrl" \
    --output text)

  updated_at=$(aws apprunner describe-service \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --query "Service.UpdatedAt" \
    --output text)

  service_name=$(aws apprunner describe-service \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --query "Service.ServiceName" \
    --output text)
}

fetch_latest_operation() {
  latest_status=$(aws apprunner list-operations \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --max-results 1 \
    --query "OperationSummaryList[0].Status" \
    --output text)

  latest_type=$(aws apprunner list-operations \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --max-results 1 \
    --query "OperationSummaryList[0].Type" \
    --output text)

  latest_id=$(aws apprunner list-operations \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --max-results 1 \
    --query "OperationSummaryList[0].Id" \
    --output text)

  latest_started=$(aws apprunner list-operations \
    --region "$REGION" \
    --service-arn "$SERVICE_ARN" \
    --max-results 1 \
    --query "OperationSummaryList[0].StartedAt" \
    --output text)
}

print_context() {
  if [[ -n "$SERVICE_TYPE_DEFAULT" ]]; then
    echo "Service type: $SERVICE_TYPE_DEFAULT"
  fi
  if [[ -n "$ACCOUNT_DEFAULT" ]]; then
    echo "Account: $ACCOUNT_DEFAULT"
  fi
  if [[ -n "$TARGET_ARCH_DEFAULT" ]]; then
    echo "Target architecture: $TARGET_ARCH_DEFAULT"
  fi
}
is_failed_or_rolled_back() {
  if [[ "$latest_status" == "FAILED" || "$latest_status" == *"ROLLBACK"* ]]; then
    return 0
  fi
  return 1
}

fetch_logs() {
  local service_id
  local log_groups
  local matched_group
  local log_stream

  service_id="${SERVICE_ARN##*/}"

  echo "Fetching recent App Runner logs..."
  if ! log_groups=$(aws logs describe-log-groups \
    --region "$REGION" \
    --log-group-name-prefix "/aws/apprunner" \
    --query "logGroups[].logGroupName" \
    --output text); then
    echo "Failed to fetch log groups."
    return
  fi

  matched_group=$(echo "$log_groups" | tr '\t' '\n' | grep -E -m 1 -e "$service_id" -e "$service_name" || true)
  if [[ -z "$matched_group" ]]; then
    echo "No App Runner log group found for service ${service_name} (${service_id})."
    return
  fi

  if ! log_stream=$(aws logs describe-log-streams \
    --region "$REGION" \
    --log-group-name "$matched_group" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query "logStreams[0].logStreamName" \
    --output text); then
    echo "Failed to fetch log streams for ${matched_group}."
    return
  fi

  if [[ -z "$log_stream" || "$log_stream" == "None" ]]; then
    echo "No log streams found for ${matched_group}."
    return
  fi

  echo "Log group: ${matched_group}"
  echo "Log stream: ${log_stream}"
  aws logs get-log-events \
    --region "$REGION" \
    --log-group-name "$matched_group" \
    --log-stream-name "$log_stream" \
    --limit 50 \
    --query "events[].message" \
    --output text | tr '\t' '\n'
}

poll_until_running() {
  echo "Deployment in progress. Polling every 30 seconds until the service is running."
  echo "Service status: $service_status"
  echo "Latest operation: $latest_type ($latest_id)"
  echo "Latest operation status: $latest_status"
  echo "Started at: $latest_started"
  echo "Service URL: https://$service_url"
  print_context

  while true; do
    aws apprunner list-operations \
      --region "$REGION" \
      --service-arn "$SERVICE_ARN" \
      --max-results 1

    fetch_service
    fetch_latest_operation

    if is_failed_or_rolled_back; then
      echo "Deployment failed or rolled back."
      echo "Service status: $service_status"
      echo "Latest operation: $latest_type ($latest_id)"
      echo "Latest operation status: $latest_status"
      print_context
      fetch_logs
      exit 1
    fi

    if [[ "$service_status" == "RUNNING" && "$latest_status" != "IN_PROGRESS" ]]; then
      echo "Service is running."
      echo "Latest operation: $latest_type ($latest_id)"
      echo "Latest operation status: $latest_status"
      echo "Service updated at: $updated_at"
      echo "Service URL: https://$service_url"
      print_context
      exit 0
    fi

    sleep 30
  done
}

fetch_service
fetch_latest_operation

if [[ "$latest_status" == "IN_PROGRESS" || "$service_status" == "OPERATION_IN_PROGRESS" ]]; then
  poll_until_running
fi

if [[ "$service_status" == "RUNNING" ]]; then
  echo "Service is running."
  echo "Latest operation: $latest_type ($latest_id)"
  echo "Latest operation status: $latest_status"
  echo "Service updated at: $updated_at"
  echo "Service URL: https://$service_url"
  print_context
  exit 0
fi

if is_failed_or_rolled_back; then
  echo "Deployment failed or rolled back."
  echo "Service status: $service_status"
  echo "Latest operation: $latest_type ($latest_id)"
  echo "Latest operation status: $latest_status"
  print_context
  fetch_logs
  exit 1
fi

echo "Service status: $service_status"
echo "Latest operation: $latest_type ($latest_id)"
echo "Latest operation status: $latest_status"
echo "Service URL: https://$service_url"
print_context
exit 1
