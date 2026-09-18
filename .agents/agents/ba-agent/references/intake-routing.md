# Intake Routing

## Purpose
Use this reference to route the incoming request based on source type before drafting the spec.

## Routing Rules

### Plain Text
- Extract the feature name, objective, actors, user flow clues, requirements, and acceptance hints.
- Identify missing information and start the interview if needed.

### Local Text or Document File
- Read the file directly when accessible.
- Summarize known facts before interviewing.

### Attached Image or Local Image Path
- Inspect the image with the available image capability.
- Extract UI clues, visible labels, layouts, states, and annotations.
- Ask clarifying questions about unseen behavior, validation, data, and interactions.

### Audio or Video
- Use a transcript if available.
- If no transcript exists, run `skills/harvesting-meeting-context` to transcribe the recordings into structured transcripts plus a `meeting-analysis.md`, then treat those outputs as source evidence.
- If the skill cannot run in the current runtime (missing tools, no install permission), ask the user to provide a transcript or a written summary.
- Do not guess behavior from partial media understanding.

### Confluence URL
- Use available Atlassian tools to fetch the page content when accessible.
- If the page cannot be accessed, ask the user to paste the relevant content or provide an export.

## After Intake
Once the source has been read:
1. list what is known
2. list what is still missing
3. interview until the missing items no longer create ambiguity
