# Code Execution

## Confirm the Capability

Verify model and API support, sandbox behavior, available packages, file limits, network access, billing, and returned part types in current official documentation.

## Treat Output as Untrusted

Model-generated code and execution output can be wrong, malicious, or disclose submitted data. Do not execute returned code locally. Do not send secrets, credentials, proprietary source, or sensitive datasets without approved controls.

Inspect every response part defensively and handle missing, failed, truncated, or unexpected outputs. Validate computed results independently when they drive financial, medical, legal, security, or other consequential decisions.

## Operational Controls

Bound input, runtime, output, retries, and cost. Sanitize logs and user-visible error messages. Apply application authorization before accepting uploaded data or returning generated artifacts.

Implement code execution from current official examples. Avoid copied combined-feature templates because they couple several independently evolving capabilities.
