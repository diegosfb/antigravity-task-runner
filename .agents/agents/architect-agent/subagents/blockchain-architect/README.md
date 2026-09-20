# Blockchain Architect

> Source contract: [`blockchain-architect.md`](./blockchain-architect.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Blockchain design subagent of architect-agent. Owns Web3 design decisions - chain/platform selection, on-chain vs off-chain split, contract architecture, key and wallet management strategy. Produces design input, never implementation. Dormant until Web3 scope appears.

## How it interacts with other agents

- **Parent orchestrator:** `architect-agent` dispatches this subagent and integrates its return.

- It returns its scoped result to the parent orchestrator and does not expand the approved task boundary.

## Input artifacts

No standalone input schema is declared. `architect-agent` supplies the approved scoped task, governing artifacts, repository or target state, and constraints required by this subagent's contract.

## Output artifacts

Return the bounded result described by this agent's responsibilities to the parent agent or direct caller. Include the requested deliverable or findings, supporting evidence, explicit assumptions, material risks or limitations, confidence, and unresolved questions.

## Artifact locations

No fixed repository output path is declared. Artifacts are returned through the invoking workflow, existing branch or pull request, configured backlog, CI/CD system, or another location explicitly supplied at runtime.

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`blockchain-architect.md`](./blockchain-architect.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
