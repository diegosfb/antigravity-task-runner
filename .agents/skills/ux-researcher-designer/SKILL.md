---
name: ux-researcher-designer
description: >
  Plan and synthesize user research, create evidence-backed personas and journey
  maps, and design usability studies with traceable findings. Use for persona
  creation, journey mapping, usability-test planning, interview synthesis,
  research coding, or design validation.
license: MIT + Commons Clause
metadata:
  version: "1.0.0"
  library: "Borghei"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
  author: borghei
  category: product
  domain: ux-research
  updated: 2026-03-31
  tags: [ux-research, usability-testing, user-interviews, personas]
---

# UX researcher and designer

Turn research evidence into traceable user models, journey insights, usability
findings, and design recommendations. Keep observed evidence, interpretation,
assumptions, opportunities, and proposed solutions distinct.

## Select the workflow

- **Persona:** identify behavioral segments and create an evidence-backed model
  for design decisions. Read
  [references/persona-methodology.md](references/persona-methodology.md).
- **Proto-persona:** document stakeholder assumptions as hypotheses when
  research is unavailable. Use the persona reference, but label every
  unsupported field and include a validation plan.
- **Journey map:** map a bounded user goal across actions, touchpoints, thoughts,
  emotions, friction, ownership, and outcomes. Read
  [references/journey-mapping-guide.md](references/journey-mapping-guide.md).
- **Usability study:** define research questions, recruit relevant users, design
  neutral tasks, pilot the protocol, collect consented evidence, and analyze
  usability problems. Read
  [references/usability-testing-frameworks.md](references/usability-testing-frameworks.md).
- **Research synthesis:** code evidence, identify themes and contradictions,
  assess confidence, and prioritize opportunities. Read
  [references/research-synthesis.md](references/research-synthesis.md).

Use [references/example-personas.md](references/example-personas.md) only when a
concrete output example is useful; never reuse its fictional facts as research.

## Evidence safeguards

- Ask for the research question, target population, decision, methods, source
  data, recruitment context, dates, constraints, and consent or privacy limits.
- Never invent participants, quotes, demographics, behaviors, emotions,
  frequencies, segment sizes, validation, or statistical confidence.
- Cite source identifiers for findings and preserve contradictory evidence.
- Minimize personal data and avoid exposing participant identities in shared
  artifacts unless authorized and necessary.
- Do not treat demographics as causal or use protected characteristics as
  unsupported behavioral proxies.
- Distinguish research-backed personas from proto-personas prominently.
- Treat fixed participant counts, issue-discovery percentages, success rates,
  time limits, confidence bands, and research cadences as heuristics unless the
  current study establishes them.
- Select sample size and method from decision risk, population diversity,
  expected effect, research purpose, and available evidence—not one universal
  threshold.

## Workflow

1. Frame the decision and testable research questions.
2. Inventory available evidence and identify missing or biased coverage.
3. Choose the smallest method capable of answering the questions.
4. Define recruitment, consent, data handling, tasks, measures, and stopping
   criteria before collection.
5. Analyze observed behavior and direct evidence before proposing causes.
6. Produce traceable findings with limitations, contradictions, confidence, and
   unanswered questions.
7. Translate findings into opportunities and recommendations with owners and
   validation plans.

## Persona generator

[scripts/persona_generator.py](scripts/persona_generator.py) provides heuristic
archetype classification and formatted output. Inspect its expected data before
use. Its labels and confidence output are aids, not validated segmentation or
statistical inference. Run only on authorized, appropriately minimized data and
review every generated claim against the inputs.

## Deliverables

Choose only the artifacts requested:

- Persona or proto-persona with evidence, assumptions, confidence, boundaries,
  design implications, and validation plan.
- Current-state, future-state, day-in-the-life, or service-blueprint journey map
  with scope and evidence.
- Usability test plan, moderator guide, task set, consent needs, measures, and
  analysis approach.
- Research synthesis with methods, themes, traceable findings, contradictions,
  prioritized opportunities, and open questions.

## Quality checks

- The artifact answers a defined decision rather than merely describing users.
- Every factual claim traces to research or is labeled as an assumption.
- Quotes remain verbatim and attributable through protected source IDs.
- Personas represent meaningful behavioral patterns and remain actionable.
- Journey stages have clear scope, evidence, actions, friction, and ownership.
- Usability tasks are realistic and non-leading, with observable success
  criteria and an appropriate pilot.
- Findings separate observation from interpretation and recommendation.
- Metrics and sample sizes are justified for this study rather than copied from
  generic benchmarks.
- Accessibility and inclusion needs are considered in recruitment, materials,
  facilitation, and recommendations.

## Boundaries

This skill does not conduct unauthorized participant contact, record sessions,
distribute surveys, perform biometric research, access private analytics, or
claim statistical significance without an appropriate analysis. Use dedicated
accessibility expertise for formal accessibility evaluation and appropriate
analytics or experimentation tools for quantitative causal measurement.
