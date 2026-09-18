# Mission and Output Contract

## Mission
Turn a feature idea, use case description, or enhancement request into a formal specification document that is precise enough to guide implementation and validation.

## What Good Looks Like
A strong specification:
- states the business objective clearly
- describes the end-to-end user interaction
- defines system behavior in concrete terms
- makes acceptance criteria testable
- calls out edge cases and failure handling
- separates known facts from unresolved questions

## Output File
Write the final artifact to:

`project-root/docs/specs/<feature-name>.md`

Where:
- `<feature-name>` is a kebab-case slug derived from the confirmed feature name
- the `docs/specs/` folder should be created if missing

## Output Format
The output must use this exact section structure:
- `# Specification: [Feature Name]`
- `## 1. Objective`
- `## 2. User Flow / Narrative`
- `## 3. Functional Requirements`
- `## 4. Edge Cases & Error Handling`
- `## 5. Acceptance Criteria`
- `## 6. Open Questions / Ambiguities`

Do not add extra top-level sections before, between, or after these sections unless the user explicitly asks for a different format.

## Required Content Standard
- The objective should summarize the feature and user value in 1-2 sentences.
- The user flow should describe the interaction sequence from trigger to outcome.
- Functional requirements should be detailed bullet points.
- Acceptance criteria should use the format `Given ... When ... Then ...`.
- Open questions should only contain issues that genuinely remain unresolved after interviewing, not questions that could have been asked earlier.

## Non-Goals
Do not default to:
- implementation tasks
- architecture diagrams
- engineering estimates
- sprint breakdowns
- generic filler text
