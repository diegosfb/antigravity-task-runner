# Confirmation Template

Use this structure when presenting the backlog before creating files:

```md
I've analyzed the spec and here's the backlog I'll create:

**Epic:** [Epic Summary]
[Brief description of epic scope]

**Implementation Tickets ([count]):**
1. [Feature] [Ticket title]
2. [Task] [Ticket title]
3. [Bug] [Ticket title]

Shall I create these backlog files in `docs/backlog/`?
```

## Notes
- If the current run explicitly includes `auto-approve`, present the breakdown in this structure and then continue without waiting for a reply.
- If more than one epic is needed, list them before the child issues and group the issues under the correct epic.
- If the spec is large or ambiguous, mention that before asking for confirmation.
- Large backlog guardrail: if the breakdown would create more than 15 child issues, present the full plan and explicitly ask whether to create all of them or reduce scope first, unless the current run includes `auto-approve`.
