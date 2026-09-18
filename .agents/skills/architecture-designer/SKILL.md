---
name: architecture-designer
description: Design or review software architecture, document ADRs, evaluate technology and system-pattern trade-offs, analyze dependencies and layering, and generate architecture diagrams. Use for general system design and architecture assessment; use cloud-architect, microservices-architect, edge-architect, or rag-architect when the request is primarily within one of those specialist domains.
triggers:
  - architecture
  - system design
  - design pattern
  - scalability
  - ADR
  - technical design
  - technology selection
  - dependency analysis
  - architecture diagram
role: expert
scope: design
output-format: document
metadata:
  version: "2.0.0"
  library: "Jeff Allan + Borghei"
  library-url: "https://github.com/Jeffallan/claude-skills; https://github.com/borghei/Claude-Skills"
  pack: "Software Development"
  category: engineering
  domain: system-design
  updated: 2026-08-28
  tags: [system-design, distributed-systems, architecture, adr, scalability]
---

# Architecture Designer

Design and assess maintainable software systems. Prefer the simplest architecture that meets verified functional and non-functional requirements, and make consequential trade-offs explicit.

## Boundaries

This is the general architecture entry point. Load a specialist instead when the main question is:

- cloud platform selection, migration, landing zones, or cloud cost: `cloud-architect`
- service boundaries, sagas, service mesh, or distributed microservices: `microservices-architect`
- CDN, edge compute, GeoDNS, or global delivery: `edge-architect`
- retrieval, embeddings, reranking, or RAG evaluation: `rag-architect`

Use this skill alongside a specialist when a cross-cutting system decision or ADR still needs a general architecture view. Implementation belongs to the relevant developer or infrastructure workflow.

## Workflow

1. Establish the current system, requirements, constraints, integration points, data flows, operational environment, and irreversible decisions.
2. Quantify relevant non-functional requirements. Load the NFR checklist and use `system-requirements-estimation` when capacity calculations materially affect the design.
3. Identify viable patterns and technologies. Prefer existing project conventions unless a documented constraint justifies change.
4. Define component responsibilities, interfaces, data ownership, failure behavior, security boundaries, observability, deployment implications, and evolution path.
5. Compare realistic alternatives, including operational cost and migration complexity. Avoid technology selection without explicit decision criteria.
6. Record significant decisions as ADRs and produce the smallest useful diagram.
7. Validate the design against requirements, dependency direction, failure modes, delivery feasibility, and stakeholder expectations.

## Outputs

Depending on the request, produce:

- requirements and constraints summary
- current-state assessment
- architecture or deployment diagram
- component responsibilities and interaction model
- technology decision matrix
- ADRs with alternatives and consequences
- risks, mitigations, and unresolved questions
- dependency, coupling, or layer analysis

Do not prescribe arbitrary numeric quality thresholds as universal success criteria. Interpret script findings in the context of the repository and its documented standards.

## Deterministic analysis tools

The migrated tools provide evidence for an architecture review; they do not make the final decision.

| Need | Command |
|---|---|
| Generate Mermaid, PlantUML, or ASCII diagrams | `python scripts/architecture_diagram_generator.py <project> --format mermaid --type component` |
| Inspect manifests, internal coupling, and circular dependencies | `python scripts/dependency_analyzer.py <project> --output json` |
| Detect structural patterns, layering issues, and large components | `python scripts/project_architect.py <project> --output json` |

Run a tool with `--help` before relying on unfamiliar options. Treat package-age findings as hints rather than vulnerability results; use the project security workflow for CVE analysis.

## Reference guide

Load only what the current decision requires.

| Topic | Reference |
|---|---|
| General architecture patterns | [architecture-patterns.md](references/architecture-patterns.md) |
| Additional pattern analysis and examples | [architecture-analysis-patterns.md](references/architecture-analysis-patterns.md) |
| System-design assessment workflows | [system-design-workflows.md](references/system-design-workflows.md) |
| Technology decision matrices | [technology-decision-guide.md](references/technology-decision-guide.md) |
| Full system-design document | [system-design.md](references/system-design.md) |
| Architecture Decision Record | [adr-template.md](references/adr-template.md) |
| Non-functional requirements | [nfr-checklist.md](references/nfr-checklist.md) |
| Architectural principles | [architectural-principles.md](references/architectural-principles.md) |
| Database selection | [database-selection.md](references/database-selection.md) |
| REST and GraphQL API design | [api-design-patterns.md](references/api-design-patterns.md) |
| Authentication and authorization | [authentication.md](references/authentication.md) |
| Persistence patterns | [database-patterns.md](references/database-patterns.md) |
| Caching | [caching.md](references/caching.md) |
| Background jobs and queues | [jobs-queues.md](references/jobs-queues.md) |
| Logging and monitoring | [logging.md](references/logging.md) |
| Rate limiting | [rate-limiting.md](references/rate-limiting.md) |
| Implementation-oriented pattern review | [patterns-implementation-playbook.md](references/patterns-implementation-playbook.md) |
| Example architecture write-up | [example.md](references/example.md) |

## Review constraints

- Document consequential and expensive-to-reverse decisions.
- State assumptions and distinguish verified constraints from preferences.
- Evaluate failure modes, security, operations, cost, maintainability, and migration.
- Avoid speculative scale, unnecessary distribution, and premature abstraction.
- Do not confuse automated structural heuristics with proof of architecture quality.
- Do not finalize a design while material requirements or stakeholder decisions remain unresolved.

## Provenance

This merged skill retains the general design guidance originally sourced from [Jeff Allan's Claude Skills](https://github.com/Jeffallan/claude-skills) and the analysis scripts, workflows, and decision references sourced from [Borghei's Claude Skills](https://github.com/borghei/Claude-Skills).
