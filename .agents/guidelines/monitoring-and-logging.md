# Monitoring, Logging, and Troubleshooting Guideline

This is the operational observability contract for every agent designing,
implementing, testing, reviewing, or operating services and APIs. It governs
logs, metrics, traces, audit events, dashboards, alerts, health checks,
troubleshooting evidence, and Postman API validation.

The precedence order is `constitution.md` → `AGENTS.md` → this guideline. The
security and infrastructure-management guidelines also apply. Telemetry must
never weaken confidentiality merely to improve diagnostics.

## Assess observability needs first

Before adding or changing a service, endpoint, worker, integration, or
infrastructure component, determine:

- Critical user and business journeys.
- Failure modes, dependencies, and operational owners.
- Service-level indicators and objectives when applicable.
- Logs, metrics, and traces needed to diagnose those failures.
- Security and compliance audit events.
- Alert thresholds, recipients, escalation, and runbooks.
- Retention, residency, access, and cost constraints.
- Local-development versus deployed-environment output needs.

Do not add high-volume telemetry without an operational question it answers.
Do not omit telemetry from critical paths merely because the first version is
small.

## Structured logging contract

Use structured logging rather than concatenated prose. Cloud/deployed logs use
JSON on stdout/stderr or an approved collector; local logs may use a readable
renderer while preserving the same fields.

Include, where applicable:

- UTC timestamp.
- Severity or level.
- Stable event name or event ID.
- Service, component, version, and environment.
- Message describing the outcome without sensitive values.
- Request/correlation ID.
- Trace ID and span ID.
- Operation, route template, or job name—not raw sensitive URLs.
- Outcome/status and normalized error type.
- Duration and relevant non-sensitive counts.
- Actor, tenant, resource, or session identifiers only when approved,
  minimized, and pseudonymous where possible.

Use structured fields and parameterized logging APIs. Do not interpolate
untrusted content into log messages. Keep field names consistent across
services. Configure log levels by environment without requiring code changes.

## Required audit and security events

Always emit an appropriately protected event for:

- **Authentication events:** login success/failure, logout, MFA challenge and
  result, session creation/revocation, password reset, account lockout, and
  identity-provider errors. Record outcome and safe identifiers, never
  credentials.
- **Authorization failures:** denied action, policy/rule, resource class, safe
  actor identifier, and correlation context. Avoid exposing whether a hidden
  resource exists.
- **Administrative actions:** role or permission changes, user lifecycle,
  configuration changes, secret/key metadata changes, data export/deletion,
  and privileged operational actions.
- **Security exceptions:** validation failures, suspicious input, rate limits,
  CSRF/session violations, signature failures, blocked network activity, and
  security-control errors.
- **API access:** route template, method, status class, latency, correlation,
  client/application identity when approved, and rate-limit outcome.
- **Data-access events:** access to regulated or sensitive data, including
  actor, purpose/action, resource classification, outcome, and correlation;
  never include the data itself.

Audit events should be append-only, access-controlled, retained according to
policy, and protected from alteration or deletion by the workload being
audited.

## Data that must never be logged

Never log or attach:

- Passwords, password hashes, recovery answers, or authentication factors.
- API keys, access/refresh tokens, session cookies, authorization headers,
  private keys, client secrets, or signed URLs.
- Full payment-card or bank information, CVV, or payment credentials.
- Sensitive PII or regulated data unless an approved compliance requirement
  explicitly defines a protected, minimized representation.
- Raw request/response bodies by default.
- Secret-bearing query strings, headers, environment variables, or
  configuration dumps.
- Terraform state, secret-manager responses, database connection strings, or
  stack/local memory dumps containing sensitive values.

Apply allow-listing and data minimization before redaction. Redaction is a
defense in depth, not permission to collect unnecessary data. If prohibited
data reaches telemetry, treat it as a security incident under
`.agents/guidelines/security.md`.

## Errors and troubleshooting context

- Log errors once at the boundary that owns handling or escalation; avoid
  duplicate stack traces at every layer.
- Preserve normalized error type, safe context, correlation, and stack trace in
  protected server-side logs.
- Return safe public errors to clients; do not expose internal stack traces,
  queries, paths, dependency credentials, or implementation details.
- Distinguish expected business outcomes from system failures.
- Include retry count, dependency name, circuit-breaker state, and timeout
  category when useful and non-sensitive.
- Use correlation IDs across API, worker, queue, and downstream service
  boundaries.

Troubleshooting should begin with a hypothesis and the smallest relevant time,
service, tenant, trace, or request scope. Preserve incident evidence without
copying secrets into tickets, chats, or reports.

## Metrics

Monitor technical and business health. Use appropriate metric types and
bounded-cardinality labels.

- Apply RED metrics to request-driven services: rate, errors, duration.
- Apply USE metrics to resources: utilization, saturation, errors.
- Track queue depth/age, retry/dead-letter counts, dependency health, and batch
  freshness where applicable.
- Track critical business outcomes such as successful checkout or completed
  onboarding without exposing user data.
- Avoid user IDs, request IDs, raw URLs, or other unbounded values as metric
  labels.

## Distributed tracing

- Use OpenTelemetry or an approved equivalent for distributed systems.
- Propagate trace and correlation context across synchronous and asynchronous
  boundaries.
- Create spans around meaningful operations and external dependencies.
- Apply sampling appropriate to volume and risk while retaining errors and
  critical security traces when policy permits.
- Do not attach sensitive payloads or credentials to spans.

## Health checks

Provide health endpoints or equivalent platform checks for deployable services:

- Liveness indicates whether the process must be restarted.
- Readiness indicates whether it can safely receive work.
- Startup checks protect slow initialization where applicable.
- Dependency health should be bounded by timeouts and should not expose
  sensitive topology or credentials publicly.

Health checks are operational signals, not substitutes for end-to-end tests.

## Centralized monitoring

Aggregate logs, metrics, traces, and audit events in an approved centralized
platform. Suitable tools include:

- Splunk.
- ELK Stack or OpenSearch.
- Datadog.
- Microsoft Sentinel.
- Approved cloud-native or OpenTelemetry-compatible equivalents.

Centralization must provide encryption, access control, retention, search,
integrity, auditability, and environment/tenant separation. Production
telemetry must not be broadly accessible to development users.

Use centralized monitoring for suspicious-activity alerting, anomaly detection,
incident investigation, capacity planning, and service health—not merely log
storage.

## Alerting

Alerts must be actionable and owned.

- Alert on user-visible symptoms, SLO breaches, security signals, data-loss
  risk, failed backups, queue age, and critical dependency failure.
- Use anomaly detection for unusual authentication, authorization, IAM,
  traffic, data-access, and error patterns.
- Define severity, threshold/window, owner, notification route, runbook, and
  expected response for each alert.
- Deduplicate and group related signals.
- Do not alert on every individual error or on unactionable noise.
- Test alert delivery and periodically review false positives, false negatives,
  and stale alerts.

## Dashboards

Dashboards answer operational questions:

- Is the critical user journey healthy?
- Are latency and errors within objectives?
- Which dependency or resource is constrained?
- Is suspicious activity increasing?
- Did the latest deployment change behavior?

Include deployment/version annotations and links to runbooks where practical.
Avoid vanity panels that have no decision or response attached.

## Postman API validation

For every new or materially changed HTTP API endpoint, create or update a
Postman Collection v2.1 and request-level tests. Follow the repository's
existing location; otherwise use `tests/postman/`.

Coverage includes:

- Happy path and expected status.
- Response contract: required fields, types, and important headers.
- Authentication missing, invalid, expired, and valid cases.
- Authorization allowed and denied cases.
- Missing/invalid input and boundary conditions.
- Expected business errors and dependency failures where reproducible.
- Response-time expectation when a meaningful contract exists.
- Safe test-data setup and cleanup.

Use `{{baseUrl}}` and environment variables. Never hardcode tokens, passwords,
tenant secrets, or production endpoints/data. Committed Postman environments
contain variable names and dummy/empty values only. Run collections against
authorized DEV/QA targets, never production unless an explicitly approved
non-destructive test plan permits it.

Postman tests complement unit, integration, acceptance, security, and E2E tests;
they do not replace the `test-agent` gate.

## Validation checklist

Before completion, verify:

- Required events appear with the standard structured fields.
- Request, trace, and asynchronous correlation work end to end.
- Prohibited values are absent from logs, traces, metrics, dashboards, and
  Postman artifacts.
- Log levels differ appropriately between local and deployed environments.
- Central ingestion, retention, access control, and search work.
- Metrics and health checks reflect real service state.
- Alerts reach the owner and link to an actionable runbook.
- Dashboards show critical journeys and deployment impact.
- Postman collections execute successfully against the intended environment.

## Completion

Monitoring and logging work is complete only when critical behavior is
observable, required audit events are safe and queryable, telemetry is
correlated and centralized, alerts are actionable, sensitive values are
excluded, troubleshooting paths are documented, and changed APIs have
parameterized Postman validation alongside the automated test suite.
