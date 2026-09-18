# Function Calling

## Tool Contract

Define narrow functions with clear names, descriptions, JSON schemas, required fields, and bounded arguments. Keep authorization and business rules in application code; the model cannot grant permission.

## Execution Loop

1. Send the allowed declarations for the current user and state.
2. Collect every function call returned by the model.
3. Validate name and arguments against an allowlist and schema.
4. Authorize the requested operation independently.
5. Apply timeouts, rate limits, idempotency, and side-effect confirmation.
6. Sanitize and bound the tool result before returning it to the model.
7. Stop on a configured turn, call, time, or cost limit.

Parallelize only independent, authorized calls. Preserve ordering and call identifiers required by the installed SDK.

## Safety

Treat tool arguments and results as untrusted. Protect against prompt injection, data exfiltration, SSRF, path traversal, injection, confused-deputy behavior, and recursive tool loops. Require explicit user authorization immediately before consequential external changes.

Implement function calling from current official examples after verifying declaration fields, calling modes, response parts, and model support.
