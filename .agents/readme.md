# Agentic Resources

This directory contains the agents, skills, workflows, guidelines, and supporting resources used by the SDLC framework.

## Agents

`agents/` contains the role definitions that perform and coordinate work. Each agent document defines its responsibilities, inputs, outputs, boundaries, workflow position, and the skills it may load.

Top-level agents own a workflow stage or cross-cutting function. Some delegate specialized work to subagents stored beneath their directory. Subagents remain accountable to their parent agent and may be active by default, conditionally activated, or dormant until matching scope appears. Agents can also be invoked directly when their definitions allow it.

See the [agents catalog](agents/agents-catalog.md) for the complete ownership hierarchy and activation guidance.

## Skills

`skills/` contains reusable instructions, methods, and domain expertise that agents load for particular tasks. Skills describe how to perform a capability, such as architecture design, accessibility testing, data modeling, or prompt engineering.

A skill is not a workflow role: agents own decisions and deliverables, while skills provide the specialized procedure or knowledge used to produce them. Multiple agents may use the same skill, and one agent may combine several skills when the task requires it.

See the [skills catalog](skills/skills-catalog.md) for descriptions and usage guidance.

## Agent and Subagent Philosophy

The library separates **ownership**, **specialized judgment**, and **reusable method**:

```text
Workflow or user request
        |
        v
Parent agent — owns the decision, artifact, and handoff
        |
        +--> Subagent — handles one bounded specialist responsibility
        |         |
        |         `--> Skill — loads the method needed for that task
        |
        `--> Skill — parent applies a reusable method directly when delegation adds no value
```

### Agents own outcomes

A parent agent represents a stable role in the operating model. It owns the
stage contract, resolves conflicts across specialties, validates the integrated
result, and remains accountable for the final artifact and downstream handoff.
Delegation does not transfer that accountability.

For example, `architect-agent` owns the solution architecture and ADRs even
when `data-architect` supplies data-domain decisions. `developer-agent` owns an
integrated implementation even when frontend, backend, and data work is
performed by different implementation subagents.

### Subagents isolate specialist judgment

A subagent is appropriate when part of an agent's responsibility has a distinct
domain, decision model, activation condition, or deliverable that benefits from
a focused working context. The parent sends it only the relevant task,
constraints, and evidence, then integrates its result.

This provides several benefits:

- **Precise routing:** each request reaches the specialist whose boundaries and
  tools match the work. A mobile architecture question need not activate
  blockchain, embedded, or Databricks guidance.
- **Explicit capability use:** parent definitions state which subagents are
  active, dormant, or conditionally activated and which skills each may load.
  This makes behavior inspectable instead of relying on a broad general prompt.
- **Smaller working contexts:** a specialist can receive the relevant slice of
  requirements, ADRs, code, or evidence instead of every instruction known to
  the parent. Unrelated domain guidance does not compete for attention.
- **Stronger boundaries:** design, implementation, testing, assurance, and
  consultation retain separate responsibilities and verdicts. A specialist
  cannot silently take ownership of another stage.
- **Independent verification:** review and assurance subagents can evaluate an
  artifact from a different role without inheriting the producer's objective.
- **Conditional scale:** dormant specialists add no normal routing burden and
  activate only when their documented condition appears. Independent bounded
  tasks may run concurrently when the runtime supports delegation.
- **Maintainability:** a specialist can evolve without expanding every parent
  definition, while the parent preserves one stable public interface and
  integration contract.

Subagents can improve effective performance by reducing irrelevant context,
making tool and skill selection more deterministic, and allowing safe
concurrency. They do not guarantee lower latency or token usage: delegation has
startup, coordination, and integration cost. For small or tightly coupled work,
the parent should act directly.

### Skills provide methods, not ownership

A skill packages reusable instructions, references, templates, or deterministic
scripts. It does not become a separate organizational role merely because it is
specialized. Load a skill directly when the work needs a method but not an
independent decision-maker or separate handoff.

This distinction prevents duplicate logic. For example, `capacity-manager`
coordinates staffing decisions as a consultant subagent but loads
`delivery-capacity-planner` and `recruiting-capacity-planner` as the shared
methods. `marketing-manager` owns communications intake and approval readiness
while `press-release` and `thought-leadership-writing` remain reusable writing
methods. Other agents can use the same skills without copying their instructions.

### Activation and context discipline

Parent agents should disclose specialist context progressively:

1. Classify the request against the parent's responsibility and known routing
   rules.
2. Activate only the subagent whose condition matches; leave unrelated dormant
   specialists inert.
3. Pass the minimum complete context needed for the specialist to decide well,
   including governing constraints and source evidence.
4. Load only the skills and supporting references required for that bounded
   task.
5. Return a structured result to the parent, which resolves cross-domain seams,
   validates the whole, and owns the final handoff.

The goal is not to create the largest possible agent tree. It is to keep one
clear owner while giving materially different work the smallest complete
context and the most relevant expertise.

### Examples in this library

| Parent | Subagent use | Why it is separated |
|---|---|---|
| `architect-agent` | Active `data-architect`; dormant mobile, IoT, embedded, blockchain, and Databricks architects | Domain constraints and ADR-ready decisions differ, while the parent must resolve cross-domain architecture. |
| `developer-agent` | Frontend, backend, data, and conditionally activated platform builders | Implementation contexts and tooling differ, while the parent integrates shared contracts and enforces ADRs. |
| `consultant-agent` | Capacity, marketing, explanation, challenge, cloud-cost, and platform specialists | Ad-hoc questions route to a narrow expert without inserting every consultant into the SDLC workflow or project context. |
| `spec-validation-agent` | Spec-drift, security-check, and conditional red-team specialists | Each assurance mode has different evidence, authority, and verdict semantics that must remain independent. |

### When not to create a subagent

Prefer a skill, reference, or direct parent behavior when the capability:

- is only a reusable procedure or body of knowledge;
- has no distinct decision rights, activation rule, or output contract;
- is always required and tightly coupled to the parent's core reasoning;
- would duplicate another agent or skill's source of truth; or
- costs more to dispatch and integrate than the bounded task itself.

Create a subagent only when specialization produces a clearer responsibility,
safer boundary, smaller relevant context, or independently useful result.

## Guidelines

`guidelines/` contains vendor-neutral operating procedures for repository management, Jira, security, infrastructure, and monitoring. These documents are binding whenever their subject applies; a task may require more than one guideline.

Guidelines do not replace requirements or grant additional authority. Apply them beneath `constitution.md` and `AGENTS.md`, which take precedence if instructions conflict. Read every applicable guideline before performing the governed operation.

See the [guidelines index](guidelines/readme.md) for the authority order and the trigger for each guideline.

## Catalogs

- [Agents catalog](agents/agents-catalog.md): 49 workflow agents and subagents, grouped by owning agent with responsibilities and activation guidance.
- [Skills catalog](skills/skills-catalog.md): 93 loadable skills with descriptions and usage guidance.

Platform SMEs and specialist consultants live under `agents/consultant-agent/subagents/`. They provide advice and specialist deliverables; they do not implement application code unless their definition explicitly says otherwise.

## Workflows

`workflows/` contains user-invoked, multi-step commands, including playlist-style orchestration.

## Platform-specific hooks

The agents, skills, workflows, and guidelines under `.agents/` are shared
resources, but hook configuration is platform-specific. In this repository:

- `.agents/hooks.json` is used only by Codex and invokes the recorder with
  `--platform codex`.
- `.claude/settings.json` configures the equivalent Claude Code hooks.
- `.gemini/settings.json` configures the equivalent Gemini CLI hooks.

Do not assume that every file under `.agents/` is interpreted by every agentic
platform. Keep equivalent hook behavior synchronized across these three files
while preserving each platform's native event names, schema, timeout units,
and project-root conventions.
