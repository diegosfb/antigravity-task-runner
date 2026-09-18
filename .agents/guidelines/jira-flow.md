# Jira Flow and Work-Tracking Guideline

This is the operational work-tracking contract for agents using Jira in this
repository. It governs issue creation, required fields, dependencies,
assignment, transitions, board behavior, automation, and environment-related
delivery controls. It is not optional reference material.

The precedence order is `constitution.md` → `AGENTS.md` → this guideline. The
Git and pull-request lifecycle must also comply with
`.agents/guidelines/github-flow.md`. If the two guidelines appear to conflict,
stop and ask rather than silently choosing one.

## Tracking-system policy

Jira is the preferred system of record for product and engineering work.
GitHub Issues may be used instead for an explicitly small and simple project
when the repository owner approves that choice. Do not maintain competing
sources of truth for the same backlog.

The `project-planner-agent` remains the sole writer and sequencer of the
backlog. Other workflow agents may update fields, comments, assignment, and
status when their lifecycle responsibility requires it, but they must not
silently redefine scope, dependencies, priority, or acceptance criteria.

## Standard lifecycle

The default flow is:

```text
Backlog → To Do → In Progress → In Review → Done
```

Projects with manual QA may add `To Test`:

```text
Backlog → To Do → In Progress → In Review → To Test → Done
```

### Status definitions

- **Backlog:** The item is not prioritized, is still being defined, or is not
  ready for delivery.
- **To Do** (or **Ready**): The item is fully defined, prioritized, unblocked,
  and ready to be claimed.
- **In Progress:** The item is assigned and actively being implemented.
- **In Review:** A pull request is open and undergoing automated and human
  review. Implementation fixes remain in this stage's branch and PR loop.
- **To Test** (optional): The PR is approved and merged, and the merged `main`
  artifact awaits or is undergoing manual QA/UAT.
- **Done:** The item meets the Definition of Done. Without `To Test`, a merged,
  approved PR may transition here when policy treats post-merge QA as release
  validation. With `To Test`, successful manual QA is required first.

Do not skip states merely because the Jira instance permits it. If a required
state is unavailable, report the workflow mismatch and obtain an approved
mapping rather than silently moving to a later state.

## Definition of ready

An item may move from Backlog to To Do only when it has:

- A clear, mandatory summary.
- A mandatory description with sufficient delivery context.
- Acceptance criteria when behavior is being changed.
- A defined issue type.
- Known dependencies and blockers.
- Priority and estimate when the team's planning process requires them.
- Links to relevant PRD, specification, ADR, design, or parent issue.

## Recommended issue types

- **Epic:** A large capability grouping related work.
- **Story** or **Feature:** User-facing behavior that produces user or business
  value.
- **Task:** Technical, operational, documentation, or internal work.
- **Bug:** A defect in expected behavior.
- **Hotfix** (optional): An urgent defect affecting production that requires
  expedited handling without bypassing safety gates.

Use the most specific configured type. Do not label ordinary defects as
hotfixes to gain priority.

## Dependencies

Dependency direction must describe execution order correctly:

- **Blocks** (outgoing): Task A blocks Task B. Task A must finish before Task B
  can proceed.
- **Is Blocked By** (incoming): Task B is blocked by Task A. Task B waits for
  Task A.

Create links only after both issues exist. Verify the inward and outward labels
supported by the Jira instance before writing. Never reverse a dependency to
match conversational wording. A blocked item must not move to To Do or In
Progress until its blocking condition is resolved or an explicit exception is
recorded.

## Required fields and transition controls

- **Summary:** mandatory at issue creation.
- **Description:** mandatory at issue creation.
- **Assignee:** mandatory when moving from To Do to In Progress.
- **Priority:** recommended; normally set by the product manager, project
  manager, or Scrum Master.
- **Story points or t-shirt size:** recommended during planning and estimation.
- **Acceptance criteria:** required for stories, features, bugs, and any task
  that changes observable behavior.

Configure transition validators where possible. If automation is unavailable,
agents enforce these rules themselves and report missing data instead of
skipping it.

## Assignment

- New backlog items are unassigned unless the user explicitly requests an
  assignee or project policy requires one.
- Moving an item to In Progress assigns it to the executing team member.
- Jira may auto-assign on the In Progress transition when configured.
- Verify the final assignee after a transition; do not assume automation
  succeeded.
- Do not assign work to a person without authorization or a clear team rule.

## Pull-request integration

Jira state and GitHub Flow must remain synchronized:

1. A To Do item is claimed, assigned, and moved to In Progress.
2. Work uses a short-lived branch named according to
   `.agents/guidelines/github-flow.md`, including the Jira key.
3. Opening the PR moves the item to In Review, automatically when integration
   is configured or explicitly otherwise.
4. Review fixes stay on the same branch and PR; the item remains In Review.
5. Merging the approved PR with Squash and Merge moves the item:
   - to `To Test` when manual QA is part of the board; or
   - to `Done` when the configured workflow has no manual-test state.
6. A failed post-merge QA result creates a new linked Bug or Hotfix from the
   latest `main`; do not reopen development on the merged feature branch.

Never transition an item to Done merely because implementation is locally
complete or tests pass on an unmerged branch.

## Automation and monitoring

Recommended Jira/GitHub automation:

- Auto-assign the actor when an item moves to In Progress.
- Auto-move to In Review when a linked PR opens.
- Auto-move to To Test or Done when the linked PR merges, according to the
  configured QA model.
- Alert when an issue remains blocked longer than the team's configured
  threshold.
- Restrict skipping lifecycle states.
- Require key fields on creation and transitions.

Agents must verify automation results. Automation failure does not authorize a
silent inconsistent state.

## Board setup

### Scrum board

Recommended for most teams:

- Enable the backlog view.
- Use two-week sprints unless the team defines another cadence.
- Plan priority and estimates during refinement or sprint planning.

### Kanban board

- Do not use sprints.
- Pull the highest-priority unblocked To Do item.
- Apply work-in-progress limits when configured.
- Preserve the same lifecycle meanings and transition controls.

## Environment management

| Area | DEV | QA | PROD |
|---|---|---|---|
| Purpose | Build, unit tests, developer integration | Testing, UAT, regression, release validation | Live users and business operations |
| Data | Synthetic or masked only | Masked production-like data | Real production data |
| Access | Development team | QA and DevOps controlled | Very limited, approved or just-in-time |
| Infrastructure | Smaller and cheaper | Production-like but scaled down | Highly available, disaster-recovery capable, hardened |
| Integrations | Mocks, stubs, sandboxes | Partner test endpoints | Real partner endpoints |
| Deployment | Frequent and automated where possible | Controlled from the merged release candidate | Approved release only |
| Deployment owner | Authorized developer or automation | QA lead or DevOps, triggered from merged `main` | Release manager or designated approver |

### Environment-isolation principles

- Use separate cloud projects, accounts, or subscriptions for DEV, QA, and
  PROD.
- Reuse the same Terraform modules across environments with different
  environment-specific variables.
- Promote immutable artifacts, not source code. Build once and promote the same
  image or package from DEV to QA to PROD.
- Do not rebuild separately for each environment.
- Separate configuration from code and use environment-specific configuration
  stores.
- Keep API keys, service accounts, topics, queues, callback URLs, and other
  credentials/resources separate per environment.
- Store secrets in the approved secret manager; never in Jira, source files,
  pipeline configuration committed to the repository, or vault notes.

### Integration controls

- DEV uses mocks, stubs, or sandbox APIs.
- QA uses partner test environments with realistic contracts.
- PROD uses real integrations only.

### Data controls

- DEV uses synthetic data.
- QA uses masked or anonymized production-like data.
- PROD uses real data protected by encryption and access control.
- Never copy raw production data to DEV.
- Refresh QA data only through an approved masking pipeline.

## Agent behavior and safety

- Read the current issue before editing or transitioning it.
- Show original versus proposed content before replacing a Jira description;
  Jira edits may not have a simple undo path.
- Confirm exact target issue keys, transition names, assignees, and dependency
  direction before writes.
- Comment with concise implementation, blocker, assumption, or test evidence
  when the lifecycle playbook requires it.
- Do not expose Jira credentials, tokens, user data, or production secrets in
  commands, logs, comments, or vault records.
- Report partial success precisely when a multi-issue operation fails.
- Never delete issues or perform bulk transitions without explicit user
  authorization and a verified target set.

## Completion

Jira tracking is complete when the issue accurately reflects its scope,
dependencies, assignment, evidence, PR state, QA model, and final outcome. Jira
and GitHub must describe the same delivery state; neither system may silently
advance ahead of the other.
