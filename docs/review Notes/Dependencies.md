# Jira Project Creation Dependencies

These notes cover operational dependencies for creating a Jira Software project.
They are not `package.json` dependencies.

## Status

Sound with path and ownership corrections. Jira project creation is setup work,
not a top-level ADLC workflow stage. During the ADLC workflow, backlog ownership
belongs to `project-planner-agent`.

## Canonical Skill

Use the local skill:

```text
.agents/skills/jira-project-creation/SKILL.md
```

Do not point agents at `~/.claude/skills/...`; this repository is designed to be
portable across Claude Code, Codex, Gemini CLI, Antigravity, and OpenCode.

## Required Inputs

Confirm before creating a Jira project:

- project name and key;
- description;
- workflow scheme name that already exists in the Jira instance;
- board type, normally Kanban;
- board columns, normally Backlog, To Do, In Progress, In Review, Done;
- issue/work types, normally Task, Epic, Bug, New Feature, and Improvement.

## Required Setup Sequence

1. Resolve Atlassian `cloudId` and current user `accountId`.
2. Find the workflow scheme ID by name.
3. Create a company-managed software project with `workflowScheme`.
4. Create a board filter for the project.
5. Share the filter; a private filter can make the board appear missing.
6. Create the Kanban board from the shared filter.
7. Split `In Review` from `In Progress` if Jira merges them by default.
8. Add required issue types to the project's issue type scheme.
9. Verify board columns and issue types before reporting completion.

## Critical Jira Notes

- Do not include `projectTemplateKey` when passing `workflowScheme`; those
  settings conflict for the intended company-managed project flow.
- Classic company-managed project board URLs require the `/c/` segment:
  `https://<site>.atlassian.net/jira/software/c/projects/<KEY>/boards/<boardId>`.
- The standard Agile API does not support all board column updates; the
  GreenHopper endpoint may be required for column remapping.
- Missing issue types after creation usually mean the issue type scheme needs to
  be updated.

## ADLC Consistency

- Jira project creation prepares the tracking system.
- `project-planner-agent` owns backlog sequencing and Jira or Markdown backlog
  updates during the workflow.
- `developer-agent` consumes approved backlog scope; it should not bypass the
  planner in the orchestrated flow.

## Inconsistencies Found

- Prior note referenced a Claude-specific global skill path.
- Prior title was ambiguous and looked like package dependency documentation.

## Proposed Improvements

- Link this note from any Jira setup UI only as an operational reference.
- Add a checklist for required Jira permissions if project creation fails.
