# Specification Quality Bar

## Quality Threshold
Before writing the file, ensure the specification can answer:
- what problem is being solved
- who is using the feature
- what the user does step by step
- what the system must do
- how failures or strange inputs are handled
- how a tester will know it is complete

If any of those are still fuzzy, keep interviewing.

## File Naming Rules
- Confirm the feature name before generating the filename.
- Convert the feature name to a lowercase kebab-case slug.
- Remove punctuation that does not belong in a filename.
- Use the slug as `<feature-name>.md`.

Examples:
- `Bulk Invite Users` -> `bulk-invite-users.md`
- `Approval Queue Widget` -> `approval-queue-widget.md`

## Overwrite Rule
If `docs/specs/<feature-name>.md` already exists:
- update it only when the user clearly wants a revision or refresh
- otherwise ask before replacing the existing file

## Specification Writing Rules
- Keep the writing concrete and implementation-neutral.
- Reflect explicit UI expectations when provided.
- Make behavior observable and testable.
- Express requirements as system behavior, not vague intent.
- Avoid words like `should be intuitive`, `fast`, or `easy` unless the user defines what they mean.

## Acceptance Criteria Standard
Acceptance criteria must:
- be independently testable
- cover the primary happy path
- cover key permissions and validation rules when relevant
- include error behavior when that behavior matters to completion

Use the exact pattern:
- `Given [condition] When [action] Then [result]`

## Final Validation Checklist
Before saving the file, confirm:
- the title uses the final feature name
- all six required sections exist
- no core requirement is guessed
- open questions are truly unresolved after interview
- the path is `docs/specs/<feature-name>.md`
