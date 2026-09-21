# ADLC Orchestration Explanation

## Routing model

The SDLC Orchestrator receives a Project Description for the full Agent-Orchestrated SDLC, reads `routing-registry.yaml`, applies `ADLC_workflow_settings.json`, and delegates to the smallest adequate agent set for the current workflow stage. It reports the selected agent, routing reason, expected output, and next consumer.

The orchestrator does not accept `project_state` as a visible input. Existing repository artifacts are discovered by the selected agent or workflow. Agents remain individually invokable for bounded specialist work, but only `sdlc-orchestrator` enforces the complete end-to-end sequence.

## Definition chain

`Project Description -> Product -> BA -> Architect -> UX -> Project Planner -> Backlog`

- Product Agent creates the PRD from a Product Definition and optional Supporting Evidence.
- BA Agent converts the approved PRD into testable specifications. Existing Specifications and Supporting Evidence are optional context.
- Architect Agent requires a Specification Directory or File. Existing Architecture Folder is the first optional input, followed by PRD and Architecture Guidelines.
- Architect Agent detects new architecture versus expansion from output-folder evidence: architecture document plus ADRs means expansion; incomplete evidence means new architecture.
- Architect Agent writes `architecture.md` and ADRs inside the Architecture Folder.
- UX Agent creates a Design Package containing the design document and wireframes, and updates affected specifications with approved UX and accessibility requirements.
- Project Planner combines requirements, architecture, optional design package, and optional existing backlog into the backlog: user stories sequenced by dependencies.

## Implementation chain

`Developer -> Spec Validation -> Test -> Documentation -> Code Review -> Deployment -> Live`

Developer Agent owns development work for the approved backlog scope or targeted implementation scope. It uses existing code and tests implicitly, integrates source code under `src/`, and produces the task branch or pull request.

Spec Validation compares spec-covered behavior with the governing specifications. The backlog workflow invokes it explicitly even when `drift_check_mode` is `on-demand`; standalone implementation runs invoke it automatically only when the mode is `on-implementation`.

Test Agent can consume the backlog or one User Story or Specification. The targeted item takes precedence. Tests are created and run against the exact candidate, with test-plan approval and configured red-team behavior.

After Test Agent returns PASS, Developer Agent invokes Documentation Agent with the exact tested revision and governing artifacts. Documentation Agent either updates required documentation or returns a justified no-change record.

Code Review Agent consumes the Pull Request and returns change requests or PR Merge approval. Requested changes return to Developer Agent and re-enter the relevant gates.

## Deployment chain

Deployment Agent consumes the approved merged PR, a YAML Release Configuration following `deployment-agent/references/release_configuration_sample`, workflow configuration, and optional pre-deployment script, post-deployment script, Prior Release State, and Pre-Release Evidence.

It produces the Live Release, Deployment Record, Rollback Artifact, and Post-Deploy Evidence. These structured outputs do not currently have mandatory repository folders; the release configuration and deployment platform determine persistence.

## Feedback loops

- Specification drift returns to Developer Agent or a specification gap returns to BA Agent.
- Test failures return to Developer Agent and optionally become planner-tracked defects.
- Code-review changes return to Developer Agent.
- Production telemetry and user feedback return to Product Agent.

## Approval and completion

Each owning agent enforces its configured approval gate. Missing or invalid configurable settings fail safe where the contract requires it. Production release approval is always mandatory. No advisory agent replaces specification validation, testing, code review, or production authorization.
