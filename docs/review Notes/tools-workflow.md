# Tools Workflow

The full pipeline from backlog item to production deployment.

---

## Pipeline Overview

```mermaid
flowchart LR
    PM["📋 Jira\nor GitHub Issues\n──────────\nBacklog &\nSprint Mgmt"]
    AG["🤖 Antigravity\n──────────\nClaude + Coding\nAI-assisted dev"]
    GH["🐙 GitHub\n──────────\nVersion Control\nPR & Commit\nbest practices"]
    CI["⚙️ GitHub Actions\n──────────\nCI/CD &\nAutomated tasks"]
    DP["🚀 Deployment\n──────────\nTests per platform\nDocker → DockerHub\nDeploy to servers"]

    PM --> AG --> GH --> CI --> DP
```

---

## Expanded Stage View

```mermaid
flowchart LR

    subgraph PM ["📋 Planning"]
        pm1(Backlog grooming)
        pm2(Sprint planning)
        pm3(Issue assignment)
        pm4(Progress tracking)
        pm1 --> pm2 --> pm3 --> pm4
    end

    subgraph AG ["🤖 Antigravity — Claude + Coding"]
        ag1(Take / Assign Jira Item)
        ag2(Create Feature Branch)
        ag3(AI-assisted coding)
        ag4(Build & Test locally)
        ag5(Commit with AI message)
        ag6(Agentic code review)
        ag1 --> ag2 --> ag3 --> ag4 --> ag5 --> ag6
    end

    subgraph GH ["🐙 GitHub"]
        gh1(Feature branch pushed)
        gh2(Pull Request opened)
        gh3(Code review & feedback)
        gh4(Squash & Merge to main)
        gh5(Branch deleted)
        gh1 --> gh2 --> gh3 --> gh4 --> gh5
    end

    subgraph CI ["⚙️ GitHub Actions"]
        ci1(PR checks triggered)
        ci2(Lint & static analysis)
        ci3(Unit & integration tests)
        ci4(Build artifact)
        ci5(Merge to main triggers CD)
        ci1 --> ci2 --> ci3 --> ci4 --> ci5
    end

    subgraph DP ["🚀 Deployment"]
        dp1(Run tests on each\ntarget platform)
        dp2(Build Docker image\nPublish to DockerHub)
        dp3(Deploy to servers\nQA → UAT → Prod)
        dp1 --> dp2
        dp2 --> dp3
    end

    PM --> AG --> GH --> CI --> DP
```

---

## Tool Responsibilities

| Stage | Tool | Role | Key outputs |
|-------|------|------|-------------|
| **Planning** | Jira / GitHub Issues | Backlog management, sprint planning, issue tracking, progress visibility | Prioritized issue with assignee and status |
| **Development** | Antigravity + Claude | AI-assisted coding, branch creation, local build/test, commit message generation, agentic code review | Committed feature branch with passing local tests |
| **Version Control** | GitHub | Source of truth for all code, PR workflow, code review, squash-and-merge to `main` | Clean `main` history with reviewed, approved changes |
| **CI/CD** | GitHub Actions | Automated lint, test, build on every PR and push; triggers deployment pipeline on merge to `main` | Green build artifacts, deployment triggers |
| **Deployment** | GitHub Actions + Docker + Servers | Cross-platform test runs, Docker image build and publish to DockerHub, server deployment across environments | Running application in QA / UAT / Prod |

---

## How the Stages Connect

```mermaid
flowchart TD
    Issue["Jira or GitHub Issue\n(ticket created, assigned)"]

    Branch["Antigravity: Create Feature Branch\nfrom latest main"]

    Code["Antigravity: Code + Build + Test\n(local loop until green)"]

    Commit["Antigravity: Commit\n(AI-generated message, .env excluded)"]

    PR["GitHub: Create Pull Request\n(Antigravity drafts Why / How)"]

    Review["GitHub: Code Review\n(reviewer approves or requests changes)"]

    Merge["GitHub: Squash & Merge → main"]

    PRChecks["GitHub Actions: PR checks\n(lint, tests, build)"]

    CDPipeline["GitHub Actions: CD pipeline\n(triggered by merge to main)"]

    Tests["Run automated tests\nper target platform"]

    Docker["Build Docker image\nPublish to DockerHub\n(optional)"]

    Deploy["Deploy to servers\nQA → UAT → Prod"]

    JiraDone["Jira: Item moved to Done"]

    Issue --> Branch --> Code --> Commit --> PR
    PR --> PRChecks
    PRChecks -->|Pass| Review
    PRChecks -->|Fail| Code
    Review -->|Changes requested| Code
    Review -->|Approved| Merge
    Merge --> CDPipeline --> Tests --> Docker --> Deploy
    Merge --> JiraDone
```

---

## Docker Path (Optional)

Docker is used when the application is packaged and distributed as a container image.

```mermaid
flowchart LR
    A[GitHub Actions CD triggered] --> B[Build Docker image]
    B --> C[Tag image with version\ne.g. v1.4.2 and latest]
    C --> D[Push to DockerHub]
    D --> E{Deploy target}
    E -- Cloud VM / bare metal --> F[Pull image on server\ndocker pull + docker run]
    E -- Kubernetes --> G[Update manifest image tag\nkubectl rollout]
    E -- Compose-based --> H[docker compose pull + up -d]
```

---

## Environment Promotion

```mermaid
flowchart LR
    Main["main branch\n(always deployable)"]
    QA["QA environment\nAutomated smoke tests"]
    UAT["UAT environment\nStakeholder sign-off"]
    Prod["Production\nLive users"]

    Main -->|CD auto-deploy| QA
    QA -->|QA pass + approval| UAT
    UAT -->|UAT sign-off + release tag| Prod
```

> **Task Runner role at each gate:**
> - Before QA: **Pull Remote and Merge** → **Run Project Tests** → **Create Pull Request**
> - Before UAT: **Increment Version** after QA approval
> - Before Prod: **Create Repo Release** to produce the release tag that triggers the production deployment

---

## Tools at a Glance

```
┌─────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│  Jira /         │    │    Antigravity        │    │      GitHub        │
│  GitHub Issues  │───▶│  (Task Runner +       │───▶│  (Version control, │
│                 │    │   Claude Code)        │    │   PR workflow,     │
│  • Backlog      │    │                       │    │   code review)     │
│  • Sprints      │    │  • Branch creation    │    │                    │
│  • Assignments  │    │  • AI-assisted coding │    │  • Feature branch  │
│  • Progress     │    │  • Build & test loop  │    │  • Pull Request    │
│                 │    │  • Commit & PR        │    │  • Squash & Merge  │
└─────────────────┘    │  • Code review        │    └────────┬───────────┘
                       └──────────────────────┘             │
                                                             ▼
                       ┌──────────────────────────────────────────────────┐
                       │              GitHub Actions                       │
                       │  (CI/CD — triggers on PR open and merge to main) │
                       │                                                   │
                       │  PR checks: lint · tests · build                 │
                       │  CD pipeline: test matrix · Docker · deploy      │
                       └──────────────────────┬───────────────────────────┘
                                              │
                                              ▼
                       ┌──────────────────────────────────────────────────┐
                       │               Deployment                          │
                       │                                                   │
                       │  • Automated tests per target platform           │
                       │  • Docker image built & pushed to DockerHub      │
                       │  • Servers updated: QA → UAT → Production        │
                       └──────────────────────────────────────────────────┘
```
