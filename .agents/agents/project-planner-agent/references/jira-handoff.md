# Jira Handoff

Use this reference after the local backlog markdown files have been created successfully.

## Trigger Rule
Attempt Jira creation only when all of the following are true:
- `project-root/.env` exists
- `JIRA_PROJECT_KEY` is present in that file
- `project-root/.agent/agents/jira-manager/jira-manager.md` exists

## Minimal Data Access
When checking `.env`:
- read only `JIRA_PROJECT_KEY`
- do not expose or summarize any other environment values
- do not copy `.env` contents into backlog files or user-facing summaries

## Handoff Package
Pass only:
- the created backlog file paths
- the `JIRA_PROJECT_KEY` value
- the source spec path
- any local issue-type mapping notes that are needed for Jira creation

## Expected Jira Handoff Behavior
The `jira-manager` agent should:
1. read the backlog files directly from disk
2. create the corresponding Jira epic and child issues
3. preserve the approved backlog structure as closely as project issue types allow
4. return a concise summary of created Jira items, mappings, and any skips or fallbacks

## Skip Cases
Skip Jira creation and say why when:
- `.env` is missing
- `JIRA_PROJECT_KEY` is missing
- `jira-manager` is unavailable
- Jira creation fails before any items are created

If Jira creation partially succeeds, report the created items and the failure clearly in the final summary.
