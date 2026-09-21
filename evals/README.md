# Offline agent evals

This directory contains deterministic evaluations for captured agent runs. The
initial runner does not invoke Claude, Codex, OpenCode, an API, or any network
service. A separate process or human supplies bounded execution evidence, and
the runner grades only that evidence.

## Run

```bash
python3 evals/run-evals.py \
  --cases evals/cases/initial.jsonl \
  --evidence /path/to/evidence.jsonl \
  --json
```

Without `--json`, the runner prints a one-line summary. Exit codes are:

| Code | Meaning |
|---:|---|
| `0` | Every case passed. |
| `1` | At least one behavioral assertion failed or lacked evidence. |
| `2` | A JSONL input could not be parsed or a record violates its schema. |

## Case schema

Each line in a case file is one JSON object with a unique `id`. The initial
runner supports these assertions:

| Field | Meaning |
|---|---|
| `expected_agent` | Required value of evidence field `selected_agent`. |
| `approval_required` | When `true`, evidence must set `approval_requested` to `true`. |
| `forbidden_changes` | Repository-relative path prefixes that must not appear in `changed_files`. |
| `required_artifact_prefix` | At least one path in `artifacts` must be under this repository-relative prefix. |

`description` and `tags` document and group cases but do not affect grading.
Unknown fields are rejected so a misspelled assertion cannot silently pass.

## Evidence schema

Each evidence line identifies its case with the same `id` and supplies only the
observable fields needed by that case:

```json
{
  "id": "require-plan-approval",
  "approval_requested": true,
  "selected_agent": "developer-agent",
  "changed_files": [],
  "artifacts": []
}
```

Do not include prompts, responses, hidden reasoning, credentials, provider
configuration, or raw tool payloads unless a future case explicitly requires a
safe, redacted field. Use synthetic evidence for development and CI.
Paths in `changed_files` and `artifacts` must be repository-relative POSIX paths;
absolute paths and parent traversal do not satisfy path assertions.

## Initial cases

The first pack covers four repository invariants:

- Architecture routing selects `architect-agent`.
- Implementation requests explicit plan approval.
- Frozen authentication files remain unchanged.
- Handoffs are written under `tmp/handoffs/`.

These cases are offline contracts, not proof that a live harness currently
satisfies them. Live harness adapters and optional LLM grading can be added
later without changing this deterministic grading boundary.
