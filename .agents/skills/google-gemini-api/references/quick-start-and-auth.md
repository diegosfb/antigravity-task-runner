# Quick Start and Authentication

## Choose the API Surface

Confirm whether the project uses the Gemini Developer API or Vertex AI. Their authentication, endpoints, regional behavior, quotas, and supported features can differ. Preserve the project's existing surface unless the user requests a migration.

For JavaScript or TypeScript, inspect `package.json`, the lockfile, imports, and installed types before choosing SDK syntax. Do not add or upgrade a dependency without authorization and repository justification.

## Credential Boundary

- Keep API keys and service credentials in the approved secret manager or protected runtime injection.
- Use workload identity or equivalent managed identity where the platform supports it.
- Never put credentials in client bundles, URLs, examples, error messages, or source-controlled environment files.
- Restrict credentials by API, project, environment, and allowed consumers where supported.

## Minimal Integration

Prefer the smallest request supported by the installed SDK: initialize one server-side client, choose a verified available model, send bounded content, read the documented response accessor, and handle typed errors.

REST integrations must check HTTP status before parsing success payloads, bound response bodies, support cancellation, and avoid logging authorization headers or prompts.

## Templates

These examples are version-sensitive starting points:

- [text-generation-basic.ts](../templates/text-generation-basic.ts)

Inspect all model identifiers, dependencies, methods, and deployment assumptions before copying them.
