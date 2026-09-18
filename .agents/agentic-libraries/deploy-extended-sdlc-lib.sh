#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DSFB_DEPLOY_MATRIX="$SCRIPT_DIR/library-deployment-matrix.md"
export DSFB_DEPLOY_MATRIX_COLUMN="Extended SDLC"
unset DSFB_DEPLOY_CONFIG
exec "$SCRIPT_DIR/helper-scripts/deploy-agents.sh" "$@"
