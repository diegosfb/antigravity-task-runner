# Output Templates

Use these templates when reporting compliance results.

---

## Template 1a: Return to Product (Adjustable)

Use when gaps exist but can be resolved by adjusting the requirement — not the architecture.

```markdown
## [ID — Title]

**Compliance Status: Return to Product — Requirement adjustment needed**

| # | What doesn't comply | Where in the ASD |
|---|---------------------|------------------|
| 1 | [Specific description of the violation] | [ASD section, e.g., "Software Architecture > Technology Stack"] |
| 2 | [Specific description of the violation] | [ASD section] |

> **Warning:** This requirement cannot proceed to implementation as written.
> The gaps above can be resolved by refining the requirement to fit within existing ASD constraints.
> Return to Product for adjustment before continuing.
```

---

## Template 1b: Not Feasible (Architecture Change Required)

Use when gaps cannot be resolved by adjusting the requirement — the proposed architecture cannot satisfy it without an architecture change.

```markdown
## [ID — Title]

**Compliance Status: Not Feasible — Architecture change required**

| # | What doesn't comply | Where in the ASD |
|---|---------------------|------------------|
| 1 | [Specific description of the gap] | [ASD section] |
| 2 | [Specific description of the gap] | [ASD section] |

> **Warning:** This requirement is not feasible under the proposed architecture as written — the ASD cannot satisfy it without an architecture change.
> This is a failed-feasibility verdict, not an architecture decision. If you want, the gap context above can be handed off to a proper ADR process — that process, not this check, decides and authors any change.
```

---

## Template 2: Approved (Compliant)

Use when a requirement fully aligns with the ASD.

```markdown
## [ID — Title]

**Compliance Status: Approved — Compliant with ASD**

- [Brief compliance point, e.g., "Fits within the OrderManagement PBC — Software Architecture > PBC Diagram"]
- [Brief compliance point, e.g., "Uses Kafka event-driven pattern — Architecture Patterns"]
- [Brief compliance point, e.g., "Meets <200ms SLO — NFR > Performance and Scalability"]
```

---

## Template 3: Overall Summary (multiple requirements)

Append this at the end when more than one requirement was assessed.

```markdown
## Summary

| ID | Title | Decision |
|----|-------|----------|
| [US-101] | [Title] | Not Feasible |
| [US-102] | [Title] | Return to Product |
| [US-103] | [Title] | Approved |

**Total reviewed:** [n] | **Approved:** [n] | **Return to Product:** [n] | **Not Feasible:** [n]
```
