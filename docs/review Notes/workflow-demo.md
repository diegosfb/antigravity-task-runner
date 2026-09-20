# Task Runner — Developer Workflow Reference

A visual map of how a developer uses the Task Runner sidebar to follow best practices from first commit through production release. Each sidebar action is highlighted in **bold** the first time it appears.

---

## Overview: The Full Development Cycle

```mermaid
flowchart TD
    A([Start of day / new work]) --> B{Is this a new issue?}

    B -- Yes, Jira project configured --> C[🟡 Take Jira Item or Add Jira Item]
    B -- Yes, no Jira --> D[🟡 Create Feature Branch]
    B -- No, continuing existing work --> E[🟡 Pull Remote and Merge]

    C --> D
    D --> E

    E --> F[🔨 Code changes]

    F --> G[🟡 Build Project]
    G --> H{Build passes?}
    H -- No --> F
    H -- Yes --> I[🟡 Run Project Tests]

    I --> J{Tests pass?}
    J -- No --> F
    J -- Yes --> K[🟡 Commit]

    K --> L{More work on branch?}
    L -- Yes --> F
    L -- No --> M[🟡 Pull Remote and Merge]

    M --> N{Conflicts?}
    N -- Yes --> O[Resolve conflicts locally] --> M
    N -- No --> P[🟡 Create Pull Request]

    P --> Q[🟡 Jira Item Completed → In Review]
    Q --> R([Awaiting review])

    R --> S{Review outcome}
    S -- Changes requested --> T[Address feedback on same branch] --> K
    S -- Approved --> U[🟡 Merge branch to main]

    U --> V[🟡 Jira Item Completed → Done]
    V --> W{Release needed?}
    W -- Yes --> X[🟡 Increment Version + Create Repo Release]
    W -- No --> Y([Done])
    X --> Y
```

---

## Phase 1: Project Setup (first time only)

```mermaid
flowchart LR
    S1[Open VS Code in project folder] --> S2[Init Repository]
    S2 --> S3[Workspace Setup]
    S3 --> S4[Create CLAUDE.md / AGENTS.md]
    S4 --> S5[Configure settings via ⚙️ Settings gear]
    S5 --> S6{Jira?}
    S6 -- Yes --> S7[Select/Set Jira Project]
    S6 -- No --> S8([Ready to develop])
    S7 --> S8
```

**Sidebar actions used:**

| Step | Sidebar Item | Purpose |
|------|-------------|---------|
| 1 | **Init Repository** | Creates `.git`, sets up remote |
| 2 | **Workspace Setup** | Scaffolds `.agent/` folder structure |
| 3 | **Create CLAUDE.md** | Adds project-level AI guidance file |
| 4 | ⚙️ Settings (gear icon) | Set build command, test command, default reviewer |
| 5 | **Select/Set Jira Project** | Links repo to a Jira project key |

---

## Phase 2: Starting a Work Item

### 2A — Standard feature or fix (no Jira)

```mermaid
flowchart LR
    A([Has issue to work on]) --> B[Create Feature Branch]
    B --> C{Branch type?}
    C -- New capability --> D[feature/short-description]
    C -- Bug fix --> E[fix/short-description]
    C -- Urgent production fix --> F[hotfix/short-description]
    D & E & F --> G([Branch created, upstream pushed])
```

### 2B — Jira-driven work (yourself)

```mermaid
flowchart LR
    A([Jira project configured]) --> B[Take Jira Item Assign]
    B --> C[Item assigned to you, moved to In Progress]
    C --> D[Create Feature Branch]
    D --> E([Branch named after Jira key])
```

### 2C — Agent-driven work

```mermaid
flowchart LR
    A([Jira project configured]) --> B[🧠 Assign Jira Item to Agent]
    B --> C[Choose Jira item + target agent]
    C --> D[Jira updated: assigned, label added, In Progress]
    D --> E[Agent harness launched in terminal]
    E --> F([Agent works autonomously])
```

> **When to use each:**
> - Use **2A** when you are coding the feature yourself with no Jira tracking.
> - Use **2B** when you are coding yourself and want Jira kept up to date.
> - Use **2C** to hand off a ticket entirely to an AI agent.

---

## Phase 3: The Development Loop

This loop repeats until the branch is ready for review.

```mermaid
flowchart TD
    A([Branch ready, editor open]) --> B[Make code changes]

    B --> C[Build Project]
    C --> D{Build OK?}
    D -- No, fix errors --> B
    D -- Yes --> E[Run Project Tests]

    E --> F{All tests pass?}
    F -- No, fix failures --> B
    F -- Yes --> G{Optional: risky behavior change?}

    G -- Yes --> H[🧠 Set Feature Flag for changes]
    G -- No --> I[Commit]
    H --> I

    I --> J{Optional: want AI review before PR?}
    J -- Yes --> K[🧠 Agentic review of Merge]
    J -- No --> L{More changes needed?}
    K --> L
    L -- Yes --> B
    L -- No --> M([Branch ready for PR])
```

**Sidebar actions used:**

| Step | Sidebar Item | What it does |
|------|-------------|--------------|
| Build | **Build Project** | Runs `antigravity.buildCommand` |
| Test | **Run Project Tests** | Runs `antigravity.projectTestingCommand` |
| Commit | **Commit** | Stages changes, generates AI commit message (via Light Harness), creates commit |
| Feature flag | 🧠 **Set Feature Flag for changes** | Wraps new behavior in `.env`-driven flags |
| AI review | 🧠 **Agentic review of Merge** | Opens harness-driven review focused on merge diff |

> **Commit note:** The **Commit** action excludes `.env` / `config/.env` automatically. It uses the **Light Agentic Harness** (fast/cheap model) for message generation when `antigravity.useAgentForGithubRepositoryManagement` is enabled.

---

## Phase 4: Preparing and Opening the PR

```mermaid
flowchart TD
    A([Branch work complete]) --> B[Pull Remote and Merge]
    B --> C{Merge conflicts?}
    C -- Yes --> D[Resolve conflicts in editor] --> E[Commit resolved merge] --> B
    C -- No --> F[Run Project Tests]
    F --> G{Tests still pass?}
    G -- No --> H[Fix regressions] --> E
    G -- Yes --> I[Create Pull Request]
    I --> J[PR created with Why/How description + reviewer tagged]
    J --> K{Jira configured?}
    K -- Yes --> L[Jira Item Completed → In Review]
    K -- No --> M([Awaiting review])
    L --> M
```

**Sidebar actions used:**

| Step | Sidebar Item | What it does |
|------|-------------|--------------|
| Sync | **Pull Remote and Merge** | Fetches latest `main`, merges into branch, runs tests, pushes |
| PR | 🤖 **Create Pull Request** | AI-assisted: generates Why/How summary, tags reviewer, calls `gh pr create` |
| Jira | **Jira Item Completed** | Moves Jira item to `In Review` |

> **PR rule:** Always run **Pull Remote and Merge** before **Create Pull Request**. The PR should land without conflicts.

---

## Phase 5: Code Review (as Reviewer)

```mermaid
flowchart TD
    A([PR assigned to you for review]) --> B[Review a Pull Request]
    B --> C{Review outcome}

    C -- Issues found --> D[Feedback on Pull Request]
    D --> E[Comments posted on GitHub PR]
    E --> F([Author addresses feedback on same branch])
    F --> B

    C -- Looks good --> G[Approve a Pull Request]
    G --> H[Squash and Merge on GitHub]
    H --> I[Delete remote feature branch on GitHub]
    I --> J[Checkout Main Branch work done]
    J --> K[Pull Remote and Merge to sync local main]
    K --> L([main updated, ready for next item])
```

**Sidebar actions used:**

| Step | Sidebar Item | What it does |
|------|-------------|--------------|
| Review | **Review a Pull Request** | Opens agentic review terminal for the PR |
| Feedback | **Feedback on Pull Request** | Posts structured review feedback to the PR |
| Approve | **Approve a Pull Request** | Runs the approval and merge flow |
| Cleanup | **Checkout Main (Branch work done)** | Switches local back to `main` after merge |

---

## Phase 6: Versioning and Release

```mermaid
flowchart LR
    A([Feature merged to main]) --> B{What changed?}

    B -- Breaking API change --> C[Increment Major Version]
    B -- New backward-compatible feature --> D[Increment Minor Version]
    B -- Bug fix or patch --> E[Increment Patch Version]

    C & D & E --> F[Create Repo Release]
    F --> G{createReleaseBranchWhenCreatingReleases?}
    G -- Enabled --> H[Release branch created and pushed]
    G -- Disabled --> I[Tag only, stays on main]
    H & I --> J([Release tagged and pushed])
```

**Sidebar actions used:**

| Step | Sidebar Item | What it does |
|------|-------------|--------------|
| Semver bump | **Increment Major / Minor / Patch Version** | Runs version bump script |
| Release | **Create Repo Release** | Tags commit, optionally creates a release branch |

---

## Phase 7: Hotfix (Urgent Production Fix)

```mermaid
flowchart TD
    A([Production bug reported]) --> B[Checkout Main Branch work done]
    B --> C[Pull Remote and Merge to sync]
    C --> D[Create Feature Branch → hotfix/short-description]
    D --> E[Apply fix]
    E --> F[Build Project]
    F --> G[Run Project Tests]
    G --> H[Commit]
    H --> I[Create Pull Request]
    I --> J[Approve a Pull Request → Squash and Merge]
    J --> K[Increment Patch Version]
    K --> L[Create Repo Release]
    L --> M([Hotfix deployed])
```

> Hotfixes follow the same PR flow as normal features — there are no special branches in GitHub Flow. The `hotfix/` prefix is just a naming convention.

---

## Phase 8: Autocommit Mode (Long Running Work)

Autocommit creates periodic background commits while you work, so you never lose progress.

```mermaid
flowchart LR
    A([Starting a long session]) --> B[Autocommit Start]
    B --> C{Work in progress...}
    C --> D[Periodic auto-checkpoints committed]
    D --> C

    C --> E{Need to roll back?}
    E -- Yes --> F[Revert Changes]
    F --> C

    E -- No, session done --> G[Autocommit Stop]
    G --> H([Clean up and continue normal flow])
```

**Sidebar actions used:**

| Step | Sidebar Item | What it does |
|------|-------------|--------------|
| Start | **Autocommit Start** | Begins background periodic commit loop |
| Rollback | **Revert Changes** | Reverts the current autocommit changeset |
| Stop | **Autocommit Stop** | Stops the background loop |

---

## Common Sidebar Actions — Quick Reference

| Emoji | Meaning |
|-------|---------|
| 🤖 | Agent-assisted (uses an AI harness) |
| 🧠 | Fully agentic (opens AI agent terminal) |
| 🟡 | Manual (no AI involved) |

| Sidebar Item | Phase | AI? | Key precondition |
|---|---|---|---|
| Init Repository | Setup | — | No `.git` folder |
| Workspace Setup | Setup | — | Any time |
| Create Feature Branch | Start work | — | Repo is a Git repo |
| Take Jira Item (Assign) | Start work | — | Jira configured |
| 🧠 Assign Jira Item to Agent | Start work | Full agent | Jira configured |
| Build Project | Dev loop | — | Build command set |
| Run Project Tests | Dev loop | — | Test command set |
| 🤖 Commit | Dev loop | Light harness | Git repo, `useAgentForGithubRepositoryManagement` on |
| 🧠 Set Feature Flag for changes | Dev loop | Full agent | Any time |
| 🧠 Agentic review of Merge | Dev loop | Full agent | Clean working tree |
| Pull Remote and Merge | Pre-PR / daily sync | — | Not on `main` |
| 🤖 Create Pull Request | PR | Agent (AI Why/How) | Git repo, synced with `main` |
| Review a Pull Request | Review | — | Open PR exists |
| Feedback on Pull Request | Review | — | Open PR exists |
| Approve a Pull Request | Review | — | PR approved |
| Jira Item Completed | Jira update | — | Jira configured |
| Merge branch to main | Post-review | — | Not on `main` |
| Checkout Main (Branch work done) | Post-merge | — | Git repo |
| Increment Major/Minor/Patch | Release | — | Any time |
| Create Repo Release | Release | — | Git repo with remote |
| Autocommit Start/Stop | Long sessions | Light harness | GitHub remote set |

---

## Daily Developer Checklist

Use this as a mental checklist for a typical day:

```
Morning
  ☐ Pull Remote and Merge (sync your branch with latest main)

Starting new work
  ☐ Take Jira Item (Assign) — if using Jira
  ☐ Create Feature Branch — feature/, fix/, or hotfix/

Per coding session
  ☐ Build Project — verify nothing is broken
  ☐ Run Project Tests — keep the suite green
  ☐ Commit — checkpoint with AI-generated message

Ready for PR
  ☐ Pull Remote and Merge — sync one more time
  ☐ Run Project Tests — confirm still green after sync
  ☐ Create Pull Request — AI drafts the Why/How
  ☐ Jira Item Completed → In Review

After PR is approved
  ☐ Approve a Pull Request + Squash and Merge
  ☐ Checkout Main (Branch work done)
  ☐ Pull Remote and Merge (sync local main)
  ☐ Jira Item Completed → Done
  ☐ Increment Version + Create Repo Release (if applicable)
```
