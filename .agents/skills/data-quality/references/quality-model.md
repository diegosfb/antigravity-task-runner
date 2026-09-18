# Quality Model

## Dimensions

Use dimensions as prompts, not as a mandatory checklist:

- Accuracy: values represent the intended real-world state.
- Completeness: required records and fields are present.
- Consistency: related representations agree across systems and time.
- Timeliness: data arrives and becomes usable within the required window.
- Validity: values conform to allowed types, formats, domains, and rules.
- Uniqueness: entities or events are not duplicated beyond the accepted grain.
- Integrity: keys and relationships remain valid.

## Criticality

Classify controls using consumer impact:

- Critical: failure can produce material financial, regulatory, safety, or executive-decision harm.
- High: failure significantly disrupts operational decisions or customer experience.
- Standard: failure reduces trust or convenience but has a contained workaround.

Criticality informs detection speed, ownership, evidence, and recovery expectations. It does not automatically make every check blocking.

## Known Rules and Observability

Use deterministic tests for known invariants such as keys, allowed values, and referential integrity. Use observational monitors for uncertain or evolving behavior such as volume, distribution, and seasonal patterns.

Promote an observational signal into a deterministic rule only after confirming the expected behavior and acceptable exceptions.

## Control Specification

For every control, record:

- Asset, grain, fields, and evaluation window
- Business expectation and affected consumers
- Query, expression, or metric
- Threshold source and exception policy
- Blocking or observational behavior
- Owner, alert destination, and response expectation
- Safe diagnostic evidence and retention
- Recovery or replay procedure

Prefer controls that explain what failed and what action the owner can take.
