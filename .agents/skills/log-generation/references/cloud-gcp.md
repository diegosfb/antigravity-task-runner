# GCP Logging Guidance

## General

- Log to stdout/stderr for Cloud Run, GKE, and Compute.
- Use JSON for structured logs in production.
- Ensure log level is set by environment variables.

## Trace Correlation

- Include `logging.googleapis.com/trace` when trace IDs are available.
- Format as `projects/PROJECT_ID/traces/TRACE_ID`.
