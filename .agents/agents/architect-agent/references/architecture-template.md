# Solution Architecture Document — Template

Output contract for `docs/architecture/architecture.md`. One document per project,
kept living: update it whenever an ADR changes a decision it describes.

## Rules before writing

1. **Honor the guidelines.** If `docs/architecture/development_guidelines.md` exists,
   every decision in this document must comply with it. Where a guideline forces a
   choice (e.g. a mandated language or stack), say so explicitly in the rationale.
2. **Fix spec silences as assumptions.** Where the spec is silent on a value the
   architecture needs (thresholds, limits, defaults), fix it in
   "Assumptions and Constraints" as an explicit decision — never leave it implicit.
3. **Cross-reference ADRs.** Every decision that is expensive to reverse gets its own
   ADR in `docs/architecture/adrs/`; this document summarizes the decision and links
   to the ADR, not the other way around.
4. **Write for downstream agents.** developer-agent, test-agent, and code-review-agent
   treat this document as binding. Boundaries stated here must be checkable.
5. **Maintain architecture diagrams.** Save editable diagram source files under
   `docs/architecture/documents/`, use kebab-case filenames, and link every diagram
   from the relevant section of `architecture.md`. Update affected diagrams whenever
   an ADR or architecture change alters a boundary, dependency, flow, or deployment.
   A handoff with a missing or stale applicable diagram is incomplete.

## Architecture diagram set

Create the diagrams that apply to the project; do not add empty or speculative
diagrams merely to satisfy a count:

1. **System context** — users, external systems, the system boundary, and major
   interactions.
2. **Container or component structure** — deployable units or major internal
   components, their responsibilities, and dependencies.
3. **Key runtime or data flows** — the critical request, event, state, or data
   journeys, including important failure paths where they affect the design.
4. **Deployment topology** — environments, runtime infrastructure, network or trust
   boundaries, and external managed services.

Prefer editable Mermaid source (`.mmd`). PlantUML (`.puml`), D2 (`.d2`), Graphviz
(`.dot`), or another text-based format is allowed when it communicates the design
more clearly; document the reason for a different format in `architecture.md`.
Rendered SVG, PNG, or PDF files are optional aids and never replace the editable
source. Use descriptive kebab-case names such as `system-context.mmd`,
`component-architecture.mmd`, `order-runtime-flow.mmd`, and
`production-deployment-topology.mmd`.

## Required sections

```markdown
# <Project Name> Architecture

## Executive Summary
2–3 paragraphs: the shape of the solution, the major components, and why this
level of complexity is right for the scope.

## Requirements Summary
### Functional Requirements
Bulleted, from the specs — what the system must do.
### Non-Functional Requirements
Bulleted — scale, latency, usability, operational, and mandated stack constraints.

## Assumptions and Constraints
Everything out of scope, every fixed value the spec left open (stated as a
decision), and every hard constraint (including security ones like
"no secrets committed").

## Chosen Architecture Style and Rationale
The style in one sentence, then bulleted rationale tying each choice to a
requirement or guideline.

## High-Level Architecture Diagram
Embed or summarize the high-level view and link to its editable source under
`docs/architecture/documents/`. Also link the applicable context, component,
runtime/data-flow, and deployment diagrams, explaining any category that does not
apply to this project.

## Repository Layout
Directory tree of the planned repo structure.

## Component and Service Responsibilities
One subsection per component/service: what it owns, suggested submodules,
and explicit non-responsibilities where drift is likely.

## Runtime Flow
Numbered walk-throughs of the key scenarios (startup, main loop, error paths,
shutdown/restart — whatever fits the system).

## Data Architecture and Storage Design
Authoritative ownership of each piece of state, data models, storage choices,
and — when relevant — why NOT to add a store the spec doesn't need.

## Integration and API Boundaries
Public API surface (routes/contracts, purpose, validation rules) and internal
boundaries (who may import what).

## Infrastructure and Deployment Topology
Local development setup, production topology, CI/release pipeline steps.

## Security, Privacy, and Compliance Considerations
Auth posture, data sensitivity, transport, validation, rate limiting,
secrets handling.

## Reliability, Scalability, and Observability Strategy
### Reliability
Failure modes and degradation behavior.
### Scalability
Where load lands and how it scales.
### Observability
Structured logging, minimum metrics, synthetic checks.

## Testing and Release Strategy
### Testing Strategy
Test levels mapped to the components above.
### Required End-to-End Scenarios
Bulleted, traceable to acceptance criteria.
### Release Strategy
Commit discipline, CI gates, rollout approach, post-deploy verification.

## Implementation Guidance for Downstream Agents
### Delivery Order
Numbered build sequence.
### Mandatory Boundaries
The rules developer-agent must not cross.
### Ownership Suggestions
Which subagent owns which part of the tree.

## Risks, Trade-offs, and Open Questions
### Risks
What could go wrong with this design.
### Trade-offs
Chosen / accepted-cost pairs.
### Open Questions
Explicitly empty if none block delivery; otherwise each with an owner.
```
