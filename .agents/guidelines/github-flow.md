# GitHub Flow and Repository Management Guideline

This is the operational repository-management contract for agents working in
this repository. It governs branch creation, commits, pull requests, review,
merging, QA, releases, tags, and branch cleanup. It is not optional reference
material.

The precedence order is `constitution.md` → `AGENTS.md` → this guideline. If a
requested Git operation conflicts with a higher-level rule, stop and report the
conflict. Exceptions described here require explicit repository-owner approval.

## Strategy

This team uses GitHub Flow with `main` as the single long-lived branch. Work is
performed on short-lived branches and merged through reviewed pull requests.

- `main` is the source of truth and must remain deployable and production-ready.
- Start all work from the latest `main`.
- Use one short-lived branch per issue or task.
- Review all work through a pull request before merging.
- Merge approved work into `main` with GitHub's **Squash and Merge** strategy.
- Perform QA and release activities from the merged state of `main`.
- Do not create long-lived integration, release, or hardening branches unless
  the repository owner explicitly approves an exception.
- Delete merged or clearly abandoned branches unless a specific preservation
  reason is recorded.

## Feature flags

Use feature flags to hide incomplete behavior when necessary to keep `main`
deployable and support trunk-based delivery.

- Name flags `feature_<jira_ticket>_<short_description>`.
- Assign an owner; the PR author is the default.
- Schedule removal within one sprint of reaching 100% rollout.
- Do not leave permanent feature flags. Remove them or convert genuine
  long-term controls into configuration.

## Branch naming

Before creating a branch, determine whether the work has a Jira ticket.

### With a Jira ticket

Use one of these formats:

```text
feature/JIRA-123-short-description
fix/JIRA-123-short-description
hotfix/JIRA-123-short-description
chore/JIRA-123-short-description
docs/JIRA-123-short-description
refactor/JIRA-123-short-description
```

### Without a Jira ticket

Ask the requester for the work type and a short descriptive name. Prefer
creating or linking a Jira ticket so the work remains traceable. Allowed
ticketless formats are:

```text
feature/short-description
fix/short-description
hotfix/short-description
```

### Naming rules

- Keep names short, specific, readable, and lowercase kebab-case after the
  prefix or ticket.
- Do not use generic names such as `fix`, `test`, or `my-work`.
- Use `feature/` for new behavior, `fix/` for ordinary defects, and `hotfix/`
  only for urgent production-impacting corrections.
- Use `chore/`, `docs/`, and `refactor/` only for their stated work types.

## Starting work

1. Update local `main` from the remote.
2. Create and switch to the task branch.
3. Push it and set the upstream.

```bash
git switch main
git pull origin main
git switch -c feature/JIRA-123-short-description
git push -u origin feature/JIRA-123-short-description
```

Never commit directly to `main` and never force-push a shared branch.

## Commit behavior

- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, and related
  types).
- Keep commits focused and traceable to the task.
- Commit after meaningful units of work and push regularly.
- Do not include unrelated cleanup or opportunistic improvements.
- Keep review fixes on the same feature branch and within the same PR.

## Pull-request rules

- One pull request per focused piece of work.
- Open the PR only when the work is ready for review.
- Target `main`.
- Run linting and all relevant tests before opening it.
- Require a green CI pipeline, including Static Application Security Testing
  when configured. A failing or skipped required pipeline is not mergeable.
- Include integration and E2E tests in the merge gate when the project uses
  them.
- Automate reviewer assignment with CODEOWNERS for critical paths when
  CODEOWNERS is configured.
- Do not leave a PR open for more than five business days without explicit
  exception approval.
- Keep `main` stable enough for QA and release without stabilization branches.

### Change-size guidance

Target fewer than 400 lines of meaningful diff, excluding generated files,
lockfiles, and migrations. If a change naturally exceeds that size, consider a
foundational PR followed by a focused PR. Larger changes are not automatically
blocked, but reviewers are not required to meet the standard five-day review
window for them.

### Before opening the PR

1. Synchronize the branch with the latest `main`.
2. Resolve conflicts locally.
3. Run formatting, linting, or coding-standard checks.
4. Run the complete unit-test suite and confirm existing tests pass.
5. Run applicable integration and E2E tests.
6. Confirm the branch contains only work for the intended task.
7. Confirm CI and security checks are expected to pass.

Merge `main` into the branch when that is the repository convention:

```bash
git switch main
git pull origin main
git switch feature/JIRA-123-short-description
git merge main
```

If the team explicitly prefers rebase for branch preparation, follow that
convention consistently. The PR still merges to `main` through Squash and
Merge. Never rewrite a shared branch without explicit authorization.

### Required PR information

Every PR must explain:

- **Why:** the problem solved or capability added.
- **How:** a high-level description of the implementation.
- **Validation:** linting, tests, and manual checks performed.
- **Traceability:** exactly one ticket or requirement and the final
  `git diff --stat` required by the constitution.

Include issue links, screenshots, documentation, preview URLs, and ADRs when
applicable. Confirm who should review the change.

Recommended description:

```markdown
## Why

- Briefly explain the problem or feature.

## How

- Summarize the implementation approach.

## Validation

- Lint:
- Tests:
- Manual checks:

## References

- GitHub Issue:
- Jira:
- Preview:
- Documentation:
- ADR:
- Screenshots:

## Diff stat

<git diff --stat output>
```

### Review feedback

Apply requested changes on the same branch and push additional commits so the
existing PR updates automatically. Do not close and recreate the PR merely to
address review feedback.

## Merging an approved PR

Before merging:

1. Check whether the branch is stale.
2. Update it from the latest `main` when necessary.
3. Resolve conflicts locally.
4. Verify all required CI/CD checks still pass.
5. Confirm required approval is present.

Then merge with **Squash and Merge**, confirm success, delete the remote branch,
and clean up the local branch:

```bash
git switch main
git pull origin main
git branch -d feature/JIRA-123-short-description
```

Squash and Merge keeps `main` history focused while retaining detailed review
history in the PR.

## QA after merge

QA validates the merged state of `main`, not a feature or long-lived release
branch.

1. Merge the approved PR into `main`.
2. Deploy the current `main` build to QA manually or through automation.
3. Validate the change.
4. Record pass or fail in the PR, issue, or team tracking system.
5. If QA fails, create a new `fix/` or `hotfix/` branch from the latest `main`
   and open a new PR.

Supported delivery models include automated deployment after merge,
semi-automated deployment coordinated with QA, and release-manager scheduling.
In every model, the deployment source remains `main`.

When the team uses a communication channel, announce that the feature is in the
latest QA build.

## Tags and releases

- Tag every version that may need to be restored using semantic version form,
  such as `v1.4.0`.
- Never move or reuse a tag.
- For shipped builds, create a GitHub Release from the tag and attach the built
  artifacts.
- To inspect or rebuild an old version, create a temporary branch from its tag.
- Create a long-lived `support/*` branch only when multiple versions genuinely
  require parallel maintenance and the repository owner approves it.

## Cleanup and exceptions

- Delete merged branches after verifying the merge.
- Delete abandoned remote branches when their work is no longer needed.
- Preserve a branch only for a documented, specific reason.
- Normal work must not use integration, release, hardening, or other long-lived
  branches.
- Any exception to the single-long-lived-branch strategy requires explicit
  repository-owner approval and a recorded rationale.
