# Judging Rubrics

One rubric per artifact type. Score every dimension 1-5 (1 = seriously deficient,
3 = adequate, 5 = exemplary) with a one-line justification citing evidence.
"Must fix" findings are guideline violations, correctness defects, or safety
gaps — they force a REWORK verdict regardless of scores.

## Rubric A — Architecture design
(`docs/architecture/architecture.md` + ADRs)

| Dimension | What 5 looks like |
|---|---|
| Requirements coverage | Every functional and non-functional requirement in the specs maps to a design element; no orphan requirements |
| Guideline compliance | Every decision complies with `development_guidelines.md`; forced choices cite the guideline |
| Fit-to-scale | Complexity matches the actual scale/scope; no speculative infrastructure, no under-engineering of stated NFRs |
| Decision quality (ADRs) | Expensive-to-reverse decisions each have an ADR with real options considered and honest consequences |
| Boundaries & buildability | Component boundaries are checkable; a builder subagent could implement from this without guessing |
| Risk handling | Risks and trade-offs are named with mitigations; open questions have owners |
| Security posture | AuthN/Z, data sensitivity, transport, secrets, and validation addressed proportionally to the domain |
| Operability | Deployment, observability, and failure/degradation behavior are designed, not deferred |

## Rubric B — Solutioning / technical decomposition

| Dimension | What 5 looks like |
|---|---|
| Spec fidelity | Tasks trace to spec/PRD scope; nothing invented, nothing dropped |
| Dependency correctness | Edges are real technical dependencies, complete, and acyclic |
| Task granularity | Items are one-branch-sized; no task hides a project |
| Seam clarity | Cross-domain seams (API contracts, data landings, handoffs) are explicit and owned |
| Alternative honesty | Where options existed, the chosen path is justified against at least one real alternative |

## Rubric C — Implementation
(feature branch diff vs backlog item)

| Dimension | What 5 looks like |
|---|---|
| Acceptance criteria | Every criterion demonstrably satisfied; no criterion silently reinterpreted |
| ADR conformance | The code respects every binding ADR; deviations are flagged, not smuggled |
| Guideline compliance | Follows `development_guidelines.md` (stack, boundaries, forbidden patterns) |
| Correctness & edge cases | Happy path plus the edge cases the spec names; no obvious failure modes unhandled |
| Test adequacy | Behavior changes carry tests; tests assert outcomes, not implementation details |
| Simplicity | Smallest diff that satisfies the requirement; no drive-by refactors or speculative abstraction |
| Security hygiene | Input validation, no secrets in code, least privilege where applicable |

## Judge prompt template

Send the judge model this structure (fill the brackets, attach the artifact and
binding inputs verbatim, include ONLY the relevant rubric):

```text
You are an independent technical judge. You did not produce this work and you
must not assume its author's choices are yours to defend.

ARTIFACT TYPE: [architecture | solutioning | implementation]
BINDING INPUTS: [specs / PRD / development_guidelines.md / acceptance criteria / ADRs — attached]
ARTIFACT: [attached]

Score each rubric dimension 1-5 with a one-line justification that cites the
specific section, file, or line. Then list:
1. MUST FIX — violations of the binding inputs, correctness defects, safety gaps.
2. IMPROVEMENTS — ranked by impact-per-effort, each with impact and effort (S/M/L).
Judge against the binding inputs, not your own preferences. If the binding
inputs force a choice you dislike, compliance is correct.
Do not propose expanding scope. Cite evidence for every claim; uncited claims
will be discarded.
```

## Report template

```markdown
# Judgment: <artifact> — <YYYY-MM-DD>

**Verdict:** ACCEPT | ACCEPT-WITH-IMPROVEMENTS | REWORK
**Judge model:** <provider>/<model> via <backend>  (author: <provider>/<model> from <provenance source | assumed>)
[⚠ SAME-MODEL JUDGMENT banner if applicable]

## Scores
| Dimension | Score | Justification (with citation) |

## Must fix
- <finding> — <evidence citation>

## Improvements (ranked)
1. <improvement> — impact: <what gets better>, effort: S|M|L

## Notes
<anything the producing agent needs for its next pass>
```
