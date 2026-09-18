# Operational Guidelines

This directory contains the repository's vendor-neutral operating standards for
people and coding agents. Each guideline explains how to perform a class of
work safely and consistently; it does not replace project requirements or
authorize work outside the current task.

## Authority and precedence

Apply instructions in this order:

1. [`constitution.md`](../../constitution.md) — non-negotiable engineering
   principles, scope control, plan approval, and definition of done.
2. [`AGENTS.md`](../../AGENTS.md) — repository-wide operating instructions and
   boundaries.
3. The applicable guideline in this directory — detailed procedure for the
   work being performed.

If instructions conflict, follow the higher-authority document. Stop and ask a
maintainer when the conflict cannot be resolved without an exception. Tool- or
vendor-specific files may add execution details but cannot override this
precedence.

## Guideline index

| Guideline | Read before |
|---|---|
| [GitHub Flow](github-flow.md) | Creating or cleaning up branches; committing, pushing, opening or reviewing PRs; merging; tagging; or releasing |
| [Jira Flow](jira-flow.md) | Creating, editing, linking, assigning, transitioning, or closing Jira work items |
| [Security](security.md) | Handling authentication, authorization, sessions, secrets, sensitive data, cryptography, dependencies, containers, deployments, or releases |
| [Infrastructure Management](infrastructure-management.md) | Designing, provisioning, modifying, reviewing, or deploying infrastructure and Infrastructure as Code |
| [Monitoring, Logging, and Troubleshooting](monitoring-and-logging.md) | Adding or changing APIs, logs, metrics, traces, alerts, dashboards, health checks, audit events, or troubleshooting instrumentation |

More than one guideline can apply to a task. For example, an infrastructure PR
that introduces application telemetry requires the infrastructure, monitoring,
security, and GitHub Flow guidelines.

## How to use these guidelines

1. Read the constitution and `AGENTS.md` before beginning work.
2. Identify every guideline relevant to the requested operation and read each
   one completely before acting.
3. Include applicable gates, validation, and approval requirements in the task
   plan.
4. Follow the smallest compliant workflow and preserve evidence required for
   review, audit, rollback, and handoff.
5. When a required tool or safe target is unavailable, report the limitation;
   do not silently skip the control or claim it passed.

## Project customization

Projects may extend these guidelines with concrete commands, environments,
ownership, service names, and stricter controls. Customizations must:

- remain consistent with `constitution.md` and `AGENTS.md`;
- preserve security, approval, validation, audit, and rollback requirements;
- avoid embedding credentials, sensitive values, or vendor-specific agent
  configuration;
- link to a single authoritative procedure instead of duplicating policy; and
- update this index when a guideline is added, renamed, or removed.

Changes that weaken a mandatory control require explicit maintainer approval
and documented rationale. Harness-specific instructions belong in files such as
`CODEX.md`, `CLAUDE.md`, or `GEMINI.md`, not in this directory.
