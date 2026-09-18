# Tools, Plugins, and Libraries for DSFB SDLC

Last reviewed: 2026-08-28

This is a curated companion catalog for the DSFB SDLC. It recommends additions
that connect the workflow to real systems or add deterministic verification.
It is not a list of everything an agent can install.

## Selection rules

Add a tool only when it closes a demonstrated gap. Prefer, in order:

1. A capability already built into the agent host.
2. An existing project CLI, SDK, or test framework.
3. An official MCP server with least-privilege access.
4. A third-party plugin or methodology suite only when its workflow does not
   conflict with DSFB ownership and approval gates.

Pin versions in team configuration, review release notes before upgrading, and
keep credentials in the host's secret store or environment—not in the
repository. Start external integrations read-only when possible. A tool must
never bypass DSFB approval gates, agent ownership boundaries, tests, or the
configured systems of record.

## Recommended stack at a glance

| Priority | Addition | Type | SDLC fit | Recommendation |
|---|---|---|---|---|
| Recommended | [Atlassian Rovo MCP](https://www.atlassian.com/platform/rovo-mcp) | Remote MCP | Planning and backlog | Add when Jira or Confluence is authoritative. |
| Recommended | [GitHub MCP Server](https://github.com/github/github-mcp-server) | MCP server | Implementation through review | Add when the host's GitHub integration or `gh` CLI is insufficient. |
| Recommended for web products | [Playwright MCP](https://github.com/microsoft/playwright-mcp) | MCP server | UX validation and testing | Add for live browser inspection; keep deterministic Playwright tests in the repository. |
| Recommended | [Gitleaks](https://github.com/gitleaks/gitleaks) | CLI and CI gate | Commit and pull-request security | Run deterministically in hooks or CI, independent of model judgment. |
| Conditional | [Figma MCP Server](https://developers.figma.com/docs/figma-mcp-server/) | Remote or desktop MCP | UX and implementation handoff | Add only when Figma is a design source of truth. |
| Conditional | [Context7](https://github.com/upstash/context7) | MCP server/plugin | Architecture and implementation | Add when current framework/library documentation is repeatedly needed. |
| Conditional | [Sentry MCP](https://github.com/getsentry/sentry-mcp) | Remote or local MCP | Production feedback and diagnosis | Add when the application already uses Sentry. |
| Conditional | [SonarQube MCP Server](https://github.com/SonarSource/sonarqube-mcp-server) | MCP server | Security and code review | Add when SonarQube Server or Cloud is already part of the quality program. |
| Optional / overlapping | [Superpowers](https://github.com/obra/superpowers) | Methodology plugin | Ideation through implementation | Use selected skills only; do not install it as a second SDLC authority without resolving overlap. |

## Worked example: Superpowers

**Description.** Superpowers is an agentic software-development methodology
built from composable skills. Its workflow emphasizes discovery before code,
reviewable design, implementation planning, test-driven development, isolated
work, and code review. It supports multiple coding-agent hosts and is maintained
by Jesse Vincent (obra) and contributors.

- Repository: [obra/superpowers](https://github.com/obra/superpowers)
- Introductory video retained from the original note:
  [Superpowers overview](https://www.youtube.com/watch?v=L2JKgj7WzU4)
- Preferred distribution: its supported plugin installation, rather than
  manually copying a subset whose update provenance is lost.

**Fit with DSFB.** Superpowers is useful as a source of focused engineering
skills, but its end-to-end methodology overlaps heavily with:

- `/project-definition-workflow`
- `/backlog-implementation-workflow`
- `product-agent`, `ba-agent`, `architect-agent`, and `project-planner-agent`
- The mandatory implementation-plan gate
- Existing TDD, debugging, simplification, test, and review capabilities

**Recommendation: Optional / overlapping.** Do not let Superpowers become a
parallel orchestrator. Adopt an individual skill only when it improves a named
DSFB stage, map it to the owning agent, and retain DSFB artifact paths and
approval gates. If the whole plugin is installed, document which methodology
has precedence and disable duplicate automatic behaviors.

## Backlog and knowledge systems

### Atlassian Rovo MCP — Recommended when Jira is authoritative

The official remote server connects agents to Jira, Confluence, and Compass
using OAuth and the user's existing permissions. It lets
`project-planner-agent` create and maintain real backlog items instead of
requiring copied Markdown or brittle browser automation.

- Best stages: project definition, backlog implementation, defect tracking.
- DSFB owners: `project-planner-agent`; optionally `product-agent` and
  `ba-agent` for read-only source context.
- Configure only the sites and permissions needed. Keep destructive issue or
  page operations behind explicit approval.
- Skip it when `docs/backlog/` is intentionally the system of record.

## Source control and delivery

### GitHub MCP Server — Recommended when native GitHub access is insufficient

GitHub's official MCP server exposes repositories, issues, pull requests,
Actions, and security capabilities. It supports restricted toolsets and a
read-only mode, which should be the starting configuration for discovery and
review contexts.

- Best stages: backlog traceability, branch/PR finalization, CI inspection,
  review, and release evidence.
- DSFB owners: `developer-agent`, `code-review-agent`, and `deployment-agent`.
- Prefer the existing `git` and `gh` CLIs for ordinary local operations. Add
  MCP when structured remote context or actions materially reduce manual work.
- Enable only required toolsets; do not expose all repository mutation tools by
  default.

## UX and executable testing

### Playwright MCP — Recommended for web products

Microsoft's Playwright MCP gives an agent browser interaction through
accessibility snapshots. It is useful for inspecting a running UI, reproducing
flows, and gathering evidence. It complements but does not replace committed
Playwright tests.

- Best stages: UX validation, acceptance testing, E2E diagnosis, accessibility
  checks.
- DSFB owners: `ux-agent` and `test-agent`.
- Use an isolated browser profile and an allowlisted local or non-production
  target with synthetic test data.
- Skip it when the host already supplies equivalent browser control.

### Figma MCP Server — Conditional

Figma's official MCP server provides design context and design-system
information to compatible coding tools. Figma recommends its remote server for
the broadest feature set; a desktop server is available for supported desktop
workflows.

- Best stages: UX definition and frontend implementation handoff.
- DSFB owners: `ux-agent` for design authority and `fe-developer` for consuming
  approved context.
- Add it only when Figma is authoritative. Generated code never overrides the
  approved UX specification, accessibility criteria, or architecture.

## Current technical documentation

### Context7 — Conditional

Context7 retrieves current, version-aware library documentation and examples.
It reduces reliance on model memory when APIs change frequently.

- Best stages: architecture decisions, implementation, and troubleshooting.
- DSFB owners: `architect-agent`, implementation subagents, and technical SMEs.
- Use the project's locked dependency version in each query and verify critical
  behavior against tests or the upstream project documentation.
- Skip it when official documentation is already available through the host's
  web tools or repository context.

## Security and quality

### Gitleaks — Recommended deterministic baseline

Gitleaks scans Git history, directories, and input streams for secrets and can
run as a pre-commit hook or CI job. This is deterministic defense in depth for
`security-check-agent`; it must run independently of whether an LLM notices a
credential.

- Best stages: before commits, pull requests, and releases.
- DSFB owners: `developer-agent`, `spec-validation-agent`, and CI.
- Redact findings in logs. Never paste a detected secret into an agent prompt,
  ticket, report, or allowlist.
- Treat bypasses and ignore entries as reviewed security changes.

### SonarQube MCP Server — Conditional

The official SonarQube MCP server exposes SonarQube Server/Cloud quality and
security results to an agent and supports code-snippet analysis.

- Best stages: implementation feedback, security assurance, and code review.
- DSFB owners: `spec-validation-agent` and `code-review-agent`.
- Add it when SonarQube already supplies the organization's quality gate. Do
  not purchase or deploy SonarQube solely to give the agent another scanner.
- Keep the deterministic CI quality gate authoritative; MCP findings are
  context, not a bypass.

## Production feedback

### Sentry MCP — Conditional

Sentry's MCP integration exposes projects, issues, traces, and event searches.
It can give `product-agent` and engineering agents evidence from production
without copying raw logs into prompts.

- Best stages: post-release feedback, incident diagnosis, and regression-test
  design.
- DSFB owners: `product-agent` for trend evidence and the relevant engineering
  agent for diagnosis.
- Start with inspect/read capabilities. Sanitize personal data, request bodies,
  headers, and secrets before they enter specifications, tickets, or reports.
- Add it only when Sentry is already instrumented and governed.

## Usually redundant or risky

| Addition | Default decision | Why |
|---|---|---|
| Generic filesystem MCP | Avoid | Codex, Claude Code, and Gemini already have workspace file tools. Another writable filesystem surface increases destructive scope without adding SDLC value. |
| Generic persistent-memory MCP | Avoid by default | DSFB already has canonical Git-tracked artifacts and an optional `obsidian-vault-agent`. Hidden memory can conflict with current specifications. |
| A second end-to-end SDLC methodology | Avoid | Competing approval gates, artifact paths, and agent ownership create ambiguous authority. Adopt isolated techniques instead. |
| Multiple Jira/issue MCP servers | Avoid | One authoritative connector prevents duplicate tickets and inconsistent transitions. |
| Autonomous production/deployment MCP with broad write access | Avoid | `deployment-agent` requires explicit production approval and rollback evidence. Prefer narrowly scoped CI/CD controls. |
| Unpinned “latest” dependencies in CI | Avoid | Updates can change behavior without review. Use a controlled dependency-update process and lockfiles. |

## Adoption checklist

Before adding any entry:

- Name the DSFB agent and workflow stage that owns it.
- Identify the specific manual gap it removes.
- Confirm it does not duplicate a built-in host capability.
- Use the minimum toolset, filesystem roots, sites, projects, and permissions.
- Store authentication outside Git and verify revocation/rotation.
- Decide which deterministic system remains authoritative.
- Define a safe test target and synthetic data for executable tools.
- Pin and review versions where the distribution mechanism permits it.
- Add a health check and a documented fallback when the service is unavailable.
- Re-run the affected workflow and security gates before team-wide rollout.
