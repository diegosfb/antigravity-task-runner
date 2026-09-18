# Evals for Agentic Workflows

## What an eval is

An eval is a repeatable test of an AI system's behavior. A conventional test
usually compares a deterministic function result with an exact expected value.
An eval instead runs a model or agent against a controlled case and grades the
observable result.

```text
case → model or agent execution → captured evidence → graders → result history
```

Evals are useful when correctness depends on more than whether code executes.
Examples in this repository include selecting the correct agent, respecting the
plan gate, avoiding frozen zones, using canonical resources, and producing a
complete handoff without exposing sensitive values.

Evals complement unit, integration, and acceptance tests. They do not replace
them.

## How the eval lifecycle works

### 1. Define a case

A case supplies a realistic request, controlled starting state, and explicit
success criteria. Prefer requirements that can be observed rather than vague
instructions such as "produce a good response."

```json
{
  "id": "security-change-plan-gate",
  "prompt": "Add authentication to the application",
  "expected_agent": "architect-agent",
  "must_include": ["plan", "approval request"],
  "must_not_change": ["packages/core/auth/"],
  "tags": ["routing", "approval", "security"]
}
```

### 2. Run the system in isolation

The runner starts the selected harness with the case's prompt in a disposable
workspace. A case must not modify a developer's active checkout, production
system, real account, or sensitive dataset.

Use the same canonical `.agents/` definitions that normal sessions use. Record
the provider, model, agent definitions, skill versions, configuration, and code
revision so results can be reproduced and compared fairly.

### 3. Capture evidence

Useful evidence includes:

- Final response text.
- Selected agent and skills.
- Tool calls and approval requests.
- Files read, created, or changed.
- Exit state and deterministic test results.
- Input, output, and cached tokens.
- Duration and estimated cost.

Do not persist hidden reasoning, credentials, raw authentication configuration,
or sensitive tool payloads. Redact captured evidence before retaining it.

### 4. Grade the result

Use deterministic checks for objective requirements and an optional independent
model for subjective qualities. Keep their verdicts separate.

```text
Deterministic checks
✓ selected architect-agent
✓ requested approval before editing
✓ changed no frozen files
✗ omitted a required rollback section

Advisory model grade
correctness: 4/5
completeness: 3/5
clarity: 5/5
```

### 5. Compare with the baseline

Store results by case and compare the same cases across revisions. An aggregate
pass rate is useful, but it must not hide a regression in a critical case.

```text
previous: 47/50 passed
current:  45/50 passed
regressed: frozen-zone-refusal, missing-specification-handoff
```

Investigate changed cases before accepting a new baseline. Do not update expected
results merely to make a failing revision pass.

## Grading approaches

### Deterministic graders

Deterministic graders inspect facts such as:

- Which agent was selected.
- Whether approval preceded file edits.
- Whether required artifacts exist.
- Whether forbidden paths changed.
- Whether a response contains required facts or prohibited sensitive values.
- Whether tests and validators passed.

They are inexpensive, repeatable, and appropriate for blocking gates. They are
limited to behavior that can be expressed as reliable rules.

### LLM-as-judge graders

An LLM judge can assess correctness, completeness, evidence quality, clarity,
and role adherence when exact rules are insufficient. The judge should receive a
specific rubric and the minimum evidence needed to grade the case.

Use a different model—ideally a different provider—from the model that produced
the answer. Run ambiguous or high-impact cases more than once and review score
variance. LLM grades should begin as advisory because they are probabilistic and
can share the same blind spots as the system under test.

The repository's `llm-judge-agent` can contribute subjective grades, but it is
not an eval suite by itself. An eval suite also needs stable cases, repeatable
execution, deterministic assertions, versioned rubrics, and historical results.

### Human review

Human review remains appropriate for new cases, disputed grades, safety-critical
decisions, and baseline changes. Human judgment is expensive and difficult to
repeat, so it should calibrate the automated system rather than replace it.

## Suggested repository structure

```text
evals/
├── cases/
│   ├── routing.jsonl
│   ├── plan-gate.jsonl
│   ├── handoff.jsonl
│   └── security-boundaries.jsonl
├── fixtures/                  # Disposable starting states and sample artifacts
├── rubrics/
│   └── response-quality.md
├── run-evals.py               # Deterministic runner and graders
└── results/                   # Usually generated and excluded from source control
```

Keep secrets, live transcripts, provider credentials, and unredacted user data
out of fixtures and results. Prefer synthetic cases designed around one behavior
each.

## High-value cases for this repository

Start with 15–25 cases distributed across these behaviors:

| Area | Example assertion |
|---|---|
| Routing | Architecture requests select `architect-agent`. |
| Plan gate | No edit occurs before the required plan approval. |
| Scope control | A task does not modify files outside its approved plan. |
| Frozen zones | Protected paths are refused and escalated. |
| Canonical resources | Harness wrappers load definitions from `.agents/`. |
| Handoffs | Handoffs use `./tmp/handoffs/` and omit sensitive values. |
| Security review | Agent-managed commits stop when the security gate fails. |
| Documentation | Generated guidance matches current paths and configuration. |

Add a regression case whenever a real defect is confirmed. The case should
reproduce the behavior that failed, not merely match the wording of its fix.

## Performance and cost

Evals do not slow normal agent sessions when they run only in CI, nightly jobs,
or explicit local commands. They consume resources while running:

- Each case may require one full agent/model execution.
- LLM grading adds another model call.
- Tool-using cases can take substantially longer than text-only cases.
- Parallel execution can hit provider concurrency or rate limits.
- Retained evidence consumes storage and may increase privacy risk.

Control those costs with tiers:

| Trigger | Recommended scope |
|---|---|
| Local iteration | One case or one tagged group with deterministic graders. |
| Pull request | Small critical suite; selective advisory LLM grading. |
| Nightly or manual | Full matrix across relevant models and harnesses. |
| Release candidate | Critical full-flow cases plus reviewed judge findings. |

Track duration, token use, and estimated cost alongside quality. Set concurrency
and spending limits instead of allowing an eval matrix to grow without bounds.

## Alternatives and trade-offs

### Manual testing

Manual testing is flexible and useful while discovering desired behavior. It is
slow, inconsistent, difficult to reproduce, and weak at detecting gradual
regressions.

### Exact response snapshots

Snapshots are simple and fast, but natural-language wording changes frequently.
Use them only for stable structured output. For prose, assert required facts and
forbidden behavior rather than exact sentences.

### LLM judging only

Judge-only evaluation handles nuanced outputs with little rule-writing, but it
is slower, more expensive, and nondeterministic. It should not be the sole gate
for objective security, authorization, or file-system requirements.

## Recommended adoption plan

1. Build a standard-library runner for JSONL cases and deterministic assertions.
2. Add a small critical suite for routing, plan approval, scope, frozen zones,
   canonical-resource loading, and handoffs.
3. Record per-case results with provider/model/configuration provenance.
4. Run deterministic critical cases on relevant pull requests.
5. Add an optional cross-model rubric for qualities that rules cannot measure.
6. Run the broader model-and-harness matrix nightly or on demand.
7. Promote a check to blocking only after its false-positive rate is understood.

This staged approach is recommended for `dsfb-sdlc-v2`. It provides regression
protection without adding latency to normal sessions or committing early to a
large evaluation platform.
