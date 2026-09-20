---
name: g-e-technical-feasibility
description: |
  Validates that a proposed architecture (ADRs and Architecture design documents) satisfies the PRD at a mid-to-high level, flagging architecture-level gaps before delivery begins.
  Use when: confirming the initial ADRs fit the PRD, checking the architectural feasibility of requirements, validating that the proposed architecture makes sense for the requirements, or when invoked programmatically by architecture-review-agent.
  Example requests: "does our architecture fit the PRD", "check technical feasibility", "validate the ADRs against the requirements", "is this architecturally feasible".
---

# Technical Feasibility Check

Validate that a proposed architecture — the Architecture design documents and Architecture Decision Records (ADRs) — satisfies the requirements captured in the Product Requirements Document (PRD), at a mid-to-high architectural level. This skill is used at project startup and as a mandatory gate within the `architecture-review-agent` workflow. The PRD's requirements may be expressed as epics, user stories, or capabilities; each is checked for fit against the proposed ADRs. This skill produces a feasibility verdict — it does not modify the PRD or the ASD, and it does not author architecture decisions.

The check evaluates fit in one direction: does the proposed ADRs satisfy each PRD requirement? A gap is resolved either by refining the requirement (Return to Product) or by evolving the architecture through a proper Architecture Decision Record (ADR) process — which is initiated outside this skill, never authored here.

## Invocation modes

### Agent mode (called by architecture-review-agent)

When this skill is invoked programmatically by `architecture-review-agent`, inputs are passed directly as file paths — do **not** ask the user for them:
- `prd_path`: path to the approved PRD (e.g., `docs/project_description/PRD.md`)
- `architecture_path`: path to the architecture package (e.g., `docs/architecture/`)

Load the files, proceed directly to Step 1, and write the report to
`docs/reviews/technical-feasibility-<slug>-<YYYY-MM-DD>.md`. Return the report
path and the feasibility verdict to the calling agent.

### Interactive mode (called by a developer directly)

Both inputs are required to begin the check. A feasibility check has nothing to evaluate without the requirements and the proposed architecture, so this skill cannot proceed without both.

1. **Check memory** for previously stored PRD and ADRs paths for this project.
2. If found, load them and proceed.
3. If not found in memory, ask the developer for:
   - The Product Requirements Document (PRD) — the initial requirements, which may be expressed as epics, user stories, or capabilities (file path, link, or pasted content)
   - The Architecture Design documents and ADRs — the proposed initial architecture (file path, link, or pasted content)
4. If the developer provides them, store both paths in memory and proceed.
5. If either is missing after asking, state that the check cannot proceed without both and wait.

### Authority Boundaries

**You CAN:** assess whether the proposed ASD satisfies the PRD, identify architecture-level gaps, recommend Return to Product for adjustable requirements, report a failed feasibility when the architecture cannot satisfy a requirement, and offer to hand off the gap context to a proper ADR process.

**You CANNOT:** modify the PRD or the ADRs, author or initiate an ADR, design new architecture, or make architectural decisions. Producing the ADR is the responsibility of a dedicated ADR process, not this skill — this skill only flags the need and, if the developer accepts, prepares the context.

## Workflow

### Step 1: Confirm Inputs and Enumerate Requirements

The PRD and the ADRs are gathered in Prerequisites. Before validating:

1. Confirm both inputs are in hand. If either is still missing, say so and wait — the check cannot proceed without both.
2. Enumerate each requirement from the PRD (epic, user story, or capability) to be validated, so every one is covered in Step 2 and none is silently skipped.

### Step 2: Check Compliance

For each requirement, assess whether the proposed ASD satisfies it across the three validation areas detailed in `assets/validation-framework.md`. Load that file for the full checklist and per-area criteria. Cover every dimension below — partial validation is a quality defect.

**Area 1 — Architecture compliance**
- **Architecture pattern fit** — Does it fit the documented patterns (e.g., REST, event-driven, CQRS), or does it implicitly introduce a new one?
- **Technology fit** — Does the requirement need technologies not in the ADR stack?
- **Integration fit** — Does it require integrations not defined in the ADR?
- **Infrastructure fit** — Can it be hosted on ADR-defined infrastructure, or does it need new services, regions, or network zones?
- **Constraint compliance** — Does it violate any ADR-documented constraint (technology ban, compliance mandate, cost boundary)?

**Area 2 — Component and data mapping**
- **Component/service fit** — Can an existing ADR component (PBC or service) own this capability, or does it require a new one?
- **Data fit** — Does it store or access data through ADR-defined data sources, without introducing a new data store?

**Area 3 — Non-functional requirements**
Check each sub-area explicitly — citing one does not satisfy the others:
- **Performance** — Does the requirement risk violating any ADR-defined performance SLO (e.g., latency, throughput, load-time targets)?
- **Security** — Does it introduce an authentication, authorization, data-protection, or API-security gap relative to ADR security controls?
- **Scalability** — Does its load profile fit ADR-defined scaling strategies without new capacity rules?

For each gap found, identify:
- **What** — what the requirement needs that the proposed ADR does not provide, or where the requirement conflicts with the ADR
- **Where** — which specific section of the ADR (or PRD) the gap relates to

Never say "generally looks fine." If ADR coverage of something is absent, treat it as a gap.

**Gap calibration — examples for real gaps:**
- A technology not in the ADR stack is required
- A new external integration not in the ADR is required
- No existing PBC can own the capability (a new one would be needed)
- A new data store or storage technology is required
- An ASD-documented constraint is directly violated

**These are NOT gaps:**
- How an existing ADR-defined component implements a behavior (implementation detail)
- An SLA or operational metric not covered by ADR NFRs, unless the ADR explicitly contradicts it
- A minor omission in ADR documentation that doesn't block the requirement (e.g., a policy referenced elsewhere in the ADR but not explicitly restated in a given section)

### Step 3: Determine Decision Outcome

After identifying gaps, determine the feasibility verdict for each requirement:

#### Approve
No gaps found. The proposed ADR satisfies the requirement — it is feasible as written.

#### Return to Product
Gaps exist, but they can be resolved by adjusting the requirement itself — not the architecture. The requirement needs to be refined to fit within the proposed ADR before work can continue.

**Also applies when acceptance criteria are undefined or ambiguous in ways that could imply a prohibited mechanism.** If a requirement contains open-ended language (e.g., "latency to be defined with product", "real-time", "instantly") that could be interpreted as requiring a prohibited technology or pattern, treat this as a gap requiring product refinement — even if a compliant implementation path exists. A compliant path existing does not make the requirement itself compliant if the requirement language is still unresolved.

#### Not Feasible
Gaps exist that cannot be resolved by adjusting the requirement alone — the proposed architecture cannot satisfy the requirement without an architecture change. Report the failed feasibility: state the gap and explain why the requirement is not compliant with the proposed ADR.

Do not author or initiate an Architecture Decision Record as part of this verdict. After reporting the failed feasibility, you may offer to compile the gap context so it can feed a proper ADR process — but only as an optional next step the developer accepts. The ADR itself is decided and authored outside this skill.

When gaps exist, present the developer with the applicable next step:
- **Return to Product** — adjust the requirement to fit the proposed ADR
- **Not Feasible** — the architecture cannot satisfy the requirement; optionally hand off the gap context to a proper ADR process

For each, explain the **process and scope implications only** — what changes in the requirement, or what would be handed off to the ADR process. Do NOT describe, hint at, or suggest what the new architecture would look like; that is determined by the ADR process, not this step.

### Step 4: Report Results

Use the templates in `assets/output-templates.md` to structure your output.

- Non-compliant (adjustable) → Template 1a: Return to Product
- Not feasible (architecture change needed) → Template 1b: Not Feasible
- Compliant → Template 2: Approved
- Multiple requirements → append Template 3: Summary

Show non-compliant results first, then compliant ones.

### Reminders

- Cite the specific ADR (or PRD) section for every finding.
- This skill does not modify the PRD or the ADR, and does not author or initiate an ADR — it produces a feasibility verdict and, at most, offers to hand off gap context.
- Recommending "Return to Product" or reporting "Not Feasible" is within your scope. Designing solutions or authoring ADRs is not.
- When describing technology gaps, state the category of missing technology (e.g., "Salesforce API client / SDK not in ADR stack") — do not enumerate specific library or tool options, even if the ADR lists them as prohibited. Naming specific options implies a recommendation.
- Cover all three validation areas for every requirement — partial validation is a quality defect.

## Output

The developer receives a **Technical Feasibility Report** — a compliance report structured using the templates in `assets/output-templates.md`:

- **Non-compliant (adjustable)** — Template 1a: Return to Product, listing gaps, affected ADR sections, and what in the requirement must change
- **Not feasible (architecture change needed)** — Template 1b: Not Feasible, explaining the gap and why the proposed architecture cannot satisfy the requirement
- **Compliant** — Template 2: Approved, confirming the proposed ADR satisfies the requirement
- **Multiple requirements** — Template 3: Summary table appended after individual results

**Agent mode:** always write the report to `docs/reviews/technical-feasibility-<slug>-<YYYY-MM-DD>.md` (the calling agent requires a saved file at a predictable path).

**Interactive mode:** when the developer chooses to save the report, write it to `docs/reviews/technical-feasibility-<slug>-<YYYY-MM-DD>.md`. Legacy path `.globant-skills-docs/technical-feasibility/` is accepted for existing projects that already use it.

## Scope

Architecture feasibility validation tool. Run at project startup (interactive mode) or as a mandatory gate within the `architecture-review-agent` pipeline (agent mode) — before the delivery plan is created — to confirm that the proposed architecture fits the PRD at a mid-to-high architectural level. It is not a per-sprint or in-pipeline check beyond the architecture review gate.

- **Reads:** the PRD (initial requirements) + the proposed architecture package (architecture.md + ADRs)
- **Writes:** the Technical Feasibility Report to `docs/reviews/technical-feasibility-<slug>-<YYYY-MM-DD>.md`
- **Feeds into:** `architecture-review-agent` verdict (mandatory); `g-e-implementation-plan` once requirements are confirmed feasible; a proper ADR process when a Not Feasible verdict is handed off
