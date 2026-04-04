#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_BUCKET="amzn-s3-terraform-build"
LOCK_TABLE="bettertris-terraform-lock"
REGION="us-east-2"

init_stack() {
  local stack_dir="$1"
  local state_key="$2"

  echo "Initializing backend in ${stack_dir}..."
  (cd "$stack_dir" && terraform init -migrate-state -force-copy \
    -backend-config="bucket=${STATE_BUCKET}" \
    -backend-config="key=${state_key}" \
    -backend-config="region=${REGION}" \
    -backend-config="dynamodb_table=${LOCK_TABLE}" \
    -backend-config="encrypt=true")
}

init_stack "$PROJECT_ROOT/config/Infrastructure/terraform/gcp" "bettertris/gcp/terraform.tfstate"

echo "GCP Terraform backend initialized."
