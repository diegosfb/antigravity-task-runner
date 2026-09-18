---
description: Spec-aware adversarial security pass against an ephemeral, synthetic-data environment. Advisory — never blocks a build; drives spec-validation-agent's spec-red-team subagent.
---

# Red Team

Runs the spec-aware adversarial security pass (the adversarial ceiling above
the deterministic SAST/DAST/dependency floor) against an ephemeral,
synthetic-data environment. Invoke with
`/red-team-workflow`, or call it from another workflow as an advisory
security step. This workflow is ADVISORY: it never blocks, never fails a
build, and never fixes application code. Confirmed findings ship with
regression tests that become real gates only after you review and merge them.

Prerequisites: the `spec-red-team` subagent under
`.agents/agents/spec-validation-agent/subagents/`, specs under `docs/specs/`,
and a disposable ephemeral environment seeded with synthetic data. This workflow will NOT attack anything it cannot confirm is
non-production.

---

## Step 1 — Confirm an ephemeral target

Ask me for the ephemeral environment's base URL if I have not already given
one. Then verify it is safe to attack:

- The host must be a throwaway/test environment, never production.
- The dataset must be synthetic, never real or production data.

If either cannot be confirmed, STOP and tell me. Do not send a single request
to an unconfirmed target.

## Step 2 — Stand up / verify the environment (optional)

If I have a bring-up command for the ephemeral env, run it and wait until the
target responds. Use synthetic data only.

// turbo
```bash
# Replace with your real ephemeral bring-up, e.g.:
# docker compose -f docker-compose.test.yml up -d
# then poll until the base URL is healthy
```

If no bring-up command is configured, assume the target is already running
and proceed.

## Step 3 — Run the adversarial pass

Invoke the `spec-red-team` subagent against the confirmed target. Instruct it
to:

- Derive enforceable rules from the specs in `docs/specs/` and the solution's
  security classification.
- Generate and execute business-logic and security-control attacks
  (authorization bypass across every endpoint touching a resource, IDOR,
  state-machine abuse, quota/limit bypass, error/secret leakage, and — if
  applicable — AI/LLM/MCP tool-layer authz and prompt-injection).
- Write a regression test for each CONFIRMED finding, in the repo's test
  framework, asserting the correct denied/safe behavior.

Let it run to completion. Do not interrupt it to fix anything.

## Step 4 — Tear down (if you brought it up)

If Step 2 started the environment, tear it down now.

// turbo
```bash
# Replace with your real teardown, e.g.:
# docker compose -f docker-compose.test.yml down -v
```

## Step 5 — Report (advisory only)

Present the ranked findings and stop — this is review input, not a gate:

```raw
RED-TEAM — <date>   TARGET: <ephemeral url> (non-prod: yes)
CLASSIFICATION: <class>   RULES: <n>   ATTACKS: <n>

Findings: Critical <n> · High <n> · Med <n> · Low <n>
| Sev | Status | Rule / Control | Impact | Regression test |
...

Defended (held correctly): <list>
```

Then state the triage path explicitly: confirmed findings should be fixed,
and their regression tests reviewed and merged — those merged tests join the
deterministic blocking floor. Do NOT fail or block on any finding here, and
do NOT modify application code. Remediation is a separate task I will direct.
