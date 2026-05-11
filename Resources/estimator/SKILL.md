---
name: software-estimation
description: Software architecture effort estimator. Use this skill whenever a software architect, tech lead, or PM needs to scope work and produce man-hour estimates with skill profile breakdowns. Trigger on phrases like "estimate this", "how long will this take", "how many engineers do I need", "scope this feature", "break down the effort", "give me a man-hour estimate", "what profiles do I need", or any description of a software deliverable that needs a resource forecast. Even when the user describes a feature or project without explicitly asking for an estimate — if they seem to need one, proactively use this skill.
---

# Software Estimation

> **Goal**: Produce accurate man-hour estimates and skill profile breakdowns for software work, calibrated against a mid-level engineer baseline.

## The Mid-Level Engineer Baseline

All estimates use a **mid-level software engineer** as the unit of measure:

- **Effective productive hours**: 5–6 hours/day out of an 8-hour workday (meetings, code review, context-switching, and ramp-up reduce raw capacity)
- **Competency**: Familiar with the stack, implements independently, occasionally needs architectural guidance
- **Senior multiplier**: 0.6× (senior finishes in 60% of the time)
- **Junior multiplier**: 1.5× (junior takes 50% longer)

Apply seniority multipliers when the actual team is known; otherwise default to the mid-level baseline.

---

## Phase 1: Clarify Before Estimating

Estimating with insufficient information is the #1 cause of blown timelines. Before producing numbers, make sure you understand:

1. **Deliverable** — Exactly what needs to be built, changed, or removed?
2. **Boundaries** — What is explicitly out of scope?
3. **Tech stack** — Language, frameworks, cloud infra, constraints?
4. **Codebase context** — Greenfield or brownfield? Existing patterns to follow?
5. **Quality bar** — MVP/prototype or production-grade with full test coverage?
6. **Integrations** — External APIs, third-party services, downstream system dependencies?

If any of these are unclear, ask before estimating. Assumptions made here must be stated explicitly in the output.

---

## Phase 2: Decompose the Work

Break the deliverable into **components** grouped by these categories. Only include categories that apply:

| Category | What belongs here |
|----------|-------------------|
| **Backend** | APIs, services, business logic, background jobs |
| **Frontend** | UI components, pages, state management, routing |
| **Infrastructure / DevOps** | Cloud resources, CI/CD pipelines, environments, monitoring |
| **Data / Database** | Schema design, migrations, queries, seed data |
| **Security** | Auth flows, authorization rules, encryption, secrets management |
| **QA / Testing** | Test plans, automation, exploratory testing |
| **Documentation** | API docs, runbooks, architecture decision records |
| **Coordination** | Design reviews, cross-team sync, stakeholder updates |

If a task looks bigger than ~40 hours, decompose it further before estimating — large blobs are where estimates go wrong.

---

## Phase 3: Three-Point Estimation (PERT)

For each work item, estimate three scenarios:

| Scenario | Meaning |
|----------|---------|
| **Optimistic (O)** | Everything goes smoothly — no surprises, requirements are clear |
| **Most Likely (M)** | Normal friction — one small surprise or a design rethink mid-task |
| **Pessimistic (P)** | Something is harder than expected — a dependency is flaky, approach needs changing |

**PERT expected value:**
```
Expected = (O + 4×M + P) / 6
Std Dev  = (P - O) / 6
```

### Mid-Level Engineer Productivity Benchmarks

Use these as sanity checks — calibrate up or down based on domain complexity and codebase familiarity:

| Work Type | Optimistic | Most Likely | Pessimistic |
|-----------|-----------|-------------|-------------|
| Simple CRUD endpoint + unit tests | 2h | 4h | 8h |
| Complex business logic endpoint | 4h | 10h | 20h |
| DB schema design + migration | 1h | 3h | 6h |
| Simple UI component | 2h | 5h | 10h |
| Full UI page (moderate complexity) | 4h | 10h | 20h |
| Integration with external API | 4h | 12h | 24h |
| Authentication / authorization flow | 4h | 12h | 24h |
| CI/CD pipeline setup | 2h | 6h | 12h |
| Cloud infrastructure provisioning | 3h | 8h | 16h |
| Unit test coverage for a module | 1h | 3h | 6h |
| E2E test suite for a feature | 4h | 10h | 20h |
| Data migration script | 2h | 6h | 14h |
| Technical documentation (page) | 1h | 3h | 5h |

---

## Phase 4: Identify Required Skill Profiles

Map each work category to the canonical profiles below. Only list profiles with meaningful work (>4h expected).

| Profile | Abbreviation | Core Responsibilities |
|---------|-------------|----------------------|
| Backend Engineer | BE | APIs, services, data models, integrations, business logic |
| Frontend Engineer | FE | UI components, SPA pages, state management |
| Fullstack Engineer | FS | Covers both BE + FE (use when team size is small) |
| DevOps / Platform Engineer | OPS | CI/CD, cloud infra, deployments, observability |
| QA Engineer | QA | Test plans, automation suites, exploratory testing |
| Data Engineer | DE | Pipelines, ETL, analytics infrastructure |
| Security Engineer | SEC | Auth design, threat modeling, compliance |
| Tech Lead / Architect | TL | Design decisions, code review, coordination overhead |
| Project Manager | PM | Stakeholder sync, planning, progress tracking |

**Default overhead items to always include:**
- **QA**: 25% of total development effort (unless QA is explicitly out of scope)
- **PM/coordination**: 12% of total development effort
- **Tech Lead review**: 10% of total development effort (code review, design, unblocking)

---

## Phase 5: Contingency

Add contingency **on top of** the PERT expected value based on uncertainty level:

| Situation | Add |
|-----------|-----|
| Well-understood, existing patterns, experienced team | +10% |
| Some unknowns, partially new tech or new team members | +20% |
| Significant unknowns, new technology, greenfield | +35% |
| Research/exploration or first-of-kind work | +50–75% |

---

## Output Format

Always produce the full estimation in this structure:

---

```markdown
# Estimation: [Project / Feature Name]

**Date:** [ISO date]
**Estimation basis:** Mid-level engineer @ 5–6 productive hours/day

---

## Executive Summary

| Metric | Low | Expected | High |
|--------|-----|----------|------|
| Total Man-Hours | Xh | Xh | Xh |
| Calendar Duration (1 engineer) | X weeks | X weeks | X weeks |
| Confidence | — | XX% | — |

> Confidence is based on detail level available (see Cone of Uncertainty below).

---

## Required Skill Profiles

| Profile | Expected Hours | What They're Building |
|---------|---------------|----------------------|
| Backend Engineer | Xh | [specific work] |
| Frontend Engineer | Xh | [specific work] |
| DevOps Engineer | Xh | [specific work] |
| QA Engineer | Xh | [specific work] |
| Tech Lead | Xh | [design + review] |
| **TOTAL** | **Xh** | |

---

## Work Breakdown

| # | Component | Profile | O | M | P | Expected | Notes |
|---|-----------|---------|---|---|---|----------|-------|
| 1 | [Task name] | BE | Xh | Xh | Xh | Xh | [any note] |
| 2 | [Task name] | FE | Xh | Xh | Xh | Xh | |
| … | | | | | | | |
| | **Dev Subtotal** | | | | | **Xh** | |
| | QA (25% of dev) | QA | | | | **Xh** | |
| | Tech Lead (10% of dev) | TL | | | | **Xh** | |
| | PM overhead (12% of dev) | PM | | | | **Xh** | |
| | Contingency (X%) | — | | | | **Xh** | |
| | **GRAND TOTAL** | | | | | **Xh** | |

---

## Assumptions

1. [Assumption — be specific about what was assumed and why it matters]
2. …

**Re-estimate trigger:** List the conditions under which this estimate should be revisited (e.g., if integration X turns out to need custom auth, add 20h).

---

## Risks

| Risk | Likelihood | Impact | Effect on Estimate |
|------|-----------|--------|--------------------|
| [Risk] | Low/Med/High | Low/Med/High | +Xh if realized |

---

## Cone of Uncertainty

This estimate's accuracy depends on how much detail is available right now:

| Available detail | Estimate accuracy |
|------------------|------------------|
| Idea / concept only | 0.5× – 2× this estimate |
| High-level requirements | 0.7× – 1.5× |
| Detailed requirements + mockups | 0.8× – 1.25× |
| Full spec + tech design | 0.9× – 1.1× |
```

---

## Rules

- Never give a single-point estimate — always give a low/expected/high range.
- State all assumptions explicitly. They're what gets invalidated first.
- QA, TL review, and PM overhead are rarely zero — default to including them unless explicitly told otherwise.
- If a task exceeds ~40h expected, decompose it before estimating.
- Express calendar duration in context of team size (e.g., "4 weeks with 1 BE + 1 FE").
- Senior engineers are ~1.5–2× faster; apply a 0.6× multiplier to their tasks if team is known.
- Match precision to knowledge — don't report "42.3 hours" when you're working from a concept description.
