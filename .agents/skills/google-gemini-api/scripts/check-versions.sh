#!/bin/bash

set -u

if [ ! -f package.json ]; then
  echo "No package.json found in the current directory." >&2
  exit 1
fi

echo "Declared Gemini SDK dependencies:"
grep -E '"@google/(genai|generative-ai)"[[:space:]]*:' package.json || echo "  none"

if command -v npm >/dev/null 2>&1; then
  echo "Installed @google/genai dependency:"
  npm list @google/genai --depth=0 2>/dev/null || true

  echo "Installed @google/generative-ai dependency:"
  npm list @google/generative-ai --depth=0 2>/dev/null || true
else
  echo "npm is unavailable; installed versions were not inspected."
fi

echo "Verify supported packages, versions, models, and migration steps in current official Google documentation."
