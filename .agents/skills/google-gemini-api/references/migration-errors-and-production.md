# Migration, Errors, and Production Readiness

## Migration

Inspect imports, constructors, request and response shapes, chat helpers, streaming, files, caches, tools, errors, and tests before upgrading. Read the installed-to-target official migration guide and release notes. Do not apply mechanical replacements across incompatible APIs.

Keep dependency and code changes reviewable, regenerate the lockfile with the repository's package manager, and test observable behavior before removing the old path.

## Errors and Retries

Classify authentication, authorization, invalid request, unavailable model, quota, rate limit, timeout, cancellation, server, and safety outcomes. Parse documented structured fields but preserve a safe fallback for unknown responses.

Retry only transient and idempotent work. Respect provider retry hints, add jitter, cap attempts and elapsed time, and stop when the request budget is exhausted. Never retry invalid credentials or malformed requests indefinitely.

## Production Checklist

- Server-side managed credentials and least privilege
- Verified stable model or explicitly accepted preview risk
- Input, output, time, concurrency, retry, and cost bounds
- Safety, privacy, tenant isolation, and retention controls
- Tool authorization and idempotency
- Usage, latency, finish reason, error class, and cost telemetry without sensitive payloads
- Contract, integration, failure, and fallback tests
- Model and SDK upgrade process with evaluation fixtures

Use [check-versions.sh](../scripts/check-versions.sh) to inventory JavaScript dependencies. It is diagnostic only and must not install or upgrade packages.
