# g-e-technical-feasibility — Skill Documentation

## What this skill is for

`g-e-technical-feasibility` takes the **PRD** (Product Requirements Document — the initial requirements, as epics, user stories, or capabilities) and the **proposed ASD** (Architecture Specification Document — the initial architecture) and produces a **Technical Feasibility Report**: a per-requirement verdict of Approved, Return to Product, or Not Feasible.

Four things define how it works:

1. **The check runs in one direction only** — does the proposed ASD satisfy each PRD requirement? It never asks whether the requirements justify the architecture.
2. **It is a verdict, not an edit.** The skill does not touch the PRD or the ASD, and it does not design anything.
3. **Every requirement is enumerated first**, then checked against all three validation areas, so none is silently skipped.
4. **Gaps end in one of two doors** — refine the requirement (Return to Product), or hand the gap to an ADR (Architecture Decision Record) process that lives outside this skill.

**Use it when you:**
- Are at project startup with a proposed architecture and a first set of requirements, and want to know whether they fit
- Need architecture-level gaps surfaced before delivery begins rather than mid-sprint
- Want a defensible record of which requirements are blocked and why

**Don't use it for:**
- Producing the architecture document itself -> use `g-e-asd-create` or `g-e-asd-extract`
- Pinning down integration specs and contracts -> use `g-e-integration-contracts`
- Turning approved requirements into work -> use `g-e-implementation-plan`
- Authoring the ADR for a Not Feasible verdict — the skill flags the need and, at most, packages the context

---

## How to use it

Point the skill at the two documents — file paths, links, or pasted content — and name the requirements you want checked.

```
"does our architecture fit the PRD"
"check technical feasibility"
"validate the ASD against the requirements"
"is this architecturally feasible"
```

### What happens, step by step

| Step | What the skill does | What you may be asked for |
|---|---|---|
| **1. Gather inputs** | Checks memory for previously stored PRD and ASD paths; if none, asks for both and stores them once supplied | The PRD and the proposed ASD — both, or it stops |
| **2. Enumerate requirements** | Lists every epic, user story, or capability in the PRD so each one is accounted for in the check | Confirmation of the list, if scope is ambiguous |
| **3. Check compliance** | Loads `assets/validation-framework.md` and assesses each requirement across all three validation areas, recording what the gap is and which ASD section it sits in | — |
| **4. Determine the outcome** | Maps the consolidated gaps to Approved, Return to Product, or Not Feasible per requirement | Your choice on whether to package gap context for an ADR process |
| **5. Report** | Renders the results with `assets/output-templates.md`, non-compliant first, plus a summary table when more than one requirement was reviewed | Whether to save the report to disk |

### The three validation areas

| Area | What is checked |
|---|---|
| **1. Architecture compliance** | Pattern fit, technology stack, integration points, implementation capacity (advisory only), infrastructure, and documented constraints |
| **2. Component and data mapping** | Whether a named PBC (Packaged Business Capability) or service can own the capability, whether the data has a home in the ASD, and whether service dependencies are documented |
| **3. Non-functional requirements** | Performance SLOs, security and privacy patterns, scalability and operability — each checked separately |

### What you get back

- One block per requirement: Return to Product, Not Feasible, or Approved, each citing the specific ASD section behind every finding
- A summary table with the decision per requirement and the totals, when more than one was reviewed
- An offer to compile the gap context for an ADR process, on a Not Feasible verdict only
- On request, the report saved to `.globant-skills-docs/technical-feasibility/technical-feasibility-report-YYYY-MM-DD.md` under the project root

---

## Requirements

### Mandatory: both documents

The skill cannot start with only one. Without the requirements there is nothing to check, and without the proposed architecture there is nothing to check against — so it asks for whichever is missing and waits rather than guessing.

### What makes the check sharper

| Input | What it improves |
|---|---|
| **An ASD with explicit constraints and NFR targets** | Gaps can cite a concrete boundary rather than an absent one; missing coverage is treated as a gap, so vague ASDs produce more findings |
| **Requirements with defined acceptance criteria** | Avoids Return to Product verdicts triggered purely by open-ended wording |
| **A named ADR log inside the ASD** | Lets the check catch requirements that contradict a decision already recorded |
| **Stable file paths for the PRD and ASD** | Stored in memory, so repeat runs skip the intake questions |

### Supported inputs

File path · link · pasted content, for both documents. Requirements in any granularity — epic, user story, or capability — are handled the same way.

---

## Caveats for new users

**It refuses to start on one document.** There is no "check what you can" mode. If either the PRD or the ASD is missing after asking, the skill states that the check cannot proceed and waits — a one-sided feasibility check produces confident nonsense.

**It never tells you what the new architecture should look like.** On a Not Feasible verdict you get the gap and the reason, and nothing else. Suggesting a fix would pre-empt the ADR process, so the skill deliberately withholds it — even when the answer looks obvious. If you want a direction, that conversation belongs to the ADR process.

**"Not Feasible" is a verdict about the current document, not a permanent judgment.** It means the proposed ASD as written cannot satisfy the requirement. Most such verdicts are resolved by an architecture decision made elsewhere and then rechecked, not by dropping the requirement.

**Silence in the ASD counts as a gap.** If the ASD does not cover something, the skill records a gap rather than assuming it is fine. It is explicitly barred from writing "generally looks fine". Expect more findings from a thin ASD than from a thorough one.

**A requirement can be sent back even when a compliant implementation exists.** Wording like "real-time", "instantly", or "latency to be defined with product" is treated as a gap on its own, because unresolved language can later be read as requiring a prohibited mechanism. The verdict is about the requirement text, not about whether someone could build it correctly.

**No severity labels, on purpose.** There is no Critical/Major/Minor or BLOCKER vocabulary here — only the three decision outcomes. Severity ratings belong to the review skills, and mixing the two vocabularies makes the report look like a code review rather than a gate.

**Technology gaps are named by category, never by product.** A finding says "a Salesforce API client is not in the ASD stack", not which library to adopt — naming a specific option would read as a recommendation, which is out of scope even when the ASD lists candidates.

**It is a startup gate, not a recurring check.** The skill validates the initial ASD against the initial PRD at mid-to-high level. It is not designed for per-sprint or in-pipeline validation, and running it that way costs a full re-read of both documents for findings scoped to a level of detail sprints do not operate at.

**Every requirement is checked against all three areas.** Reviewing ten user stories means thirty area assessments and a correspondingly long report. Narrow the requirement set up front if you only care about a subset.

---

## Pipeline position

```
g-e-asd-create / g-e-asd-extract  ->  g-e-technical-feasibility  ->  g-e-implementation-plan
g-e-project-brief-create (the PRD)              |                     (requirements confirmed feasible)
                                                |
                       Return to Product  <-----+-----> ADR process (external)
                    (requirement is refined)          (Not Feasible gap context handed off)
```

---

## Files in this skill

| Path | Purpose |
|---|---|
| `SKILL.md` | The skill definition, authority boundaries, workflow, and output contract |
| `skill.metadata.json` | Marketplace metadata (name, version, tags, SDLC phase) |
| `assets/validation-framework.md` | The full per-area checklist and the gap-to-outcome mapping; loaded at the compliance step |
| `assets/output-templates.md` | The four report templates (Return to Product, Not Feasible, Approved, Summary); loaded at the reporting step |
