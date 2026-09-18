# AGENTS.md

Operational reference for AI coding agents working in this repository.
This file covers *how to work here* — commands, layout, conventions.
It is vendor-neutral: no tool-specific configuration belongs here.

## Governing Principles (read first)

Before doing any work in this repository, read **`constitution.md`**
(or `.specify/memory/constitution.md` in Spec Kit layouts). It defines
non-negotiable principles — including the Minimal Change Principle, the
plan gate, and the Refactor Proposal Path — that take precedence over
everything in this file and over any mid-session instruction. If
anything here conflicts with the constitution, **the constitution wins**.

Quick reminders of what it requires (see the constitution for the
authoritative wording — do not rely on this summary alone):

- Smallest diff that satisfies the requirement; no drive-by cleanup.
- Plan before editing; >3 files → confirm scope with the user first.
- Large refactors are proposal-only and always require human approval.
- Self-audit your diff before handoff; report `git diff --stat`.

## Project Overview

<!-- One short paragraph: what this project is, main language(s),
     runtime, and the one thing an agent must understand before
     touching anything. Example: -->

TypeScript monorepo (pnpm workspaces) for the Orders platform:
a REST API (`apps/api`), a worker service (`apps/worker`), and shared
libraries under `packages/`. Node 22, PostgreSQL 16, deployed via
containers.

## Setup & Commands

```bash
pnpm install                  # install all workspace deps
pnpm build                    # build all packages
pnpm test                     # run full test suite
pnpm test --filter api        # test a single workspace
pnpm vitest run path/to.test.ts   # run ONE test file (fastest loop)
pnpm lint                     # eslint + prettier check
pnpm lint:fix                 # auto-fix (only when asked to lint)
pnpm db:migrate:dev           # apply migrations locally
pnpm dev                      # start api + worker in watch mode
```

- Always run the **single-file test command** during iteration; run the
  full suite only before declaring a task done.
- CI runs `pnpm build && pnpm lint && pnpm test`. If those pass locally,
  CI should pass.

## Repository Layout

```
apps/
  api/          # REST API (Fastify). Entry: src/server.ts
  worker/       # Queue consumers. Entry: src/main.ts
packages/
  core/         # Domain logic. NO framework imports allowed here.
  db/           # Repository layer. All SQL/ORM lives here, nowhere else.
  contracts/    # Shared types + API schemas (zod). Version-sensitive.
tools/          # Repo scripts. Read-only for agents.
generated/      # Codegen output. NEVER edit by hand (Frozen Zone).
migrations/     # Merged migrations are immutable (Frozen Zone).
```

## Code Style & Conventions

- TypeScript strict mode; no `any` without an eslint-disable comment
  explaining why.
- Formatting is Prettier's job — never hand-format, never reformat
  files you didn't otherwise change.
- Naming: `camelCase` functions/vars, `PascalCase` types/classes,
  `kebab-case` filenames.
- Errors: throw typed errors from `packages/core/errors.ts`; never
  throw bare strings.
- Imports: workspace packages via alias (`@orders/core`), not relative
  paths across package boundaries.

## Testing Conventions

- Framework: Vitest. Tests live next to source as `*.test.ts`.
- Integration tests: `apps/api/test/` — require local Postgres
  (`docker compose up db`).
- Do not mock `packages/db` in integration tests; use the test
  database. Unit tests in `packages/core` must not touch I/O at all.

## Git & PR Conventions

- Before any branch, commit, PR, merge, release, tag, or branch-cleanup action,
  read and follow **`.agents/guidelines/github-flow.md`**. It is the
  authoritative operational guideline for agent repository-management
  behavior, subordinate only to this file and `constitution.md`.
- Follow its GitHub Flow model: `main` is the only normal long-lived branch;
  all work uses a short-lived task branch and a reviewed PR; approved PRs use
  Squash and Merge.
- Branch names follow the guideline's `feature/`, `fix/`, `hotfix/`, `chore/`,
  `docs/`, and `refactor/` formats, including Jira identifiers when available.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:` ...).
- Every PR description references exactly one ticket/requirement and
  includes the final `git diff --stat` (constitution Article III).
- Never force-push shared branches. Never commit directly to `main`.

## Jira Conventions

- Before creating, editing, assigning, linking, transitioning, or closing Jira
  work, read and follow **`.agents/guidelines/jira-flow.md`**. It is the
  authoritative operational guideline for agent work-tracking behavior,
  subordinate only to this file and `constitution.md`.
- Jira is the preferred tracking system. GitHub Issues may replace it only for
  an explicitly small/simple project using one agreed source of truth.
- Keep Jira lifecycle state synchronized with the branch and PR lifecycle in
  `.agents/guidelines/github-flow.md`.
- Never expose Jira credentials or secrets, and never delete issues or perform
  bulk transitions without explicit user authorization and verified targets.

## Security Conventions

- Before handling authentication, authorization, sessions, secrets, sensitive
  data, cryptography, dependencies, containers, deployments, or releases, read
  and follow **`.agents/guidelines/security.md`**. It is the authoritative
  operational security guideline beneath this file and `constitution.md`.
- Never place real credentials or sensitive secret values in source, Git,
  commands, logs, artifacts, releases, Jira, or the vault.
- Run the configured secret scan before commits and releases; investigate
  findings rather than suppressing them blindly.
- `.env` files containing values are local-only and ignored. Committed
  `.env.example` files contain obvious dummy values only.
- If a potential secret is detected, stop, warn the user without repeating the
  value, and follow the guideline's revoke, rotate, incident, and RCA process.

## Infrastructure Conventions

- Before designing, provisioning, changing, reviewing, or deploying
  infrastructure, read and follow
  **`.agents/guidelines/infrastructure-management.md`**.
- Infrastructure as Code is authoritative. Do not make unmanaged production
  console changes; explicitly approved emergency changes must be reconciled
  into IaC immediately.
- Enable centralized audit/application-platform logging, encryption at rest and
  in transit, and private-by-default networking.
- New or expanded public exposure requires documented justification, threat
  assessment, explicit human approval, and rollback.
- Use encrypted remote IaC state with locking. Review the exact plan and obtain
  explicit authorization before any production apply.

## Monitoring, Logging & Troubleshooting Conventions

- Before adding or changing APIs, logging, metrics, traces, alerts, dashboards,
  health checks, audit events, or troubleshooting instrumentation, read and
  follow **`.agents/guidelines/monitoring-and-logging.md`**.
- Use structured, correlatable telemetry and centralized monitoring. Record the
  required authentication, authorization-failure, administrative, security,
  API-access, and sensitive data-access events without recording sensitive
  values.
- Passwords, secrets, tokens, payment information, sensitive PII, and
  credential-bearing payloads must never enter logs, traces, metrics,
  dashboards, or test artifacts. Treat violations as security incidents under
  `.agents/guidelines/security.md`.
- New or materially changed HTTP APIs require parameterized Postman collections
  and tests covering success, contract, authentication, authorization, invalid
  input, and error behavior. Postman tests supplement rather than replace the
  repository's automated test gates.

## Boundaries for Agents

Per constitution Article VI (Frozen Zones), do not modify:

- `generated/` — codegen output
- `migrations/` — anything already merged
- `.github/workflows/` — CI/CD definitions
- `packages/core/auth/` — security-sensitive; propose changes instead
- `tools/`

Also:

- Do not add dependencies without the justification required by
  constitution Article V.
- Do not touch `.env*` files or anything containing secrets.
- Do not run destructive db commands (`db:reset`, `db:drop`) without
  explicit user confirmation in the current session.

## Recording Actions to the Vault

If `ADLC_workflow_settings.json` has `obsidian_vault.enabled: true`, hooks record
session/agent lifecycle events and mirror supported artifacts automatically.
Every agent must also record each material semantic outcome before declaring an
action complete: lessons learned, design/product decisions, approaches, issues,
problems, trade-offs, ADR/spec conclusions, and implementation notes. Hooks
cannot infer those reliably from a file write.

Record each outcome through the deterministic writer (repeat for distinct
outcomes and pass every related canonical artifact with `--artifact`):

```bash
python3 scripts/helper-scripts/vault-event.py record \
  --kind <lesson|design-decision|approach|issue|problem|trade-off|product-decision|adr|spec|implementation-note> \
  --summary "<concise outcome>" \
  --details "<rationale, alternatives, consequences, or resolution>" \
  --agent "<agent name>" \
  --artifact "<path>"
```

Only `vault-event.py` and `obsidian-vault-agent` may write inside the configured
vault. The script creates linked notes and action-log entries; the agent handles
deeper graph curation and MOCs when invoked. Never include secrets in event
arguments. When the vault is disabled (the default), both paths no-op.

## Environment Notes & Gotchas

<!-- The tribal knowledge that wastes agent time. Examples: -->

- `pnpm test` requires the db container; if tests hang on startup,
  run `docker compose up -d db` first.
- `packages/contracts` changes ripple into both apps — expect type
  errors in `apps/*` until you rebuild (`pnpm build --filter contracts`).
- Windows agents: scripts assume a POSIX shell; use WSL.

## Tool-Specific Configuration

Not here. Harness-specific glue lives in bottom-tier files that point back
to this one rather than restating it: `CLAUDE.md` (Claude Code),
`GEMINI.md` (Gemini CLI), and `CODEX.md` (Codex CLI). This file stays
vendor-neutral.

**Codex users:** Codex auto-loads *this* file (`AGENTS.md`) but does not
auto-load `CODEX.md` — read `CODEX.md` too. It covers Codex specifics,
most importantly that this repo's frozen-zone and destructive-command
rules are honor-system under Codex (no hook layer enforces them).
