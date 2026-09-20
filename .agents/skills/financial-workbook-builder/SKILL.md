---
name: financial-workbook-builder
description: Build or revise decision-ready Excel workbooks for financial models, board reporting, planning, and operational analysis. Use when the deliverable is a real `.xlsx` workbook with formulas, assumptions, controls, and validation; use general spreadsheet tooling for simple tables or lightweight edits.
metadata:
  version: "1.1.0"
  library: "DSFB Generic, adapted by DSFB"
  pack: "Business & Finance"
---

# Financial Workbook Builder

Create the smallest workbook that supports the user's decision and remains understandable, refreshable, and auditable. Produce the requested `.xlsx` artifact rather than only describing it.

## Establish the contract

Use supplied requirements when they are sufficient. Otherwise clarify only material gaps: decision and audience, source data, reporting period, required metrics, assumptions, scenarios, refresh method, output location, and presentation constraints. Confirm the proposed sheets and calculations before a substantial build.

Do not force a standard seven-tab architecture. Add a sheet only when it has a clear user or audit purpose. A typical complex model may separate inputs, calculations, outputs, and documentation; a simple workbook may need only one or two sheets.

## Build

1. Inspect source files and preserve their meaning, units, currencies, dates, identifiers, and lineage. Report missing, malformed, duplicated, or suspicious data instead of silently repairing material values.
2. Design formulas so inputs and assumptions are distinguishable from derived results. Avoid hidden constants inside formulas, unnecessary volatile functions, whole-column calculations, and duplicated business logic.
3. Use available spreadsheet artifact tooling when possible. Use Python libraries such as `openpyxl` or `pandas` only when already available and materially useful; do not add a dependency without need.
4. Apply restrained formatting, accessible contrast, appropriate number formats, freeze panes or filters where useful, and charts only when they clarify a decision.
5. Include sources, definitions, assumptions, units, update instructions, and limitations when the audience needs them.

For non-trivial formula design, read [formula best practices](references/formula_best_practices.md). For charts or executive dashboards, read [visualization best practices](references/visualization_best_practices.md). For SaaS or finance metrics, read [financial metrics](references/financial_metrics.md) and verify definitions against the organization's accounting policy.

## Validate

- Recalculate with a compatible engine when available; do not represent cached or unevaluated formula results as verified.
- Check that expected sheets, tables, formulas, named ranges, filters, number formats, and charts open correctly.
- Test representative formulas and totals independently, including empty, zero, negative, boundary, and divide-by-zero cases where relevant.
- Reconcile source totals to workbook totals and call out unexplained differences.
- Visually inspect rendered sheets when tooling supports it.
- Deliver the workbook with a short summary of inputs, outputs, assumptions, validation performed, and anything intentionally omitted.

## Boundaries

- Treat financial metrics as organization-defined unless an authoritative policy establishes otherwise. “GAAP-aligned” does not mean audited or GAAP-compliant.
- Forecasts, valuations, scenarios, and dashboards are decision aids—not accounting, tax, investment, or legal advice.
- Never invent missing business data or overwrite the user's source file without explicit authorization.
- Do not add macros, external data connections, hidden executable content, or outbound publishing unless explicitly requested and reviewed.
- Keep sensitive data out of examples, logs, and generated intermediate files.
