# Pull Request Workflow SOP

This SOP defines the standard workflow for creating branches, opening pull
requests, merging approved work, validating changes in QA, and releasing work
to production using GitHub Flow.

## Document Version

- Current version: `v1.2.0`
- Versioning model: semantic versioning for the SOP itself
- Increase the major version for breaking workflow changes or policy reversals
- Increase the minor version for new sections, new required steps, or expanded
  guidance
- Increase the patch version for wording fixes, clarifications, or formatting
  improvements that do not change the process

## GitHub Flow Strategy

This team uses GitHub Flow with `main` as the single long-lived branch.

That means:

- `main` is always the source of truth
- `main` should stay deployable and production-ready
- All work starts from the latest `main`
- All work is reviewed through a pull request before merge
- Approved work is merged back into `main` using `Squash and Merge`
- QA and release activities happen from the merged state of `main`
- Do not create long-lived integration, release, or hardening branches unless
  the repository owner explicitly approves an exception

## Standard Defaults

Use these defaults unless the repository owner or team lead says otherwise:

- Base branch: `main`
- Merge strategy: `Squash and Merge`
- Primary tracking system: GitHub Issues
- Secondary tracking system: Jira, when required by the team or stakeholder
- Abandoned remote branches: delete them when the work is clearly no longer
  needed; keep them only when there is a specific reason to preserve them

## Core Rules

- One branch per issue or task
- One pull request per focused piece of work
- Do not mix unrelated fixes or improvements into the same PR
- Use clear, trackable branch names
- Run linting and relevant tests before opening a PR
- Keep all review feedback and follow-up commits in the same PR
- Clean up merged or abandoned branches
- Keep `main` stable enough that it can move through QA and release without
  extra stabilization branches

## 1. Create a Feature Branch

Before creating a branch, confirm whether the work is linked to a GitHub Issue.
If the team also requires Jira, capture that reference too.

### If There Is a GitHub Issue

Create the branch from the latest `main` using one of the approved formats:

```bash
feature/123-short-description
fix/123-short-description
hotfix/123-short-description
```

If Jira is also required, include the Jira key in the branch only when the team
expects it:

```bash
feature/JIRA-123-short-description
```

### If There Is No GitHub Issue

Ask the requester to define the work type and provide a short descriptive name.

Allowed formats:

```bash
feature/short-description
fix/short-description
hotfix/short-description
```

### Branch Naming Rules

- Keep the name short, specific, and readable
- Use lowercase kebab-case for the descriptive portion
- Do not use generic names such as `fix`, `test`, or `my-work`
- Use `hotfix/` only for urgent production-impacting corrections

### Workflow

1. Update the local `main` branch.
2. Create and switch to the new branch.
3. Push the branch to GitHub and set the upstream.

```bash
git checkout main
git pull origin main
git checkout -b feature/123-short-description
git push -u origin feature/123-short-description
```

The `-u` flag sets the upstream branch so future pushes can use `git push`.

## 2. Create a Pull Request

Only create a pull request when the work is ready for review.

### Process Rules

- Keep the PR small and focused on a single problem
- Do not include unrelated cleanup or opportunistic improvements
- If you notice unrelated work, log it in GitHub Issues or the team tracking
  tool for later prioritization
- Stay in local development until the branch is review-ready
- If preview environments exist, use them to help reviewers validate the change

### Before Opening the PR

1. Sync the branch with the latest `main`.
2. Resolve conflicts locally.
3. Run the linter or coding standards checks.
4. Run relevant tests and confirm existing tests still pass.
5. Confirm the branch only contains changes related to the intended issue.

```bash
git checkout main
git pull origin main
git checkout your-branch-name
git merge main
```

If your team explicitly prefers `rebase` instead of `merge` while preparing a
branch for review, follow the team convention consistently. The PR must still
merge to `main` through GitHub using `Squash and Merge`.

### Collect the PR Details

Required:

- The `Why`: what problem this solves or what feature it adds
- The `How`: a high-level summary of the implementation approach
- Validation details: linting, tests, and manual checks

Optional:

- GitHub Issue link
- Jira link
- Screenshots
- Documentation updates
- Preview environment link

Also confirm who should be tagged or assigned as the reviewer.

### Recommended PR Description Template

```md
## Why
- Briefly explain the problem or feature

## How
- Summarize the implementation approach

## Validation
- Lint:
- Tests:
- Manual checks:

## References
- GitHub Issue:
- Jira:
- Preview:
- Docs:
- Screenshots:
```

### Review Feedback Rule

If reviewers request changes, make those updates on the same feature branch.
Push additional commits to that branch so the PR updates automatically.

Do not close the PR and create a new one for review fixes.

## 3. Merge an Approved Pull Request

Once the reviewer approves the PR:

1. Check whether the branch is stale.
2. If the PR has been open for several days, update it with the latest `main`.
3. Resolve any conflicts locally.
4. Verify all required CI/CD checks still pass after the final update.
5. Merge using `Squash and Merge`.
6. Delete the remote branch after confirming the merge succeeded.
7. Clean up the local branch.

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

### Why `Squash and Merge`

`Squash and Merge` keeps `main` history cleaner by combining fixup commits,
review commits, and work-in-progress commits into one final commit while still
keeping every change traceable through the pull request.

### GitHub Flow Release Rule

After merge, the source of truth is the new commit on `main`.

- Do not continue QA or release from the feature branch
- Do not create a separate release branch for normal work
- If QA finds an issue, fix it in a new branch from the latest `main` and open a
  new PR

## 4. QA Validation After Merge

QA validation happens from the merged state of `main`, not from a long-lived
release branch.

### Standard QA Sequence

1. Merge the approved PR into `main`.
2. Deploy the current `main` build to QA, or allow automation to deploy it.
3. Validate the change in QA.
4. Record pass or fail status in the PR, issue, or team tracking tool.
5. If QA fails, open a new `fix/` or `hotfix/` branch from `main`.

### Common QA Models

Automated CI/CD:
Merging to `main` automatically deploys to QA.

Semi-automated deployment:
Merging to `main` does not deploy immediately. Coordinate with QA, then trigger
deployment through the team deployment tool or command.

Release manager workflow:
A release manager or QA lead batches already merged `main` changes into
scheduled QA deployments. The deployment source is still `main`, not a separate
release branch.

### QA Communication

When the build reaches QA, post a short status update if the team uses Slack or
another messaging tool.

Example:

```text
[Feature Name] is merged to main and included in the latest QA build.
```

## 5. Release to Production

Production releases also come from `main` under GitHub Flow.

### Release Rules

- Release only code that has already been merged into `main`
- Do not create a normal release branch just to stage approved work
- Use tags, deployment records, or release notes to mark what was released
- If a production issue is discovered, fix forward from `main` unless the team
  explicitly decides to revert first

### Standard Release Sequence

1. Confirm the relevant change passed QA or the required validation gate.
2. Confirm `main` is green in CI/CD.
3. Trigger or approve the production deployment from `main`.
4. Record the deployed version, tag, or release note according to team
   convention.
5. Communicate release status to stakeholders if required.

### Versioning Guidance

GitHub Flow does not require release branches for versioning.

Use one of these lightweight approaches instead:

- Git tags on `main` such as `v1.4.0`
- GitHub Releases tied to the merged commit on `main`
- Deployment records in the delivery platform

The exact version number should be created from the production-ready commit on
`main`.

### Exception for Long-Lived Release Branches

Long-lived release branches can still make sense for products that must support
multiple shipped versions in parallel, such as desktop apps, mobile apps, or
installed enterprise software.

Use this exception only when the team needs to maintain older released versions
because users may report bugs against versions that are no longer the current
`main` release.

In that model:

- `main` remains the default branch for ongoing development
- Release branches are created only from shipped production versions
- Each release branch represents a maintained version line such as
  `release/1.4`
- Bug fixes for an older supported version are made against that release branch
- Any fix that should also apply to the current product must be forward-ported
  back to `main` through a normal PR
- Do not create long-lived release branches for routine web deployments that
  always ship the latest version

If this exception is used, document:

- Which versions are still supported
- Who owns maintenance decisions
- How fixes are promoted between the release branch and `main`
- When an older release branch should be retired

## 6. Revert a Broken Merge

If the merged change breaks the build or introduces a critical bug, restore
`main` as quickly as possible.

Because this SOP uses `Squash and Merge`, most reversions should revert the
squash commit on `main`.

### Standard Revert Workflow

1. Identify the squash commit on `main`.
2. Revert that commit.
3. Push the revert.
4. Re-run QA and production release steps as needed.

```bash
git log --oneline
git revert <COMMIT_HASH>
git push origin main
```

If your repository contains an older true merge commit from before this SOP,
revert it with the first parent:

```bash
git log --oneline
git revert -m 1 <MERGE_COMMIT_HASH>
git push origin main
```

## 7. Close an Abandoned Pull Request

If the team decides not to continue with a PR:

1. Leave a comment explaining why the PR is being closed.
2. Close the PR on GitHub.
3. Delete the remote branch if the work is clearly abandoned.
4. Keep the remote branch only if the team expects to reference or revive the
   work later.
5. Delete the branch locally to keep the machine clean.

Example comment:

```text
Closing this PR because we are dropping this approach in favor of a different implementation.
```

### Local Cleanup

```bash
git checkout main
git branch -D feature/abandoned-task-name
```

### Optional Remote Cleanup

```bash
git push origin --delete feature/abandoned-task-name
```

Use capital `-D` only for abandoned, unmerged branches. Git blocks normal
deletion of unmerged branches as a safety measure.

## Quick Checklist

Before branching:

- Confirm the GitHub Issue or the requested work scope
- Capture a Jira reference only if the team also requires it
- Use the correct branch naming format
- Branch from the latest `main`

Before opening the PR:

- Sync with `main`
- Run linting
- Run relevant tests
- Confirm the branch only contains intended changes
- Prepare the `Why` and `How`
- Confirm the reviewer

Before merging:

- Confirm approval is complete
- Update stale branches if needed
- Ensure CI/CD checks are passing
- Use `Squash and Merge`
- Delete the remote branch after a successful merge

Before QA:

- Confirm the change is merged to `main`
- Confirm the QA deployment uses `main`
- Record QA results in the team tracking system

Before production release:

- Confirm QA passed or the required release gate was met
- Confirm `main` is green
- Release from `main`
- Record the version or tag

If abandoning the work:

- Comment on the PR
- Close the PR
- Delete the remote branch by default unless there is a reason to preserve it
- Delete the local branch
