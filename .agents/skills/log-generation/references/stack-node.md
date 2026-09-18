# Node and JavaScript Logging Guidance

## Defaults

- Prefer `pino` for structured logs.
- Use `pino-pretty` for local readability and JSON in cloud.

## Environment Behavior

- Local: pretty output and DEBUG/INFO defaults.
- Cloud: JSON to stdout with INFO/WARN/ERROR defaults.

## Correlation

- Add request_id and trace_id in middleware.
- Avoid logging full request bodies or headers.
