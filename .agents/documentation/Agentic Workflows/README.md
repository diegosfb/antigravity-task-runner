# Agentic Workflows

This documentation describes the current ADLC agent lifecycle and artifact handoffs. Canonical behavior lives in `.agents/agents/`, `.agents/workflows/`, `routing-registry.yaml`, and `ADLC_workflow_settings.json`.

## Entry point

`sdlc-orchestrator` accepts a **User Request**, consults routing configuration, and delegates to the appropriate agent or workflow. It does not require a `project_state` input and does not produce domain artifacts itself.

## Project definition workflow

`product-agent -> ba-agent -> architect-agent -> ux-agent -> project-planner-agent`

| Stage | Main inputs | Main outputs |
|---|---|---|
| Product | Product Definition; optional Supporting Evidence | PRD at `docs/project_description/PRD.md` |
| BA | Approved PRD; optional Existing Specifications and Supporting Evidence | Specifications under `docs/specs/` |
| Architecture | Specification Directory or File; optional Existing Architecture Folder, PRD, and Architecture Guidelines | Architecture document and ADRs inside `docs/architecture/` |
| UX | Product context; optional architecture, research/evidence, and existing experience system | Design package containing `docs/design/design.md` and `docs/design/wireframes/`; specifications updated with UX requirements |
| Planning | Specifications, architecture package, optional design package and existing backlog | Backlog: user stories sequenced by dependencies |

Architecture mode is detected automatically. A complete `docs/architecture/architecture.md` plus ADR evidence under `docs/architecture/adrs/` selects existing-architecture expansion; otherwise the run creates a new architecture.

## Implementation workflow

`developer-agent -> spec-validation-agent -> test-agent -> documentation-agent -> code-review-agent -> deployment-agent`

Developer Agent can implement the next approved backlog item or one supplied user story/specification. A supplied user story/specification takes precedence and the backlog is ignored for that run. Existing code and tests are implicit inputs.

1. Developer Agent creates an approved implementation plan and integrates source code under `src/` on the task branch.
2. Spec Validation checks spec conformance when explicitly invoked by the workflow and automatically when configured with `drift_check_mode: on-implementation`.
3. Test Agent verifies the exact candidate. It may consume the backlog or one user story/specification; the targeted item takes precedence.
4. After Test Agent PASS, Developer Agent invokes Documentation Agent on the exact tested revision.
5. Developer Agent finalizes the branch or pull request and hands the PR to Code Review Agent.
6. Code Review emits change requests or an approved PR merge.
7. Deployment Agent consumes the approved merged PR plus a YAML release configuration and optional pre/post-deployment scripts.

## Visual conventions in Task Runner

- Yellow dotted group: related inputs or outputs.
- Orange border: mandatory input.
- Gray border: optional input.
- Green border: output artifact or output folder.
- ADLC Agents and their sidebar icons use red.
- Agent pages use a top-right **Run** action; the previous Cancel action is removed.

## Documentation index

### SDLC agents

- [Product Agent](SDLC%20Agents/PRODUCT-AGENT.md)
- [BA Agent](SDLC%20Agents/BA-AGENT.md)
- [Architect Agent](SDLC%20Agents/ARCHITECT-AGENT.md)
- [Architecture Review Agent](SDLC%20Agents/ARCHITECTURE-REVIEW-AGENT.md)
- [UX Agent](SDLC%20Agents/UX-AGENT.md)
- [Project Planner Agent](SDLC%20Agents/PROJECT-PLANNER-AGENT.md)
- [Developer Agent](SDLC%20Agents/DEVELOPER-AGENT.md)
- [Test Agent](SDLC%20Agents/TEST-AGENT.md)
- [Documentation Agent](SDLC%20Agents/DOCUMENTATION-AGENT.md)
- [Code Review Agent](SDLC%20Agents/CODE-REVIEW-AGENT.md)
- [Deployment Agent](SDLC%20Agents/DEPLOYMENT-AGENT.md)
- [SDLC Orchestrator](SDLC%20Agents/SDLC-ORCHESTRATOR.md)

### Supporting pages

- [Spec Validation Agent](Axiliary%20Agents/SPEC-VALIDATION-AGENT.md)
- [Meeting Evidence with Product Agent](SDLC%20Agents/MEETING-EVIDENCE-WITH-PRODUCT-AGENT.md)
- [Orchestration Explanation](orchestration-explanation.md)
- [ADLC Design](workflow-design/ADLC-design.md)
