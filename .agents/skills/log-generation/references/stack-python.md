# Python Logging Guidance

## Defaults

- Use `logging` from the standard library.
- For JSON logs, use `python-json-logger` or `structlog` if already present.

## Environment Behavior

- Local: readable formatter and lower volume.
- Cloud: JSON formatter to stdout.

## Correlation

- Add request_id and trace_id to the log record if a framework middleware exists.
