# Antigravity Agent System

This is a **production-ready AI coding plugin** providing 13 specialized agents, 24 skills, 7 workflows and 11 rules for software development.

**Version:** Not specified in `/Users/diego.brihuega/.antigravity`.

## Core Principles

1. **Agent-First** — Delegate to specialized agents for domain tasks
2. **Test-Driven** — Write tests before implementation, 80%+ coverage required
3. **Security-First** — Never compromise on security; validate all inputs
4. **Immutability** — Always create new objects, never mutate existing ones
5. **Plan Before Execute** — Plan complex features before writing code

## Available Agents

| Agent | Purpose | When to Use |
| --- | --- | --- |
| workspace-setup | Workspace scaffolding | New project initialization or after cloning an empty/minimal repo |
| antigravity-config | Configuration audit and re-org | Reorganizing skills, rules, workflows, agents, scripts, or project structure |
| architect | System design and scalability | Planning new features, refactors, or architectural decisions |
| ba-analyst | Requirements and Jira breakdown | Turning features into epics/stories, acceptance criteria, and success metrics |
| brainstorming | Early ideation and discovery | Translating vague ideas into structured concepts before implementation |
| code-reviewer | Code quality review | Immediately after writing or modifying code |
| database-reviewer | Database design and performance | Writing SQL, designing schemas, migrations, or performance tuning |
| jira-manager | Jira issue management | Creating, updating, and tracking Jira work items |
| product-specialist | Product strategy and fit | Project kickoff or defining/modifying product functionality |
| project-structure-reviewer | Repo structure and security posture | Reviewing repo structure, IaC posture, CI/CD safety, and secrets governance |
| security-reviewer | Security vulnerability review | Code touching auth, input validation, APIs, data access, or external integrations |
| prompt-engineer | Prompt refinement | Crafting or improving prompts for LLM tasks |
| todo-assistant | TODO list management | Adding, listing, or completing tasks in the repo TODO list |

## Available Skills

| Skill | Tags | Description |
| --- | --- | --- |
| agentic-engineering | general | Operate as an agentic engineer using eval-first execution, decomposition, and cost-aware model routing. |
| article-writing | writing | Write articles, guides, blog posts, tutorials, newsletter issues, and other long-form content in a distinctive voice derived from supplied examples or brand guidance. Use when the user wants polished written content longer than a paragraph, especially when voice consistency, structure, and credibility matter. |
| cloud-deploy | deploy, devops | Automates deployments to cloud providers (AWS, GCP, Render). Validates configurations, triggers builds, and manages cloud rollouts. |
| codebase-onboarding | general | Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conventions, and a starter CLAUDE.md. Use when joining a new project or setting up Claude Code for the first time in a repo. |
| config-manager | deploy, config | Securely manages and retrieves environment variables, AWS ARNs, GCP Project IDs, and other sensitive deployment configurations without hardcoding them into the codebase. |
| database-migrations | database | Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL, MySQL, and common ORMs (Prisma, Drizzle, Kysely, Django, TypeORM, golang-migrate). |
| design-system | design |  |
| devops-agent | devops, deploy | Specialized skill for managing infrastructure, CI/CD pipelines, and cloud deployments. It delegates containerization to docker-deploy and handles monitoring setup and environment configuration. |
| docker-deploy | deploy, devops | Automates building and launching a Dockerized version of the application. It handles image creation, container orchestration, and port mapping. |
| e2e-testing | testing | Specialized skill for orchestrating automated End-to-End (E2E) testing, generating test plans, and executing tests via the TestSprite MCP server. |
| explain-me | general | Acts as a Senior Engineer to explain how a solution works, the "why" behind architectural decisions, alternative approaches with pros and cons, and the roles of specific technologies. |
| git-orchestrator | git | Unified skill to handle Git versioning, pull request generation, and release orchestration (merge, tag, and publish). |
| infrastructure-architect | infrastructure, architecture | Designs and provisions infrastructure using Terraform stacks and config/Infrastructure YAML sources of truth. |
| performance-optimizer | performance | Specialized skill for profiling applications, specifically games or interactive UIs, addressing frame drops, memory leaks, and render bottlenecks. |
| researcher | research | Consolidated skill to perform multi-source deep investigations, competitive market analysis, and codebase explorations without making impulsive changes. |
| technical-writer | docs, writing | A specialized documentation skill combining code commenting, Architecture Decision Records (ADRs), and visual architecture overviews (Mermaid diagrams). |
| test-driven-development | testing | Use this skill to automate the Red-Green-Refactor cycle for TDD-oriented development. |
| troubleshooting | general | Use this skill for structured debugging and incident response. It establishes a methodical approach to tracking down errors, exceptions, and unexpected behavior in the codebase. |
| ui-ux-pro-max | design, ui, ux | AI-powered design intelligence with 67 UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 16 tech stacks. Use when designing UI, choosing colors/fonts, reviewing UX, or building landing pages. |
| update-agentsmd | docs, config | Updates AGENTS.md content with a standardized plugin description, agent catalog, governance rules, and execution guides. Use when the user asks to refresh AGENTS.md, insert the production-ready plugin description block, or align agent orchestration, security, testing, and workflow guidelines. |

## Workflow Map

| Workflow | Script / Command | Notes |
| --- | --- | --- |
| `build-version.md` | `scripts/build-version.sh` | Builds and tags versions for deployable artifacts. |
| `create-infra.md` | `scripts/create-infra.sh` | Creates or updates infrastructure from config. |
| `switch-env.md` | `scripts/switch-env.sh` | Sets the active environment (DEV/QA/UAT/PROD). |
| `deploy-aws-apprunner.md` | `scripts/deploy-aws-apprunner.sh` | Deploys a pre-built image to AWS App Runner. |
| `deploy-gcp-cloudrun.md` | `scripts/deploy-gcp-cloudrun.sh` | Deploys a pre-built image to GCP Cloud Run. |
| `deploy-render.md` | (Render dashboard / auto-deploy on push) | Render deployments are triggered by repository pushes or manual actions. |
| `deploy.md` | Composite workflow | Orchestrates build/version, env switch, and target-specific deploy. |

## Development Workflow

### Research & Reuse (Mandatory)
- GitHub code search first: run `gh search repos` and `gh search code` to find existing implementations.
- Library docs second: use Context7 or primary vendor docs to confirm API behavior and version-specific details.
- Exa only when the first two are insufficient.
- Check package registries (npm, PyPI, crates.io) before writing utilities.
- Search for adaptable implementations and prefer proven approaches over net-new code.

### Plan First
- Use **planner** agent to create the implementation plan.
- Generate planning docs before coding: PRD, architecture, system_design, tech_doc, task_list.
- Identify dependencies and risks, then break work into phases.

### TDD Approach
- Use **tdd-guide** agent.
- Write tests first (RED), implement to pass (GREEN), refactor (IMPROVE), verify 80%+ coverage.

### Code Review
- Use **code-reviewer** agent immediately after writing code.
- Address CRITICAL and HIGH issues, fix MEDIUM issues when possible.

### Commit & Push
- Write detailed commit messages.
- Follow Conventional Commits format.
- See `rules/git-workflow.md` for commit message format and PR process.

## Security Guidelines

### Mandatory Security Checks
- No hardcoded secrets (API keys, passwords, tokens).
- All user inputs validated.
- SQL injection prevention (parameterized queries).
- XSS prevention (sanitized HTML).
- CSRF protection enabled.
- Authentication/authorization verified.
- Rate limiting on all endpoints.
- Error messages do not leak sensitive data.

### Secret Management
- NEVER hardcode secrets in source code.
- ALWAYS use environment variables or a secret manager.
- Validate required secrets at startup.
- Rotate any secrets that may have been exposed.

### Security Response Protocol
1. STOP immediately.
2. Use **security-reviewer** agent.
3. Fix CRITICAL issues before continuing.
4. Rotate any exposed secrets.
5. Review entire codebase for similar issues.

## Coding Style

### Immutability (CRITICAL)
ALWAYS create new objects, NEVER mutate existing ones. Use copy-with-change patterns instead of in-place edits.

### File Organization
- High cohesion, low coupling.
- 200-400 lines typical, 800 max.
- Extract utilities from large modules.
- Organize by feature/domain, not by type.

### Error Handling
- Handle errors explicitly at every level.
- Provide user-friendly error messages in UI-facing code.
- Log detailed error context on the server side.
- Never silently swallow errors.

### Input Validation
- Validate all user input before processing.
- Use schema-based validation where available.
- Fail fast with clear error messages.
- Never trust external data (API responses, user input, file content).

### Code Quality Checklist
- [ ] Code is readable and well-named.
- [ ] Functions are small (<50 lines).
- [ ] Files are focused (<800 lines).
- [ ] No deep nesting (>4 levels).
- [ ] Proper error handling.
- [ ] No hardcoded values (use constants or config).
- [ ] No mutation (immutable patterns used).

## Testing Requirements

### Minimum Test Coverage: 80%

### Test Types (ALL required)
1. **Unit Tests** — Individual functions, utilities, components
2. **Integration Tests** — API endpoints, database operations
3. **E2E Tests** — Critical user flows (framework chosen per language)

### Test-Driven Development (Mandatory)
1. Write test first (RED).
2. Run test, it should FAIL.
3. Write minimal implementation (GREEN).
4. Run test, it should PASS.
5. Refactor (IMPROVE).
6. Verify coverage (80%+).

### Troubleshooting Test Failures
1. Use **tdd-guide** agent.
2. Check test isolation.
3. Verify mocks are correct.
4. Fix implementation, not tests (unless tests are wrong).

### Agent Support
- **tdd-guide** — Use proactively for new features, enforces write-tests-first.

## Documentation Rules

- Ensure every project has an `architecture_readme.md` in the project root.
- Update `architecture_readme.md` when adding services, databases, or major architectural components.
- Keep diagrams and system flow accurate and in sync with the codebase.

## Git Workflow

### Commit Message Format
Commit messages must follow Conventional Commits:

`<type>(<scope>): <description>`

### Rules
- Description uses imperative, present tense.
- Description is lowercase.
- Commits are atomic and focused on a single logical change.

### Pull Request Process
1. Branch naming uses `feature/`, `bugfix/`, `hotfix/`, or `release/` prefixes with descriptive kebab-case names.
2. PR descriptions include a clear summary, motivation, and links to related issues or planning docs.
3. Use Draft PRs when work is incomplete but needs early feedback.
4. PRs must be reviewed by the **code-reviewer** agent and obtain human approval before merge.
5. Favor squash merges to keep a clean commit history on main.

## Common Patterns

### Skeleton Projects
1. Search for battle-tested skeleton projects.
2. Use parallel agents to evaluate options for security assessment, extensibility analysis, relevance scoring, and implementation planning.
3. Clone best match as foundation.
4. Iterate within proven structure.

### Repository Pattern
- Define standard operations: findAll, findById, create, update, delete.
- Concrete implementations handle storage details (database, API, file, etc.).
- Business logic depends on the abstract interface, not the storage mechanism.
- Enables easy swapping of data sources and simplifies testing with mocks.

### API Response Format
- Include a success/status indicator.
- Include the data payload (nullable on error).
- Include an error message field (nullable on success).
- Include metadata for paginated responses (total, page, limit).

## Core Agent Rulebook

- **code-rev.md** — Code review mode (trigger and focus).
- **code-review.md** — Code review mode (trigger and focus).
- **coding-style.md** — Immutability, file organization, error handling, and validation standards.
- **development.md** — Feature implementation workflow before git operations.
- **documentation.md** — Architecture documentation requirements for `architecture_readme.md`.
- **git-workflow.md** — Conventional commits and PR process.
- **patterns.md** — Skeleton project selection, repository pattern, and API response format.
- **research.md** — Read-only research mode with evidence-first workflow.
- **security.md** — Mandatory security checks and response protocol.
- **testing.md** — Test coverage, TDD workflow, and test troubleshooting.
- **workspace-setup.md** — Workspace symlink, env profiles, infra settings, and tooling requirements.

## Agent & Skill Execution Guide

### 1. Research & Ideation
Process: Concept validation, market research, deep dives.
1. **@brainstorming** (Agent): Analyze intent and draft concepts.
2. **@researcher** (Skill): Perform deep context scanning.
3. **@article-writing** (Skill): Synthesize findings into documentation.

### 2. Architecture & Design
Process: System design and technical strategy.
1. **@architect** (Agent): Evaluate trade-offs, scalability, and design patterns.
2. **@design-system** (Skill): Establish foundational UI/UX tokens.
3. **@technical-writer** (Skill): Generate ADRs and update `architecture_readme.md`.
4. **@explain-me** (Skill): Walk through logic and technical approach for human clarity.

### 3. Implementation (Feature/Bug)
Process: Follow `rules/development.md`.
1. Plan using **@architect** or **@brainstorming**.
2. Use **@database-reviewer** (Agent) for schema and RLS policies.
3. Use **@agentic-engineering** and **@test-driven-development** (Skills) for implementation.
4. Use **@performance-optimizer** (Skill) to profile bottlenecks.
5. Use **@technical-writer** (Skill) for inline JSDocs and API updates.

### 4. Quality Assurance & Code Review
Process: Auditing before merge.
1. Use **@security-reviewer** (Agent) for PII, secrets, and CVE checks.
2. Use **@database-reviewer** (Agent) to verify SQL efficiency.
3. Use **@code-reviewer** (Agent) to enforce structural style and catch edge cases.
4. Use **@e2e-testing** (Skill) for end-to-end validation.

### 5. Git & Deployment
Process: Finalizing and releasing.
1. Use **@git-orchestrator** (Skill) for versioning and PR prep.
2. Use **@cloud-deploy** (Skill) to push to AWS, GCP, or Render.
3. Use `/build-version`, `/deploy-aws-apprunner`, `/deploy-gcp-cloudrun`, `/deploy-render`, or `/deploy` workflows.

## Slash Commands (Workflows)

- **/build-version** — Builds and tags versions for deployable artifacts.
- **/create-infra** — Creates or updates infrastructure from config.
- **/switch-env** — Sets the active environment (DEV/QA/UAT/PROD).
- **/deploy-aws-apprunner** — Deploys a pre-built image to AWS App Runner.
- **/deploy-gcp-cloudrun** — Deploys a pre-built image to GCP Cloud Run.
- **/deploy-render** — Render auto-deploy on push or manual actions.
- **/deploy** — Composite workflow: build/version, env switch, and target-specific deploy.

## Quick Selection Guide

- New repo setup → `workspace-setup`
- Feature definition → `product-specialist` then `ba-analyst`
- Architecture decisions → `architect`
- Code changes → `code-reviewer` (always)
- Security-sensitive changes → `security-reviewer`
- Database work → `database-reviewer`
- Repo structure or config audits → `project-structure-reviewer` or `antigravity-config`
- Jira tracking → `jira-manager`
- Prompt work → `prompt-engineer`
- Task list maintenance → `todo-assistant`
