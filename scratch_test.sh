#!/usr/bin/env bash
REPO_ENVIRONMENTS_RAW="${REPO_ENVIRONMENTS:-dev qa stage prod}"
read -r -a REPO_ENVIRONMENTS <<< "${REPO_ENVIRONMENTS_RAW//,/ }"
echo "Raw: ${REPO_ENVIRONMENTS_RAW}"
echo "Count: ${#REPO_ENVIRONMENTS[@]}"
for env in "${REPO_ENVIRONMENTS[@]}"; do
  echo "Env: ${env}"
done
