# Financial Metrics Orientation

This reference supplies common definitions and historical SaaS heuristics for
model design. It is not an accounting policy, audit standard, or source of
universal targets. Confirm definitions, recognition treatment, benchmark
cohorts, and reporting periods with the organization's finance owner and
current authoritative guidance before external or contractual use.

## Revenue Recognition (ASC 606)

### Key Principles
- Recognize revenue when control transfers to customer
- Revenue is the amount expected to be received (transaction price)
- Deferred revenue for advance payments not yet earned

### Common SaaS Metrics

**ARR (Annual Recurring Revenue)**
- Sum of annualized value of all active recurring subscriptions
- Formula: `Monthly Recurring Revenue × 12` OR `Sum of annual contract values`
- Only includes recurring revenue (exclude one-time fees, professional services)

**MRR (Monthly Recurring Revenue)**
- Sum of monthly value of all active recurring subscriptions
- New MRR: New customers × monthly price
- Expansion MRR: Upgrades from existing customers
- Contraction MRR: Downgrades from existing customers
- Churned MRR: Cancelled subscriptions
- Net New MRR = New + Expansion - Contraction - Churned

**Bookings vs Revenue**
- Bookings: Total contract value signed (can be future revenue)
- Revenue: Amount recognized in accounting period per GAAP
- Deferred Revenue/Unearned Revenue: Bookings not yet recognized as revenue

## Customer Acquisition Metrics

**CAC (Customer Acquisition Cost)**
- Formula: `Total Sales & Marketing Expenses / Number of New Customers Acquired`
- Include: Salaries, commissions, advertising, marketing tools, overhead allocation
- Exclude: Customer success costs (those are retention, not acquisition)
- Time period: Typically calculated quarterly or annually
- Attribution: Use same period for both numerator and denominator, or add lag

**CAC Payback Period**
- Formula: `CAC / (Monthly Recurring Revenue per Customer × Gross Margin %)`
- Measures months to recover acquisition cost
- Historical heuristic: under 12 months; validate against segment, margin,
  capital availability, growth stage, and the organization's target.

**LTV (Lifetime Value)**
- Formula: `Average Revenue per Customer / Churn Rate × Gross Margin %`
- Alternative: `Monthly Recurring Revenue × Average Customer Lifetime × Gross Margin %`
- Average Customer Lifetime = `1 / Churn Rate`

**LTV:CAC Ratio**
- Formula: `LTV / CAC`
- Historical heuristic: 3:1 has often been used as a reference point. Treat
  lower or higher values as investigation prompts, not diagnoses.

## Profitability Metrics

**Gross Margin**
- Formula: `(Revenue - Cost of Goods Sold) / Revenue`
- COGS for SaaS: Hosting, support, professional services delivery
- Excludes: S&M, R&D, G&A
- Historical heuristic: 70%+ is often cited for software subscriptions, but
  valid targets vary materially with hosting, services, support, and segment.

**EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization)**
- Formula: `Net Income + Interest + Taxes + Depreciation + Amortization`
- Non-GAAP metric but widely used
- Approximates cash generation capability

**Operating Margin**
- Formula: `Operating Income / Revenue`
- Operating Income = Revenue - Operating Expenses
- GAAP metric showing profitability from core operations

**Burn Rate**
- Gross Burn: Total cash spent per month
- Net Burn: Monthly revenue - monthly expenses
- Runway: `Cash on Hand / Net Burn Rate` (in months)

## Growth Metrics

**Revenue Growth Rate**
- Formula: `(Current Period Revenue - Prior Period Revenue) / Prior Period Revenue`
- Report as YoY (Year-over-Year) and QoQ (Quarter-over-Quarter)

**Cohort Analysis**
- Group customers by acquisition period (month/quarter)
- Track retention, revenue, expansion by cohort over time
- Essential for understanding unit economics at scale

**Net Revenue Retention (NRR)**
- Formula: `(Starting MRR + Expansion - Contraction - Churn) / Starting MRR`
- Measures revenue retention from existing customers
- Interpretation: 100% means expansion offsets contraction and churn for the
  defined cohort and period; it is not a universal performance target.
- Also called Net Dollar Retention (NDR)

**Logo Retention**
- Formula: `Customers at End of Period / Customers at Start of Period`
- Excludes expansion revenue, only tracks customer count
- Different from revenue retention (NRR)

## Rule of 40

**Formula**: `Revenue Growth Rate % + Profit Margin %`
- Historical heuristic: 40% is a common investor shorthand, not an accounting
  rule or universal target; define the growth and margin inputs explicitly.
- Example: 30% growth + 15% margin = 45% (good)
- Example: 60% growth - 25% margin = 35% (acceptable for high-growth)

## Common Calculation Errors to Avoid

1. **Mixing cash and accrual accounting**: Use accrual for GAAP, cash for cash flow analysis
2. **Including non-recurring revenue in ARR/MRR**: Only recurring subscriptions count
3. **Wrong time periods for CAC**: Match expense period with customer acquisition period
4. **Ignoring gross margin in LTV**: LTV must account for cost to deliver service
5. **Double-counting**: When summing across categories, ensure no overlap
6. **Wrong denominator in retention**: Use cohort starting value, not current value

## Financial Model Structure Best Practices

### Assumptions Tab
- Clearly label all key assumptions (growth rates, churn, pricing, margins)
- Source assumptions (market research, historical data, management guidance)
- Make assumptions easy to change for scenario analysis
- Use consistent formatting (blue text for inputs)

### Historical Data
- Minimum 2-3 years of historical data for context
- Clearly separate actuals from projections
- Use consistent time periods (months, quarters, years)

### Projections
- Use a projection horizon appropriate to the decision; fundraising models
  often show three to five years, with uncertainty increasing over time.
- Monthly detail for first year, quarterly for subsequent years
- Build bottoms-up (unit economics) then validate against top-down
- Include multiple scenarios (base, upside, downside)

### Documentation
- Explain calculation methodology for non-obvious metrics
- Note any departures from GAAP or standard definitions
- Document key assumptions and their sources
- Include data refresh dates for external data
