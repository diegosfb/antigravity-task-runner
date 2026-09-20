# Agent content threat model

Review findings across prompt injection, secrets and exfiltration, dangerous execution, excessive agency, supply-chain behavior, filesystem/archive attacks, and unsafe output handling. Static matches are candidates: confirm reachability, attacker control, authority, and executable context before assigning a final verdict. Documentation may legitimately show dangerous examples; executable scripts deserve a higher presumption of reachability.

Recommended dispositions are `CONFIRMED`, `MITIGATED`, `FALSE_POSITIVE`, `ACCEPTED_RISK`, and `NEEDS_HUMAN_REVIEW`. Suppress only a reviewed false positive or explicitly accepted risk, and require an expiry.
