# Validation Framework — Detailed Criteria

This reference contains the full checklist and criteria for each of the three validation areas, plus how to consolidate gaps into a decision outcome:

## Table of Contents
1. [Area 1: Architecture Compliance Validation](#area-1-architecture-compliance-validation)
2. [Area 2: Component Architecture Mapping](#area-2-component-architecture-mapping)
3. [Area 3: Quality Attributes & NFR Validation](#area-3-quality-attributes--nfr-validation)
4. [Consolidating Gaps and Determining the Decision Outcome](#consolidating-gaps-and-determining-the-decision-outcome)

## Area 1: Architecture Compliance Validation

**Goal:** Confirm that requirements align with the ASD's technical framework.

### 1.1 Pattern Compliance
**ASD reference:** Software Architecture → Architecture Patterns

Check that the requirement:
- Can be implemented using one or more of the architecture patterns already documented in the ASD
- Does not implicitly introduce a new pattern (e.g., adding event sourcing when the ASD only documents REST-based patterns)
- Does not contradict an existing architectural decision recorded in the ADR log

**Questions to ask:**
- Which ASD pattern covers this requirement?
- Does the requirement fit naturally into that pattern, or does it require stretching/bending it?

### 1.2 Technology Stack Compatibility
**ASD reference:** Software Architecture → Technology Stack

Check that the requirement:
- Can be implemented with the approved technology stack
- Does not require adding new technologies not present in the ASD
- Does not require upgrading or replacing existing stack components

**Questions to ask:**
- Does the implementation require any library, framework, or runtime not in the ASD tech stack?
- If a new technology is needed, does the ASD explicitly permit extension, or is there a constraint?

### 1.3 Integration Point Validation
**ASD reference:** Integration Strategy → Key Integrations

Check that the requirement:
- Uses only integration points defined in the ASD
- Does not require new external integrations not described in the ASD
- Complies with the integration protocols, contracts, and versions documented

**Questions to ask:**
- Does this requirement call an external system? Is that integration in the ASD?
- Does it respect the integration owner, type, and spec version as documented?

### 1.4 Implementation Capacity
**ASD reference:** Software Architecture → Architecture Patterns (and team context)

Assess whether:
- The team has the skills to implement the requirement within ASD-defined patterns
- The requirement's complexity is within the team's architectural understanding

**Note:** This is an advisory check, not a blocker by itself. Flag concerns here but do not let skill gaps alone mark a requirement as non-compliant.

### 1.5 Infrastructure Compliance
**ASD reference:** Infrastructure Architecture

Check that the requirement:
- Can be hosted on the infrastructure described in the ASD
- Does not require new infrastructure components (new cloud services, new regions, new network zones) not in the ASD
- Respects defined environment boundaries (dev, staging, prod)

### 1.6 Architectural Integrity Impact
**ASD reference:** Constraints → Specification

Assess whether the requirement:
- Introduces technical debt not sanctioned by the ASD
- Violates ASD-documented constraints (technology bans, compliance mandates, cost boundaries)
- Degrades maintainability of the existing architecture

## Area 2: Component Architecture Mapping

**Goal:** Map each requirement to concrete ASD architectural components to confirm they exist and can fulfill the requirement.

### 2.1 PBC Mapping

**ASD reference:** Software Architecture → Packaged Business Capabilities (PBC Diagram)

For each requirement, identify:
- Which PBC(s) in the ASD will own or execute this capability
- Whether the PBC's defined role and scope covers this requirement
- Whether the PBC already exists or whether the requirement is implicitly creating a new one (which would be a critical gap)

**Checklist:**
- [ ] Requirement maps to ≥1 named PBC in the ASD
- [ ] The PBC's documented scope includes this capability
- [ ] No new PBC is being implicitly created

### 2.2 Data Sources Compliance
**ASD reference:** Data Strategy → Key Data Sources

Verify:
- The data the requirement reads/writes is stored in an ASD-documented data source
- The requirement does not introduce a new data store not described in the ASD
- Data flows between PBCs comply with the ASD's data strategy

**Checklist:**
- [ ] All data entities touched by the requirement have a home in the ASD's data strategy
- [ ] No new database, cache, or storage technology is being added
- [ ] Data ownership between PBCs is respected

### 2.3 Service Dependencies
**ASD reference:** Integration Strategy → Key Integrations

Map:
- All service-to-service calls the requirement introduces or relies on
- That each dependency is a documented integration in the ASD
- That the dependency direction aligns with the ASD's integration topology

**Checklist:**
- [ ] All service calls reference documented ASD integrations
- [ ] Dependency direction does not create circular dependencies not present in ASD
- [ ] Spec versions and contracts are respected

---

## Area 3: Quality Attributes & NFR Validation

**Goal:** Confirm that the requirement can be implemented while meeting the ASD's non-functional targets.

### 3.1 Performance Target Alignment
**ASD reference:** Non-Functional Requirements → Performance and Scalability

Assess whether the requirement:
- Can meet ASD-defined SLOs (e.g., response time, throughput)
- Doesn't degrade existing performance SLOs of the components it touches
- Has been scoped in a way that allows the ASD's performance patterns to apply

**Red flags:**
- Requirement calls for synchronous processing of large data volumes where ASD mandates async
- Requirement adds N+1 query risks in a performance-sensitive path

### 3.2 Security Pattern Compliance
**ASD reference:** Non-Functional Requirements → Security and Privacy

Verify:
- Authentication and authorization approach follows ASD-defined security patterns
- Data handling complies with ASD privacy requirements (encryption at rest/in transit, PII handling)
- No new security surfaces are introduced without ASD coverage

**Checklist:**
- [ ] Auth/authz mechanism matches ASD security patterns
- [ ] PII and sensitive data handled per ASD privacy specification
- [ ] No new ports, endpoints, or access paths bypassing ASD security controls

### 3.3 Scalability & Usability Fit
**ASD reference:** Performance and Scalability (for Scalability) + Operational Requirements (for Usability)

For scalability:
- Does the requirement's load profile fit within ASD-defined scaling strategies?
- Does it require new auto-scaling rules or infrastructure capacity not in the ASD?

For usability:
- Are operational requirements (observability, logging, alerting) met per ASD operational standards?
- Can the requirement be monitored and operated within existing tooling defined in the ASD?

---

## Consolidating Gaps and Determining the Decision Outcome

**Goal:** Consolidate all validation gaps from Areas 1–3 and map them to the decision outcome defined in SKILL.md Step 3.

This skill produces **decision outcomes** (Approve / Return to Product / Not Feasible), not severity ratings. Do not classify gaps with a severity vocabulary (Critical/Major/Minor, or BLOCKER/MAJOR/MINOR) — that belongs to review skills, not to this compliance check.

### Mapping gaps to outcomes

**Not Feasible — the proposed architecture cannot satisfy the requirement.** Choose this when a gap cannot be closed without altering the architecture:
- A new architecture pattern is required (Area 1.1)
- A technology not in the approved stack is needed (Area 1.2)
- A new external integration is required (Area 1.3)
- New infrastructure not in the ASD is required (Area 1.5)
- An ASD-documented constraint must be relaxed (Area 1.6)
- A new PBC must be created to own the capability (Area 2.1)
- A new data store or storage strategy is needed (Area 2.2)
- ASD NFR targets cannot be met within existing patterns (Area 3)

Report this as a failed-feasibility verdict with the gap and the reason. This skill does not author or initiate the ADR — after reporting, it may offer to hand off the gap context to a proper ADR process, which decides and authors any change.

**Return to Product — the requirement can be adjusted to fit the ASD.** Choose this when the gap is in the requirement, not the architecture:
- The requirement uses documented components in non-standard ways that could be refined to standard usage
- Requirement wording is ambiguous relative to ASD terminology
- Open-ended or undefined acceptance criteria could imply a prohibited mechanism (see SKILL.md Step 3)
- An edge case is not documented in the ASD but is resolvable within it

**Approve — full compliance.** All checks pass and the requirement maps cleanly to the existing architecture.

### Consolidation checklist

Before finalizing the compliance report, confirm:
- [ ] All three validation areas have been assessed for every requirement
- [ ] Every gap cites the specific affected ASD section, not a general principle
- [ ] Each requirement has a clear decision outcome: Approve, Return to Product, or Not Feasible
