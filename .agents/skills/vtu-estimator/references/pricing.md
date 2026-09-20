# AI Pods Offering Catalog — Pricing Model v6.1

---

## Classification Factors (C × R × E)

### Complexity (C)

| Value | Label | Qualifying Criteria |
|:---:|---|---|
| 0.5 | Low | Well-understood domain, simple CRUD, fully documented, clear stable requirements |
| 1.0 | Standard | Typical enterprise application, moderate business logic, some integration points |
| 1.5 | High | Complex domain (finance, healthcare), distributed systems, event-driven architecture, significant integrations |
| 2.0 | Very High | Real-time systems, ML/AI pipelines, multi-tenant SaaS, novel algorithms, extreme scale |

### Risk (R)

| Value | Label | Qualifying Criteria |
|:---:|---|---|
| 0.8 | Low | Internal tooling, no compliance requirements, failure is inconvenient not critical |
| 1.0 | Standard | Customer-facing, standard SLAs, moderate business impact if delayed |
| 1.5 | High | Revenue-critical, regulatory compliance (SOX, PCI DSS, HIPAA), data privacy obligations |
| 2.0 | Critical | Life-safety systems, financial trading, critical national infrastructure, zero-downtime requirements |

### Environment (E)

| Value | Label | Qualifying Criteria |
|:---:|---|---|
| 1.0 | Greenfield | No existing system, clean slate, no legacy constraints |
| 1.25 | Moderate Brownfield | Some legacy components, documentation exists and is accessible, loose coupling |
| 1.5 | Heavy Brownfield | Significant legacy, poor or partial documentation, tightly coupled components |
| 2.0 | Archaeological | Undocumented legacy, original team gone, tribal knowledge lost, no test coverage |

**Multiplier formula:** `C × R × E`

Example: C=1.5, R=1.5, E=1.5 → multiplier = **3.375** (everything takes 3.4× base effort)

---

## AI Validation Levels

| Level | Expert Capacity Multiplier | When to Apply |
|---|:---:|---|
| `none` | 1.0× | **Default for all new engagements.** No AI augmentation assumed. |
| `pre_screening` | 1.5× | Client has mature CI/CD, APM/observability logging, and structured automated test suites available from Month 1 of the engagement. Must be evidenced in the SOW. |
| `operational` | 2.0× | Requires 3+ months of pre-screening data collected on THIS specific client codebase with a documented AI rejection rate < 15%. Cannot be applied to new engagements. |

**Critical rule:** Never raise the AI validation level to make pricing fit a budget target. If the numbers only work at `operational`, fix the scope or team size instead.

Apply the multiplier to `vtu_capacity_per_month` for affected experts:
`effective_capacity = vtu_capacity_per_month × ai_level_multiplier`

---

## Subscription Pricing Formula

Use `references/execution-standard.md` for active-window rules, deterministic option transforms, and rounding behavior.

```
Step 1: Talent Cost   = Σ (team_size_FTE × monthly_rate_USD × active_months_for_that_expert)
Step 2: Management    = Talent Cost × 0.05
Step 3: Tokens        = Σ (artifact_count × tokens_per_unit × C×R×E) × 1.2 × ($10 / 1,000,000)
         Note: tokens_per_unit from artifacts.md; 1.2 is a safety buffer; result is total token cost
Step 4: Platform Fee  = $50 × number_of_unique_expert_types × duration_months
         Note: number_of_unique_expert_types = count of distinct expert keys on the team (not FTE)
Step 5: Internal Cost = Talent Cost + Management + Tokens + Platform Fee
Step 6: Subscription  = Internal Cost × 2.5
```

Additional pricing rules:

- `active_months_for_that_expert` comes from the time-boxed schedule in `execution-standard.md`.
- If an expert is only active in a subset of months, do not charge their talent cost across the full duration.
- Platform fee always uses full option duration, not active months.
- Budget signals may inform the recommendation, but must not alter any formula input above.

---

## Pricing Options

| Option | Scope Adjustment | Duration Adjustment |
|---|---|---|
| Robust | Full artifact scope, standard buffers | As scoped |
| Lean | Use the deterministic reductions defined in `execution-standard.md` | As scoped |
| Accelerated | Full scope | Duration × 0.75, rounded per `execution-standard.md` |
| Budget-Optimized | Full scope | Duration × 1.25, rounded per `execution-standard.md` |

**Phase 1 Pilot:** Auto-generate when any option total > $2M. Scope: first 3–4 months covering discovery and foundation artifacts only. Target: < $1M total.
