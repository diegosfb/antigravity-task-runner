# How to use dsfb-sdlc v2

There are two ways to run this library. Both work; pick based on whether you want a single entry point or direct control.

## Option A - Orchestrated (single entry point)
Point your runtime at **`.agents/agents/sdlc-orchestrator/sdlc-orchestrator.md`** and talk to it in plain language.

```
"Build a feature that lets premium users export their dashboard to PDF."
```
The orchestrator reads `routing-registry.yaml`, matches your intent to a route, dispatches the right agent, and sequences the handoffs along the workflow (product -> ba -> architect -> ux -> planner -> backlog -> developer -> test -> review -> deployment). It honors the loops (test fail and change request go back to developer; production feedback goes back to product).

Use this when a task spans phases or you don't want to think about which specialist to call.

## Option B - Direct (you pick the agent)
Invoke an agent yourself. Use `routing-registry.yaml` as your lookup table (routes -> target -> path).

```
"Use ba-agent to turn this vision doc into a spec with acceptance criteria."
"Use project-planner-agent to sequence and estimate these tasks into a backlog."
"Use code-review-agent to review this PR."
```
Every agent file is self-contained (role, workflow position, operating rules, attached skills, merged references). Use this when you already know the specialist you need.

## Running Claude Code with spoken plans on macOS

Start Claude Code from the repository root in a normal macOS terminal session:

```bash
cd "/absolute/path/to/dsfb-sdlc-v2"
claude
```

Launching from the root matters because Claude loads `CLAUDE.md` from this
project and its spoken-plan commands call `scripts/speak-plan.sh` with a
repository-relative path. The shared behavior is controlled by
`ADLC_workflow_settings.json`:

- `spoken_plan.enabled: true` makes Claude explain each implementation plan
  aloud before requesting approval.
- `spoken_plan.interrupted_by_next_command: true` lets the next user command
  stop narration without treating the interruption as approval.
- The written plan and explicit user-approval gate remain mandatory whether or
  not audio is enabled or succeeds.

Claude may ask for permission to run `bash scripts/speak-plan.sh ...`. Allow
that repository-local command so it can reach the host macOS GUI/audio session.
The helper uses `/usr/bin/say`, keeps background narration isolated per
repository, and cleans up background narration files.

If no audio is heard:

1. Confirm both `spoken_plan` values above are booleans and `enabled` is `true`.
2. Confirm the terminal is in the repository root with `pwd`.
3. Allow Claude's Bash request for `bash scripts/speak-plan.sh ...`.
4. Check the Mac output device, volume, and mute state.
5. If the helper reports status `70`, rerun it with access to the macOS
   GUI/audio session; do not trust a sandboxed `/usr/bin/say` exit code as proof
   that sound played.

Use this manual check from the repository root when diagnosing playback:

```bash
printf '%s\n' 'Claude spoken plan audio test.' > /private/tmp/claude-plan-audio-test.txt
bash scripts/speak-plan.sh start /private/tmp/claude-plan-audio-test.txt
```

## The one rule that keeps the workflow intact
Nothing reaches `developer-agent` except through the **task backlog** produced by `project-planner-agent`. Planning agents write to the backlog only through the planner; execution agents only pull from it. If you route straight from a spec to the developer, you have skipped sequencing, estimation, and dependency resolution.

## Loading a skill
Agents reference skills as `skills/<name>`. When an agent says "load `skills/architecture-designer`", that resolves to `.agents/skills/architecture-designer/SKILL.md` in this package. All 67 skills are here; nothing is external.

## Dormant subagents and SMEs
- `developer-agent` fans out to fe/be/data by default, and to mobile/iot/embedded/blockchain/databricks only when the backlog or ADRs bring that stack in (`activates_when`). You don't call these directly.
- `architect-agent` fans out the same way on the design side: data-architect by default, and mobile/iot/embedded/blockchain/databricks-architect when the specs bring that domain in. They are design specialists - they contribute domain constraints, ADR input, and decomposition edges, never code.
- The platform SMEs are now `consultant-agent` subagents: `gcp-sme`, `doc-generator` (active) and dormant `aws-sme`/`azure-sme`/`snowflake-sme` under `.agents/agents/consultant-agent/subagents/`. They advise; they are not workflow stages. Workflow agents (architect-agent, data-developer) consult them by name; you can also invoke them directly. See `.agents/agents/consultant-agent/references/consulting-smes.md`.

## Product artifacts
- `product-agent` writes the PRD to `docs/project_description/PRD.md` (per its `references/prd-template.md`) - the formal interface to `ba-agent`, which takes it as primary input for speccing. On production-feedback cycles the PRD is revised, not appended to.

## Architecture artifacts
- `architect-agent` writes the solution architecture to `docs/architecture/architecture.md` (per its `references/architecture-template.md`) and ADRs to `docs/architecture/adrs/NNNN-<kebab-case-title>.md`.
- If `docs/architecture/development_guidelines.md` exists, the architect treats it as binding guardrails for every decision - drop one there per project to constrain stack, style, and scope.
- developer-agent's Jira execution (references/jira-execution-playbook.md) enforces those same artifacts as the implementation constraint hierarchy.

## Cross-model judging (optional gate)
After an architecture design, solutioning pass, or implementation, invoke `llm-judge-agent` for an independent second opinion: it has a DIFFERENT LLM than the author judge the artifact against rubrics and writes a report to `docs/reviews/` (verdict + evidence-backed findings + ranked improvements). It is advisory - REWORK verdicts route back to the producing agent, and it never substitutes for test-agent or code-review-agent.

Automation is per-project via `ADLC_workflow_settings.json` at the project root: set `llm_judge.trigger_mode` to `on-demand` (default when the file is missing), `architecture` (judge fires after architect-agent output), `architecture-and-risky-dev` (also after high-risk dev tasks), or `architecture-and-all-dev` (also after every dev task).

The judge runs on a **different model than the author** — ideally a different provider. It reads what produced the artifact from provenance the producing agents stamp (`generated_by: <provider>/<model>` on architecture docs/ADRs, `Generated-by:` commit trailer on code), then reaches a different judge model. Set `llm_judge.judge_provider` and `llm_judge.judge_command` (e.g. `"google"` + `"gemini"`, or `"openai"` + `"codex"`) to pin the cross-model backend deterministically; leave them empty to auto-detect an available cross-provider CLI or API key. If only the same provider is reachable, the judge proceeds but banners the report as SAME-MODEL with reduced confidence.

`spec-validation-agent` is a second advisory gate that checks a change against its spec two ways: **spec-drift-checker** (has behavior drifted from `docs/specs/`?) and **spec-red-team** (spec-aware adversarial security against an ephemeral, synthetic-data target). Both are REVIEW INPUT, never build blockers. Toggle per project with `spec_validation.drift_check_mode` (`on-demand` | `on-implementation`) and `spec_validation.red_team_mode` (`on-demand` | `pre-release`). The red-team pass runs via `.agents/workflows/red-team-workflow.md` (`/red-team-workflow`).

```
"Use spec-validation-agent to check this diff for drift against docs/specs."
"Run the red-team workflow against the staging environment before we ship."
```

To take an idea through product definition, requirements, architecture, UX,
and an organized backlog without starting implementation, run
`.agents/workflows/project-definition-workflow.md`
(`/project-definition-workflow`). It preserves the PRD, specifications,
architecture, UX/UI, and backlog approval gates and writes the final backlog to
Jira or `docs/backlog/` according to the project's selected system of record.

To implement an approved epic, sprint, release, or item set in backlog order,
run `.agents/workflows/backlog-implementation-workflow.md`
(`/backlog-implementation-workflow`). It coordinates planner-owned ordering and
status, developer implementation, spec conformance and security validation,
and test verification. It stops with validated branches or pull requests ready
for code review; it does not review, merge, or deploy them.

```
"Use llm-judge-agent to evaluate docs/architecture/architecture.md against the specs."
"Get a second opinion on this feature branch before I send it to review."
```

## Keeping the registry honest
Run the validator whenever you add, rename, or move an agent:
```
python3 validate-registry.py
```
It fails if any registered path is missing, any route points to an unregistered target, or any artifact producer isn't a registered agent. Wire it into pre-commit or CI to prevent drift (see docs/architecture/adrs/0001).

## If you add an agent
1. Create `.agents/agents/<slug>/<slug>.md`.
2. Register it under `targets.agents` in `routing-registry.yaml` with its path.
3. Add a route under `routes` with trigger keywords.
4. Run `python3 validate-registry.py`.
Never edit `sdlc-orchestrator.md` for routing - it reads the registry.
