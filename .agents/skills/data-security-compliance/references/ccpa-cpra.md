# California Privacy Workflows

## Legal Boundary

Applicability thresholds, defined terms, exemptions, required notices, request timing, and enforcement guidance can change. Confirm current California statutory and regulatory requirements with authoritative sources and qualified privacy or legal reviewers.

## Operational Model

Map approved requirements into systems for:

- Notice at collection and purpose tracking
- Requests to know, access, correct, delete, or obtain portable data where applicable
- Opt-out of sale or sharing
- Limiting use or disclosure of sensitive personal information where applicable
- Recognized browser or device preference signals
- Service-provider, contractor, and third-party restrictions
- Non-discrimination controls and request evidence

Avoid assuming that a single boolean preference covers every purpose, recipient, identity, or legal state.

## Preference Enforcement

Represent preferences with subject, scope, purpose, jurisdiction, source, effective time, and provenance. Propagate changes to collection, activation, advertising, sharing, exports, and downstream processors through explicit policy enforcement.

Default behavior must follow the organization's approved interpretation. Do not infer that missing preference data means unrestricted sharing.

## Verification

Test:

- Anonymous and authenticated preference signals
- Conflicts across devices, accounts, and browser signals
- Downstream suppression and processor propagation
- Re-entry after preference changes
- Identity verification and authorized-agent workflows
- Audit evidence without storing sensitive payloads

Use synthetic data and verify current implementation requirements before release.
