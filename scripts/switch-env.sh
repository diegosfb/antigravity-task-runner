#!/bin/bash

# ==============================================================================
# Universal Environment Switching Script
# Switches environment context between DEV, QA, UAT, and PROD.
# Usage: ./switch-env.sh [DEV|QA|UAT|PROD]
# ==============================================================================

TARGET=$(echo "$1" | tr '[:lower:]' '[:upper:]')
PROJECT_ROOT=$(pwd)
ENV_DIR="$PROJECT_ROOT/.agent/environments"
ACTIVE_ENV_FILE="$PROJECT_ROOT/.agent/.active_env"
ARCHITECTURE_DOC="$PROJECT_ROOT/architecture_readme.md"

# Validation
if [[ ! "$TARGET" =~ ^(DEV|QA|UAT|PROD)$ ]]; then
    echo "Error: Target must be DEV, QA, UAT, or PROD."
    exit 1
fi

# 1. Verify YAML configuration exists
TARGET_LOWER=$(echo "$TARGET" | tr '[:upper:]' '[:lower:]')
YAML_FILE="$PROJECT_ROOT/config/${TARGET_LOWER}-settings.yaml"
if [ ! -f "$YAML_FILE" ]; then
    echo "Error: Configuration file $YAML_FILE not found."
    exit 1
fi

# 2. Generate .env file from YAML
echo "Generating .env file from config/${TARGET_LOWER}-settings.yaml..."
npx tsx scripts/generate-env.ts "$TARGET"

if [ $? -ne 0 ]; then
    echo "Error: Failed to generate .env file."
    exit 1
fi

echo "$TARGET" > "$ACTIVE_ENV_FILE"
echo "Switched to $TARGET environment (.env updated via YAML generation)."

# 4. Update architecture_readme.md (if it exists)
if [ -f "$ARCHITECTURE_DOC" ]; then
    # Use sed to update the "Active Environment" marker if present, 
    # or just log it to the agent so it can do it via a more precise tool.
    echo "Note: architecture_readme.md found. Agent will now update the environment table."
fi

# 5. Output signal for the agent
echo "AGENT_SIGNAL: ENVIRONMENT_SWITCHED_TO_$TARGET"
