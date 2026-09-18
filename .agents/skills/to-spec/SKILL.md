---
name: to-spec
description: Convert an already-developed conversation into a validated project specification without conducting a new requirements interview. Use only when explicitly invoked after the relevant decisions have already been discussed.
disable-model-invocation: true
metadata:
  version: "1.0.0"
  library: "Matt Pocock Skills — adapted"
  library-url: "https://skills.sh/mattpocock/skills"
  pack: "Software Development"
---

# To Spec

Synthesize the current conversation and verified repository context into the project's canonical specification. Do not restart discovery or conduct a requirements interview.

## Preconditions

- Use only information already established in the conversation or verified in the repository.
- Read the BA agent's [`SpecCreator-Handbook/`](../../agents/ba-agent/SpecCreator-Handbook/) and [`spec-template.md`](../../agents/ba-agent/references/spec-template.md), plus the relevant domain glossary or ADRs, before drafting.
- Explore the affected code and existing tests when repository understanding is incomplete.
- If the evidence cannot support the BA quality bar without guessing, stop and identify the missing decisions. Do not turn those gaps into assumed requirements.
- If the destination spec exists and the user has not clearly requested a revision, ask before overwriting it.

## Workflow

1. Summarize the established problem, actors, desired behavior, constraints, edge cases, and unresolved items from the conversation and repository evidence.
2. Identify the highest practical testing seams. Prefer existing external-behavior seams over new seams and minimize the number of seams.
3. Ask the user only whether the proposed testing seams match their expectations. This confirmation is a gate, not a new requirements interview.
4. Write `docs/specs/<feature-name>.md` using the exact six-section structure in the BA agent's [`spec-template.md`](../../agents/ba-agent/references/spec-template.md).
5. Express acceptance criteria as independently testable `Given / When / Then` behavior. Record unsupported or unresolved requirements under Open Questions / Ambiguities.
6. Validate the completed artifact against the BA agent's Specification Quality Bar.
7. Read `user_approval_gates.configurable.specifications` from `ADLC_workflow_settings.json` and enforce the BA agent's specification approval gate. Missing or invalid configuration fails safe to `required`.
8. After validation and any required approval, hand the canonical spec to `project-planner-agent` for issue-tracker publication and application of the `ready-for-agent` label. Do not publish the tracker issue directly from this skill.

## Boundaries

- Do not produce implementation code, architecture decisions, estimates, or task decomposition.
- Do not include volatile file paths or code snippets in requirements unless a small prototype-derived shape captures an approved decision more precisely than prose.
- Do not bypass the BA validation or approval gates.
- Do not claim issue publication succeeded; the project planner owns that external mutation.
