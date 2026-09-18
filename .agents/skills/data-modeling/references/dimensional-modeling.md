# Dimensional Modeling

## Declare Grain First

State exactly what one fact row represents before choosing dimensions or measures. Mixing grains produces ambiguous joins and double counting.

Common fact patterns include transactions, periodic snapshots, accumulating snapshots, and factless events. Choose based on the business process and questions, not convenience.

## Facts and Measures

Classify measures by how they aggregate across dimensions and time. Record currency, unit, sign, timezone, precision, and late-correction behavior. Keep derived metrics in an governed semantic layer when definitions must be shared across products.

## Dimensions

Define business keys, surrogate keys where useful, unknown or not-applicable handling, conformed attributes, and role-playing behavior. Avoid overloading one dimension with unrelated lifecycle concepts.

## History

Select history behavior per attribute:

- Overwrite when correction without historical interpretation is intended.
- Version rows when analysis must reflect the value effective at the event time.
- Preserve limited previous state only when the business requirement is truly limited.

Specify effective boundaries, current-row rules, late-arriving changes, inferred members, restatements, and overlap prevention. Named SCD types are shorthand, not a substitute for these semantics.

## Star and Snowflake Tradeoffs

Star models can simplify consumption; normalized dimensions can reduce duplication or centralize complex hierarchies. Measure performance and consider the semantic layer, warehouse optimizer, refresh process, governance, and user comprehension. Neither layout is universally faster or better.

## Validation

Reconcile facts to source totals, test joins for fanout, verify each measure at every supported aggregation, and exercise late arrivals, corrections, unknown members, and historical point-in-time queries.
