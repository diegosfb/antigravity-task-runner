---
name: log-generation
description: Add and validate structured logging, log management, and environment-specific log configuration for common stacks (.NET, Java, Node/JavaScript, React, Python). Use when asked to implement or improve logging, enable local vs cloud logging behavior, auto-generate log entry plans, or verify diagnostics/troubleshooting readiness for AWS/GCP deployments.
metadata:
  version: "1.0.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Software Development"
---

# Log Generation

## Overview

Add consistent, structured logs across services and ensure local developer logs and cloud deployment logs are usable for diagnostics, troubleshooting, and operational visibility.

## Quick Start (Auto Plan)

1. Run the log plan generator from the repo root.

```bash
LOG_PLAN_SCRIPT="$(find . -path '*/skills/log-generation/scripts/generate_log_plan.py' | head -n 1)"
test -n "$LOG_PLAN_SCRIPT" || { echo "Could not locate skills/log-generation/scripts/generate_log_plan.py"; exit 1; }
python "$LOG_PLAN_SCRIPT" --root . --out log-generation-plan.json
```

2. Use `log-generation-plan.json` as the required log-generation entries.
3. Implement the entries using the stack and cloud references below.

## Workflow Decision Tree

- If the request expects automatic log-entry generation, run `generate_log_plan.py` and use its output as the required log-entry plan.
- If the request targets a specific stack, read the corresponding stack reference first.
- If the request targets AWS or GCP deployment behavior, read the corresponding cloud reference.
- If the codebase is multi-stack, apply the workflow per service and normalize the log schema.

## Step 1: Discover Logging Surface

- Identify stacks and entrypoints (backend services, workers, CLI tools, frontend apps).
- Locate existing logging usage and configuration.
- Identify runtime environment signals (local dev vs cloud) and current log sinks.

Suggested commands:

```bash
rg --files -g '*.{cs,java,js,jsx,ts,tsx,py}'
rg -n "logger|logging|logback|serilog|winston|pino|structlog|log4j|slf4j|console\.log"
rg -n "appsettings\.json|logback|log4j|logging\.config|LOG_LEVEL|ENV|NODE_ENV|ASPNETCORE_ENVIRONMENT"
```

## Step 2: Define Log Contract

- Use a consistent structured schema across services.
- Prefer JSON logs for cloud environments; use human-readable format locally.
- Include correlation identifiers (request ID, trace ID, span ID) when available.
- Redact secrets and avoid logging PII or credentials.

Read `references/schema.md` for the canonical field set and log-entry format.

## Step 3: Implement Per Stack

- Use the stack-specific guidance and keep changes minimal and focused.
- Favor existing logging libraries where possible.
- If adding a dependency, add only the minimal, widely used package needed for structured logs.

Stack references:
- `references/stack-dotnet.md`
- `references/stack-java.md`
- `references/stack-node.md`
- `references/stack-python.md`
- `references/stack-react.md`

## Step 4: Configure Local vs Cloud Output

- Local: readable console output and lower default log volume.
- Cloud: JSON to stdout/stderr for ingestion by platform log collectors.
- Ensure log level is configurable via environment variables.

Cloud references:
- `references/cloud-aws.md`
- `references/cloud-gcp.md`

## Step 5: Validate and Check

- Confirm logs appear locally and include required fields.
- Confirm cloud logging uses JSON and preserves trace correlation.
- Ensure errors include stack traces or error context.
- Ensure no secrets/PII are logged.
- Add or update tests if the codebase has logging assertions or middleware tests.

Validation checklist:
- [ ] Log schema matches `references/schema.md` (required fields present).
- [ ] Log level is configurable by env var.
- [ ] Local logs are human-readable.
- [ ] Cloud logs are JSON on stdout/stderr.
- [ ] Request/trace correlation is wired for inbound requests.
- [ ] Sensitive values are redacted or omitted.

## Output Expectations

- Apply changes to existing config files before creating new ones.
- Keep changes scoped to the targeted services and environments.
- Report what was added, how it was validated, and any open risks.
