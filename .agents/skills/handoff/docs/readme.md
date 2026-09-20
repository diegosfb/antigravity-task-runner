# Continuing work from a handoff

The `handoff` skill condenses the useful state of a long conversation into a
Markdown document that another agent session can use. Handoffs are local working
files, not project documentation or source-controlled artifacts.

## Create a handoff

Ask the current agent to use the `handoff` skill and, when useful, describe what
the next session should focus on. For example:

> Use the handoff skill. The next session should continue improving the
> agent-usage monitor.

The skill saves the document under:

```text
./tmp/handoffs/<unique-name>.md
```

The path is relative to the project root. The writer creates the directory when
needed, keeps it ignored by Git, applies private permissions, rejects unsafe
paths, and performs a final credential-redaction pass. Keep the path printed by
the agent; it identifies the exact handoff to use next.

## Continue in a new session

Open Claude Code, Codex, or OpenCode in the same project, then provide the
project-relative handoff path:

> Read `./tmp/handoffs/<unique-name>.md` and continue from where the previous
> session stopped.

The new agent should follow the handoff's current state and suggested skills,
while treating referenced specifications, plans, commits, and other canonical
artifacts as the source of truth.

## Important behavior

- Handoffs remain local because the project ignores `./tmp/`.
- Each handoff uses a unique Markdown filename; existing files are not
  overwritten.
- The writer provides a final safety check, but sensitive values should still be
  omitted before the document is written.
- A handoff does not grant new permissions or replace repository instructions,
  approval gates, or canonical project artifacts.
