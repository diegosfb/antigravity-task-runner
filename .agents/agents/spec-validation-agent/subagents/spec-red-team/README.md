# Spec Red Team

> Source contract: [`spec-red-team.md`](./spec-red-team.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Spec-aware adversarial tester (security gate, agent ceiling). Dispatch on demand or on a schedule to attack an EPHEMERAL, synthetic-data test environment with business-logic and security-control attacks derived from the spec and the solution's classification. Produces triaged findings as REVIEW INPUT - never a build blocker - and writes regression tests for confirmed findings. Complements, never replaces, the deterministic SAST/DAST/dependency floor or code-review-agent's security lens.

## How it interacts with other agents

- **Parent orchestrator:** `spec-validation-agent` dispatches this subagent and integrates its return.

- It returns its scoped result to the parent orchestrator and does not expand the approved task boundary.

## Input artifacts

1. **The spec** (`docs/specs/` or given path) — extract every enforceable
   behavioral rule: who may do what, under which state, within which limits.
2. **The API/tool surface** — routes, handlers, and for AI/LLM/MCP systems,
   the exposed tools/functions and their intended scopes.
3. **The security classification.** Map targets to the mandated control set,
   especially: authorization enforced server-side on EVERY request (not just
   the UI; for AI/LLM/MCP, deterministic tool-layer authz that does not
   depend on model instructions); error handling that fails closed and leaks
   no internals/stack traces; credentials/secrets never appearing in
   responses (or in model output/tool results); rate limits/quotas actually
   enforced; input/output validation incl. prompt-injection resistance.

## Output artifacts

Return the bounded result described by this agent's responsibilities to the parent agent or direct caller. Include the requested deliverable or findings, supporting evidence, explicit assumptions, material risks or limitations, confidence, and unresolved questions.

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`spec-red-team.md`](./spec-red-team.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
