# Execution Ordering Heuristics

Sequencing rules for producing a one-by-one execution order over backlog items,
adapted from the v1 jira-project-execution-orderer. These refine responsibility 2
("sequence by dependency order first, then by priority and risk") for the common
case where a single AI developer agent executes exactly one item at a time.

## Ordering priorities

1. **Explicit dependencies and blockers first.** When explicit dependency links
   conflict with summary-based intuition, trust the explicit links.
2. **Foundations before features:** architecture, infrastructure, shared
   contracts, environments, schemas, auth, and CI/CD come before anything that
   depends on them.
3. **Pull risk-reducing and unblocking work earlier** when it unlocks later
   implementation.
4. **Optimize for testability:** place testing, QA, verification, integration,
   and e2e items immediately after the scope they validate — never leave all
   testing to the end.
5. **Minimize context switching:** prefer runs of related items over
   interleaving unrelated areas, as long as dependencies allow.

## Output rules

- Every backlog item appears exactly once in the sequence; never invent items.
- Attach a one-line rationale to each position so the operator can follow the
  sequence's logic.
- When the backlog mixes foundational and feature work, bias toward unblockers
  first and dependent features later.
