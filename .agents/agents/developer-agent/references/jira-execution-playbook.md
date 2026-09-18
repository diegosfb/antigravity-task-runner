# Jira Execution Playbook

How to execute a backlog task when Jira is the backlog's system of record.
Adapted from the v1 jira-item-implementer / jira-item-validator agents.
For the Jira API mechanics themselves (transitions, comments, assignment), use
project-planner-agent's `jira-references/jira-manager-playbook.md`.
Before acting, read `.agents/guidelines/jira-flow.md` for work-tracking behavior
and `.agents/guidelines/github-flow.md` for branch and pull-request behavior.

## Item lifecycle contract

For each Jira item you pick up:

1. **Read the item** in full: summary, description, acceptance criteria, links.
2. **Claim it:** transition to `In Progress` and assign it to the executing user.
3. **Start from the latest code:** pull the latest `main`, the only normal
   long-lived branch.
4. **Branch:** create a short-lived branch using the work type, Jira key, and
   description, such as `feature/JIRA-123-short-description` or
   `fix/JIRA-123-short-description`. Do not use `JIRA_{issueKey}` or a
   no-feature-branch mode; direct work on `main` is prohibited.
5. **Implement** respecting the binding constraints, in order of authority:
   `docs/architecture/development_guidelines.md`, `docs/architecture/architecture.md`,
   the ADRs in `docs/architecture/adrs/`, and the item's own acceptance criteria.
6. **Self-validate before submitting** (v1 validator duties):
   - the change meaningfully addresses the item's summary and description;
   - it respects the architecture and development standards;
   - it is testable, and missing validation or follow-through is called out.
   Be strict about real failures; do not invent scope the item never implied.
   This self-check does NOT replace the test-agent gate — it reduces bounces.
7. **On success:**
   - use a Conventional Commit that includes the Jira key, for example
     `feat: JIRA-123 add checkout validation` or
     `fix: JIRA-456 handle expired sessions`;
   - add a Jira comment starting with `AGENT SOLUTION:` briefly describing how
     the issue was solved;
   - open a pull request and transition the item to `In Review`; if that state
     does not exist, stop and report the workflow mismatch rather than skipping
     directly to `Done`.
8. **Leave the work on the working branch.** Never merge it away yourself —
   integration happens through the test-agent → code-review-agent gates.

## Unattended mode

When running unattended, do not stop to ask questions unless truly blocked by
missing critical information or permissions. Instead:

- make the smallest reasonable assumption and proceed;
- record every assumption as a Jira comment starting with `AGENT ASSUMPTION:`;
- mirror the same assumptions into `JiraItem {issueKey}_assumptions.md` next to
  the work, so reviewers see them without opening Jira.

## Failure handling

If implementation or self-validation fails and cannot be repaired in-run:
leave the item `In Progress`, post a Jira comment stating specifically what
failed and what the next attempt needs, and report back through the
developer-agent feedback loop — never transition a failing item forward.
