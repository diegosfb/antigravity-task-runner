# Epic Template

Use this exact markdown structure for epic files:

```md
# Epic: [Epic Title]

## Summary
A 1-2 sentence summary of the epic's scope and intended outcome.

## Specification Reference
- `docs/specs/<source-spec>.md`

## Scope
- A concise bullet list of the work this epic covers.

## Child Issues
- `feature-<name>.md`
- `task-<name>.md`
- `bug-<name>.md`

## Acceptance Criteria
- Specific, testable epic-level outcomes.

## Notes
- Additional planning notes, sequencing guidance, or refinement warnings.
```

## Notes
- Replace placeholders with actual titles and repo-relative file references.
- If child issue files are not known yet when the epic is first written, create the section and update it after child files are created.
