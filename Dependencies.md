#DEPENDENCIES: 

## The JIRA project creation workflow needs to have the project created with the correct project type, boards and workflow scheme.
For that ensure that you use a skill that matches the creation criteria.
Right now it is skill ~/.claude/skills/jira-project-creation/SKILL.md

---
name: jira-project-creation
description: Use when asked to create a Jira Software project. Covers company-managed (classic) project setup, workflow scheme assignment, Kanban board creation, column configuration, and issue type setup. Use when the user says "create a Jira project", "set up a Jira project", or gives project name/key/description parameters.
---

# Jira Project Creation

## Overview

Creating a Jira Software company-managed project via REST API requires several steps beyond the initial `POST /project` call. The board, columns, and issue types all need explicit configuration — defaults are always wrong.

Uses `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` environment variables. Never ask the user to create anything manually unless blocked by missing permissions.

## Required Parameters

Confirm these before starting:
- **Name** and **Key** (e.g. `AABB`)
- **Description**
- **Workflow scheme name** (must exist in the instance)
- **Board type** (default: Kanban)
- **Board columns** (default: To Do, In Progress, In Review, Done)
- **Work types** (default: Task, Epic, Bug, New Feature, Improvement)

---

## Steps

### 1. Get cloudId and account ID

Run both in parallel:
- `getAccessibleAtlassianResources` → note `id` (cloudId)
- `atlassianUserInfo` → note `account_id`

### 2. Find workflow scheme ID

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Accept: application/json" \
  "${JIRA_BASE_URL}rest/api/3/workflowscheme"
```

Match by `name` → note the `id`.

### 3. Create the project

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}rest/api/3/project" \
  -d '{
    "key": "<KEY>",
    "name": "<NAME>",
    "projectTypeKey": "software",
    "description": "<DESCRIPTION>",
    "leadAccountId": "<accountId>",
    "workflowScheme": <schemeId>,
    "assigneeType": "PROJECT_LEAD"
  }'
```

**Critical:** Do NOT include `projectTemplateKey`. It conflicts with `workflowScheme` and causes an error. Omitting the template and passing `workflowScheme` directly produces a classic (company-managed) project (`"style": "classic", "simplified": false`).

Note the returned project `id`.

### 4. Create the board filter

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}rest/api/3/filter" \
  -d '{"name": "<KEY> Kanban Filter", "jql": "project = <KEY> ORDER BY created DESC"}'
```

Note the returned filter `id`.

### 5. Share the filter

Required — the board will 404 if the filter is private.

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}rest/api/3/filter/<filterId>/permission" \
  -d '{"type": "authenticated"}'
```

### 6. Create the Kanban board

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}rest/agile/1.0/board" \
  -d '{
    "name": "<KEY> board",
    "type": "kanban",
    "filterId": <filterId>,
    "location": {"type": "project", "projectKeyOrId": "<KEY>"}
  }'
```

Note the returned board `id`.

### 7. Fix board columns

**Why:** Jira merges "In Review" into the "In Progress" column by default. You must split it out.

First read the current column IDs and status IDs:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Accept: application/json" \
  "${JIRA_BASE_URL}rest/greenhopper/1.0/rapidviewconfig/editmodel?rapidViewId=<boardId>"
```

Inspect `rapidListConfig.mappedColumns` for column `id` values and `mappedStatuses[].id` values.

Then rewrite columns via the GreenHopper API — the standard Agile API does not support PUT on board configuration:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT -H "Accept: application/json" -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}rest/greenhopper/1.0/rapidviewconfig/columns" \
  -d '{
    "rapidViewId": <boardId>,
    "mappedColumns": [
      {"id": <backlogColId>, "name": "Backlog",      "isKanPlanColumn": true,  "mappedStatuses": []},
      {"id": <todoColId>,    "name": "To Do",        "isKanPlanColumn": false, "mappedStatuses": [{"id": "<toDoStatusId>"}]},
      {"id": <inProgColId>,  "name": "In Progress",  "isKanPlanColumn": false, "mappedStatuses": [{"id": "<inProgressStatusId>"}]},
      {"id": null,           "name": "In Review",    "isKanPlanColumn": false, "mappedStatuses": [{"id": "<inReviewStatusId>"}]},
      {"id": <doneColId>,    "name": "Done",         "isKanPlanColumn": false, "mappedStatuses": [{"id": "<doneStatusId>"}]}
    ]
  }'
```

`"In Review"` gets `"id": null` because it is a new column being created.

### 8. Fix issue types

**Why:** Projects created without a template start with only Task + Sub-task.

Get the project's issue type scheme ID:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Accept: application/json" \
  "${JIRA_BASE_URL}rest/api/3/issuetypescheme/project?projectId=<projectId>"
```

Note `issueTypeScheme.id`. Then find the IDs of the needed types:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Accept: application/json" \
  "${JIRA_BASE_URL}rest/api/3/issuetype"
```

Add the missing types (Epic, Bug, New Feature, Improvement) to the scheme:

```bash
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -X PUT -H "Accept: application/json" -H "Content-Type: application/json" \
  "${JIRA_BASE_URL}rest/api/3/issuetypescheme/<schemeId>/issuetype" \
  -d '{"issueTypeIds": ["<epicId>", "<bugId>", "<newFeatureId>", "<improvementId>"]}'
```

A 400 "already present" error is harmless — it means they were already in the scheme.

### 9. Verify and report

Run in parallel:

```bash
# Confirm columns
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "${JIRA_BASE_URL}rest/agile/1.0/board/<boardId>/configuration"

# Confirm issue types
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "${JIRA_BASE_URL}rest/api/3/project/<KEY>?expand=issueTypes"
```

Report the project key and board URL:

```
https://<site>.atlassian.net/jira/software/c/projects/<KEY>/boards/<boardId>
```

**The `/c/` segment is required for classic (company-managed) projects. Omitting it causes a 404.**

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Including `projectTemplateKey` with `workflowScheme` | Remove `projectTemplateKey` entirely |
| Board 404 after creation | Filter must be shared (`type: authenticated`) |
| Board URL without `/c/` | Classic projects require `/c/` in path |
| Only Task visible in work types | Add Epic, Bug, New Feature, Improvement to issue type scheme |
| In Review missing from board | Split it from In Progress via GreenHopper columns API |
| `PUT /rest/agile/1.0/board/{id}/configuration` → 405 | Use GreenHopper API instead: `PUT /rest/greenhopper/1.0/rapidviewconfig/columns` |
