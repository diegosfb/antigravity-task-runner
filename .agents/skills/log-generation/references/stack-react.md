# React Logging Guidance

## Defaults

- Keep client logging minimal; use a small wrapper around `console`.
- Local: allow INFO/DEBUG.
- Cloud: restrict to WARN/ERROR.

## Recommendations

- Gate logs by `NODE_ENV`.
- Avoid logging PII or tokens.
- For production diagnostics, consider sending errors to an existing backend endpoint if available.
