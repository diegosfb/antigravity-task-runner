# Architecture Review Agent

## What it does

The Architecture Review Agent independently evaluates an existing architecture package against the approved product definition, specifications, architectural guidelines, and repository constraints. It produces review findings without rewriting the architecture itself.

## How it interacts with other agents

`architect-agent` produces or expands the architecture package. Architecture Review returns evidence-based findings to that agent for correction or hands an approved package to `project-planner-agent`. `llm-judge-agent` may provide advisory cross-model feedback but never replaces the review verdict.

## Input artifacts

| Artifact | Requirement | Purpose |
|---|---|---|
| Existing Architecture Package | Required | Architecture folder containing the architecture document, ADRs, diagrams, and technical decomposition under review. |
| Specification Directory or File | Required | Defines the approved behavior and constraints the architecture must satisfy. |
| PRD | Optional | Supplies product goals, users, constraints, and success measures. |
| Architecture Guidelines | Optional | Supplies additional binding engineering or platform guidance. |

## Output artifacts

| Artifact | Purpose |
|---|---|
| Review Findings | Evidence-based approval or rework findings tied to the exact architecture package version. |

## Artifact locations

The architecture package remains in `docs/architecture/`. Review findings identify the reviewed revision and return through the active workflow or configured review location; the screen does not declare a fixed output file.

## Completion and handoff

Planning remains blocked while material findings are unresolved. Any material architecture change invalidates the prior verdict and requires review of the revised package.
