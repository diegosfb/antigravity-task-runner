# SDLC Orchestrator — How It Works

## What it is

`sdlc-orchestrator` is the single entry point to the dsfb-sdlc v2 library. It
does not do the work itself — it reads your intent, picks the right specialist
agent, and sequences the artifact handoffs that connect them. Think of it as a
dispatcher: it knows which agent owns each workflow phase, what each agent
produces, and where that output goes next.

Without the orchestrator you would need to remember which agent handles
specifications, which one owns planning, how they hand off to each other, and
in what order. With it, you describe what you want and it takes care of routing.

## Why it exists

Any sufficiently large workflow has enough phases, feedback loops, and
conditional branches that routing by memory leads to mistakes — invoking the
wrong agent, skipping a gate, or starting the wrong handoff direction after a
failure. The orchestrator encodes those rules once in a registry so every run
follows the same sequence.

It also enforces cross-cutting concerns that would otherwise be easy to miss:
user-approval checkpoints, blocking security gates, configured TDD order, and
the serial task-by-task dispatch loop.

## How it works

### 1. Registry-based routing

The orchestrator reads `.agents/agents/sdlc-orchestrator/references/routing-registry.yaml` at the project root. That file
is the single source of truth for:

- **Agent identities and file paths** — every agent name maps to its `.md` definition.
- **Trigger words** — keyword lists that indicate which route a request belongs to.
- **Workflow order** — the canonical phase sequence agents follow.
- **Artifact contracts** — what each agent produces, who receives it, and what
  feedback loops exist.

The orchestrator never hardcodes routes. If routing needs to change, the
registry is edited, not the orchestrator itself.

### 2. Intent classification

On every request the orchestrator:

1. Matches the user's words against `routes[].triggers` in the registry.
2. Chooses the most specific matching route (specialized beats generic; security
   and database routes beat general implementation when those keywords appear).
3. Loads the target agent definition from its `path`.
4. States the chosen agent and the trigger match in one line before proceeding.

When the user names a specific agent directly, classification is skipped and
the orchestrator hands off immediately. When no route matches, it answers
directly or asks a single clarifying question rather than forcing a route.

### 3. Workflow sequencing

For multi-stage work the orchestrator follows the `workflow.artifacts` section
of the registry, which specifies exactly what each agent produces and who
receives it. The sequence is:

```
product-agent
  → ba-agent (conditionally coordinates ux-agent for user-facing scope)
    ↔ ux-agent (returns design requirements feedback to ba-agent;
                writes docs/mocks/diagrams to docs/UX Designs/)
  → architect-agent → architecture-review-agent
  → project-planner-agent (approved backlog, one task at a time)

Per task (serial, one at a time in dependency order):
  → test-agent (test plan + failing scripts)
  → developer-agent (source code)
  → test-agent (test run: PASS / FAIL / BLOCKED)
  → spec-validation-agent (CONFORMANT or DRIFT/SPEC_GAP)
  → documentation-agent
  → security-check-agent (blocking pre-PR gate)
  → code-review-agent (APPROVED or CHANGES_REQUESTED)
  → project-planner-agent (marks task Done; dispatches next)

After all task PRs accepted:
  → deployment-agent → live release
  → production feedback → product-agent (next cycle)
```

**Feedback loops the orchestrator honors:**
- Test FAIL or BLOCKED → `developer-agent` (not back to the start)
- Spec DRIFT → `developer-agent`; SPEC_GAP → `ba-agent`
- Review CHANGES_REQUESTED → `developer-agent`
- Production feedback → `product-agent` (next planning cycle)

The orchestrator never reports a downstream stage complete based on an upstream
artifact alone. A tested branch is not reviewed; an approved PR is not deployed.

### 4. Approval gates

At each named checkpoint the orchestrator reads the gate value from
`ADLC_workflow_settings.json`:

| Value | Meaning |
|---|---|
| `required` | Present the validated artifact, obtain explicit user approval, and wait. |
| `skip` | Validate the artifact, record that review was skipped, and proceed. |

Artifact validation is always mandatory regardless of gate value. Three gates
are policy-locked and can never be skipped: `implementation_plan`,
`pull_request_merge`, and `production_release`.

### 5. Configurable behavior

Several workflow behaviors are controlled by `ADLC_workflow_settings.json`:

| Setting | Effect |
|---|---|
| `project_planner.wait_for_pr_approval` | When `true` (default), planner marks a task Done and dispatches the next only after code-review-agent approves the PR. |
| `test_red_team.trigger_mode` | Controls when test-agent invokes red-team-agent (never / every-commit / every-pr). |
| `security_check.pre_commit` / `.pre_pr` | Controls when security-check-agent runs (default: both enabled). |
| `llm_judge.trigger_mode` | Controls when an independent cross-model judge reviews architecture or implementation. |
| `spoken_plan.enabled` | When `true`, plays a conversational narration of each implementation plan before requesting approval. |

---

## How to invoke it

### Start here for multi-phase delivery

When a task spans more than one workflow phase, or when you are not sure which
specialist applies, start with the orchestrator:

```
Use sdlc-orchestrator to take this feature from idea through release.
```

```
Use sdlc-orchestrator to build the user authentication module.
```

```
Use sdlc-orchestrator — we have an approved PRD, continue from specifications.
```

### Trigger-based invocation

You can also describe what you need and let the orchestrator classify it:

| Intent keywords | Route |
|---|---|
| vision, market research, product direction, kickoff | product-agent |
| spec, requirements, user story, acceptance criteria | ba-agent |
| ux, wireframe, user flow, accessibility | ux-agent |
| architecture, system design, ADR, NFR, decomposition | architect-agent |
| architecture review, review ADR, review architecture | architecture-review-agent |
| backlog, estimate, sequencing, planning, Jira | project-planner-agent |
| implement, build, code, fix, refactor | developer-agent |
| test, e2e, coverage, regression | test-agent |
| spec drift, spec conformance, does it match the spec | spec-validation-agent |
| code documentation, document implementation | documentation-agent |
| review, PR review, security review, code quality | code-review-agent |
| deploy, release, CI/CD, rollback | deployment-agent |

### Named workflow shortcuts

Two pre-built workflows cover the most common multi-stage runs. Invoke them by
name or with the slash command:

| Workflow | Slash command | Scope |
|---|---|---|
| `project-definition-workflow` | `/project-definition-workflow` | Product → BA (with UX) → Architecture → Architecture review → Approved backlog. Stops before implementation. |
| `backlog-implementation-workflow` | `/backlog-implementation-workflow` | Backlog execution through TDD, spec conformance, security, documentation, and code review. Stops at the code-review handoff. |

---

## When to bypass the orchestrator

Go directly to a specialist when you already know exactly which phase you need
and you have the inputs it requires:

```
Use ba-agent to turn this PRD into testable specifications.
```

```
Use test-agent to create the test plan for the authentication task.
```

```
Use code-review-agent to review PR #47.
```

Parent agents dispatch their own subagents — you never invoke
`fe-developer`, `be-developer`, `data-architect`, or `red-team-agent`
directly unless you have a specific bounded reason to. The orchestrator and
each parent handle subagent selection automatically.

**Do not route through the orchestrator for:**
- General questions with no workflow home — it will answer them directly.
- Advisory consultations (pre-mortem, sounding board, cloud cost estimates,
  humanize text) — use `consultant-agent` or invoke the specialist directly.
- Knowledge base operations — use `obsidian-vault-agent` directly.

---

## Relationship to the registry

The orchestrator is intentionally thin: all routing logic lives in
`.agents/agents/sdlc-orchestrator/references/routing-registry.yaml`, not in the orchestrator's own definition. When routes
need to change — new agents, renamed phases, updated trigger words — edit the
registry. The orchestrator picks up the changes automatically on the next run.

The registry is at `.agents/agents/sdlc-orchestrator/references/routing-registry.yaml` in the project root. The workflow
diagram is the canonical source of truth for phase order; the registry resolves it.
