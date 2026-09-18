# Data Access Control

Use for governance policy and entitlement lifecycle. Use security specialists for platform-specific implementation and assurance.

## Policy model

Define access from subject, resource, action, purpose, environment, sensitivity, residency, and time. Prefer least privilege and separation of duties, but make emergency and service-account paths explicit.

## Entitlement lifecycle

1. Request with business purpose, scope, duration, and manager or owner context.
2. Approve through the accountable data owner and any required privacy or security reviewer.
3. Provision through managed groups, roles, policies, or attributes—not direct ad hoc grants when avoidable.
4. Verify effective access and negative cases.
5. Record decision and evidence without exposing sensitive data.
6. Recertify periodically and revoke on expiry, role change, or loss of purpose.

## Control choices

- Role-based controls for stable job responsibilities
- Attribute-based controls for richer subject and resource context
- Row filters for tenant, region, or purpose isolation
- Column policies or views for sensitive fields
- Dynamic masking or tokenization when partial utility is required
- Controlled break-glass access with monitoring and expiry

Do not rely on application-only filtering when users can query the platform directly. Verify deny precedence, ownership bypass, cached results, exports, replicas, service accounts, and downstream copies.

## Evidence

Capture requester, approver, purpose, policy version, effective scope, grant and expiry time, recertification, use, denial, administrative change, and revocation. Never log credentials or sensitive query payloads.

