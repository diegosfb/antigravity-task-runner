# Models and Limits

## Verify at Implementation Time

Use official model documentation and the target project's accessible model listing where available. Record the verification date and API surface. Do not rely on model tables copied into this repository.

Verify:

- Exact model identifier and lifecycle state
- Regional and account availability
- Input and output modalities
- Context and output limits
- Tool, structured-output, caching, grounding, and code-execution support
- Stable, preview, or experimental status
- Pricing dimensions and current quotas
- Data-use and retention terms applicable to the selected API

## Selection

Choose from representative evaluations, not marketing labels. Compare task quality, tail latency, input and output token use, media processing, tool reliability, rate-limit behavior, and operational stability.

Prefer stable model identifiers for production when they satisfy the requirement. Preview use should have explicit acceptance of lifecycle risk and an easy migration path.

## Quotas and Cost

Quotas may vary by model, tier, project, region, account history, and service load. Read returned quota metadata and official console values. Design concurrency, queues, and retries around measured limits.

Estimate cost from representative input, cached input, output, media, grounding, and tool usage. Add budgets and usage telemetry rather than embedding a fixed price table.

## Helper

Run [check-versions.sh](../scripts/check-versions.sh) from the target JavaScript project to identify declared and installed Gemini packages. The script does not determine the current recommended release.
