# Child Issue Template

Use this exact markdown structure for child issue files:

```md
# [Issue Type]: [Issue Title]

## Summary
A short summary of the work and why it exists.

## Epic Reference
- `docs/backlog/epic-<epic-name>.md`

## Specification Reference
- `docs/specs/<source-spec>.md`

## Description
- A concise, actionable description of the implementation scope.

## Acceptance Criteria
- Specific, testable conditions for completion.

## Dependencies
- None.

## Notes
- Supporting implementation context, refinement guidance, or follow-up details.
```

## Notes
- `[Issue Type]` must be one of `Feature`, `Bug`, or `Task`.
- Use repo-relative file references.
- Keep the description actionable and scoped to one logical unit of work.
