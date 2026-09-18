# AWS Logging Guidance

## General

- Log to stdout/stderr in containers and serverless.
- Use JSON for structured logs in production.
- Ensure log level is set by environment variables.

## Correlation

- Propagate `X-Amzn-Trace-Id` when available.
- Include request_id and trace_id in each log entry.
