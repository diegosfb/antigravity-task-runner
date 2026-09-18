---
name: google-gemini-api
description: Reference guidance for implementing or repairing Gemini API integrations with the supported Google Gen AI SDK or REST API. Use for model selection, generation, streaming, multimodal files, function calling, thinking controls, caching, code execution, grounding, SDK migration, and production error handling. Verify current capabilities in official Google documentation before coding.
user-invocable: false
metadata:
  version: "1.1.0"
  library: "Jezweb Claude Skills"
  library-url: "https://github.com/jezweb/claude-skills"
  pack: "Software Development"
---

# Google Gemini API

Implement Gemini integrations from the project's installed SDK and current official Google documentation, not from hard-coded model or quota assumptions.

## Scope

This skill supports Gemini content-generation integrations. Route embedding work to `../google-gemini-embeddings/SKILL.md` and managed file-search work to `../google-gemini-file-search/SKILL.md`.

## Required Context

Establish the runtime, deployment environment, installed package and version, API surface (Gemini Developer API or Vertex AI), authentication method, region, target modalities and tools, data sensitivity, latency and cost needs, and production stability requirements.

## Reference Routing

Load only what the task needs:

- Setup, authentication, and a minimal request: [quick-start-and-auth.md](references/quick-start-and-auth.md)
- Current model and quota selection: [models-and-limits.md](references/models-and-limits.md)
- Text, chat, structured output, and streaming: [generation-and-streaming.md](references/generation-and-streaming.md)
- Images, audio, video, PDFs, and uploaded files: [multimodal-and-files.md](references/multimodal-and-files.md)
- Function declarations and safe tool execution: [function-calling.md](references/function-calling.md)
- Thinking and generation controls: [thinking-and-configuration.md](references/thinking-and-configuration.md)
- Reused context and cache lifecycle: [context-caching.md](references/context-caching.md)
- Model-provided code execution: [code-execution.md](references/code-execution.md)
- Search grounding and citation handling: [grounding.md](references/grounding.md)
- SDK upgrades, errors, retries, and production readiness: [migration-errors-and-production.md](references/migration-errors-and-production.md)

## Workflow

1. Inspect the repository's runtime, dependencies, and existing Gemini integration.
2. Verify the relevant SDK/API methods, model availability, limits, pricing, and feature support in official documentation.
3. Select the smallest suitable model and API surface from measured quality, latency, cost, and stability needs.
4. Implement server-side credential handling, bounded inputs and outputs, error handling, and observable usage.
5. Validate representative success, safety, timeout, quota, cancellation, malformed response, and tool-failure paths.
6. Record version assumptions and links that must be rechecked during upgrades.

## Guardrails

- Never expose API keys or service credentials in browser code, committed files, logs, prompts, or generated artifacts.
- Treat model names, lifecycle states, SDK syntax, context sizes, media limits, prices, quotas, and feature compatibility as time-sensitive.
- Use official Google documentation and installed types as primary technical sources.
- Do not execute model-supplied function calls without schema validation, authorization, allowlisting, timeouts, and bounded results.
- Do not send sensitive data without an approved purpose, data-handling controls, and retention decision.
- Treat bundled templates as illustrative and version-sensitive; inspect and adapt them before use.
- Bound retries by error class, idempotency, elapsed time, and request budget; never retry indefinitely.

## Bundled Helpers

- Inspect declared and installed SDKs with [check-versions.sh](scripts/check-versions.sh).
- Use only the templates linked from the relevant references; verify them against the installed SDK first.

## Deliverable

Provide implementation or diagnosis with verified version assumptions, selected model/API, credential boundary, safety controls, tests, cost and quota considerations, and unresolved compatibility risks.
