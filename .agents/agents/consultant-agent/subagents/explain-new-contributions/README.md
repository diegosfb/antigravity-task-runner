# Explain New Contributions

> Source contract: [`explain-new-contributions.md`](./explain-new-contributions.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Read-only team catch-up consultant for developers starting a shift or returning to a shared codebase. Explains changes on the current working branch and changes contributed to main in terms of features, architecture, decisions, principles, guidelines, risks, and follow-up actions. When the current branch is main, analyzes only main. Invokable directly or through consultant-agent.

## How it interacts with other agents

- **Parent orchestrator:** `consultant-agent` dispatches this subagent and integrates its return.

- It returns its scoped result to the parent orchestrator and does not expand the approved task boundary.

## Input artifacts

- The repository and its current checked-out branch.
- An optional last-known commit, date/time, or shift-start time.
- Optional areas of interest, such as API, data, frontend, infrastructure, or
  architecture.

Ask for a baseline when the requested period materially affects the answer. If
none is supplied, use the branch divergence point for branch comparisons and
the last 24 hours for a developer already on `main`; label that default clearly.

## Output artifacts

Return the bounded result described by this agent's responsibilities to the parent agent or direct caller. Include the requested deliverable or findings, supporting evidence, explicit assumptions, material risks or limitations, confidence, and unresolved questions.

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`explain-new-contributions.md`](./explain-new-contributions.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
