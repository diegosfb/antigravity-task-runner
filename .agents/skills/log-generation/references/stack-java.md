# Java Logging Guidance

## Defaults

- Prefer SLF4J with Logback.
- Use pattern logs locally and JSON logs in cloud.

## Logback Notes

- Use `logback-spring.xml` or `logback.xml` if present.
- For JSON, consider `logstash-logback-encoder` if acceptable.

## Correlation

- Ensure MDC includes request_id, trace_id, and span_id.
- Clear MDC after each request.
