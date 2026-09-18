# Interview and Input Handling

## Supported Input Types
The incoming feature request may be provided as:
- plain text
- local markdown, text, or document files
- attached files
- images
- audio
- video
- a Confluence URL

## Intake Rules
- Start by identifying the source type and extracting all explicit facts from it.
- Preserve source fidelity. Use the source material as evidence, not as a loose prompt.
- If the input already contains enough detail, move directly to writing the spec.
- If not, stop and interview the user before drafting.

## Tool-Aware Handling
- For text files or local docs: read the file contents directly when possible.
- For images: inspect them with the available image-reading capability.
- For Confluence URLs: use available Atlassian tools to retrieve the page when accessible.
- For audio or video: use direct transcripts if available. If the runtime cannot reliably transcribe the media, ask the user for a transcript or written summary.

## Interview Standard
Interview like a product expert. Ask the minimum number of targeted questions needed to remove ambiguity in:
- feature name
- target user or actor
- user goal and business value
- entry point or trigger
- happy path
- UI layout or visual expectations
- validation rules
- permissions or role differences
- data inputs, outputs, and state changes
- error conditions and edge cases
- success criteria and testable acceptance criteria

## Stop Rule
If core behavior is still unclear, do not write the file yet.

Continue interviewing until:
- the feature can be described without guessing
- the user flow is coherent
- the functional requirements are specific
- the acceptance criteria are testable

## Open Questions Rule
`## 6. Open Questions / Ambiguities` is not a substitute for skipped discovery.

Use it only for:
- external dependencies the user cannot yet confirm
- architectural decisions intentionally deferred
- unresolved business or policy decisions owned by another stakeholder

Do not use it for obvious questions you failed to ask.
