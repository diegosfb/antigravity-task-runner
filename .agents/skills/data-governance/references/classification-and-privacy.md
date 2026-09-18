# Classification and Privacy

Use for classification taxonomy, discovery, labeling, handling requirements, and privacy-preserving data use.

## Build a contextual taxonomy

Define categories with privacy, security, legal, and business owners. Common dimensions include identifiability, sensitivity, contractual restriction, regulatory category, business criticality, residency, and approved use. Avoid assuming that a field is non-sensitive in every combination or jurisdiction.

For each class define:

- Examples and counterexamples
- Handling, access, masking, sharing, and environment rules
- Retention and deletion authority
- Required evidence and review cadence
- Escalation for ambiguous cases

## Discovery workflow

1. Inventory structured and unstructured stores in approved scope.
2. Use schema names, metadata, patterns, classifiers, and sampled content under controlled access.
3. Record detection method, confidence, sample basis, and timestamp.
4. Route candidates to an accountable steward or privacy reviewer.
5. Publish validated labels and propagate them through lineage where justified.
6. Monitor drift, false positives, and false negatives.

Regex and column-name heuristics are candidate generators, not proof. Do not copy sensitive sample values into findings.

## Protection choices

Choose among minimization, suppression, generalization, masking, tokenization, encryption, synthetic data, or approved keyed pseudonymization according to re-identification need and threat model. Hashing alone may be reversible through guessing when the source domain is small or predictable.

Validate analytical utility, access behavior, joins, downstream propagation, and re-identification risk before rollout.

