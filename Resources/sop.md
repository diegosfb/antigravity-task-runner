# diegosfb SDLC SOP  v1.2.3

> This SOP defines the standard workflow for creating branches, opening pull
> requests, merging approved work, validating changes in QA, and releasing work
> to production using GitHub Flow.

---

## Version Numbering Strategy

- Current version: `v1.3.0`

**Versioning model:**

- Increase the major version for breaking workflow changes or policy reversals. Major changes to features, functionality or user experience.
- Increase the minor version for features or functionality addition tht does not fundamentally change the user experience or workflow. Additions to tooling, integrations, or new endpoints.
- Increase the patch version for small improvements, bug fixes, and incremental changes that are not final.

---

## GitHub Flow Strategy

This team uses GitHub Flow with `main` as the single long-lived branch.
That means reinforcing the need for short-lived branches.

- Use feature flags to hide incomplete features in main to support true
  Trunk-Based Development.
  Name flags descriptively: feature_<jira_ticket>_<short_description>
  Every flag must have a designated owner (the PR author by default)
  Schedule flag removal within one sprint of the feature reaching 100% rollout
  Do not ship permanent flags — convert them to config or remove them
- Base branch `main` is always the source of truth
- `main` should stay deployable and production-ready
- All work starts from the latest `main`
- All work is reviewed through a pull request before merge
- Approved work is merged back into `main` using `Squash and Merge` merge
  strategy
- QA and release activities happen from the merged state of `main`
- Do not create long-lived integration, release, or hardening branches unless
  the repository owner explicitly approves an exception. `main` stays the only
  long-lived branch.
- Any version we may want to return to we create a tag with the format v1.4.0.
  Tags are never moved or reused.
- For shipped builds, create a GitHub Release from the tag and attach the built
  artifacts with the format v1.4.0
- If we need to inspect or rebuild an old version, we branch from the tag
  temporarily.
- We only create a long-lived support/* branch if we truly need to maintain
  multiple versions in parallel.
- Abandoned remote branches: delete them when the work is clearly no longer
  needed; keep them only when there is a specific reason to preserve them

---

## Core Rules for Pull Requests

- One branch per issue or task
- One pull request per focused piece of work
- Do not mix unrelated fixes or improvements into the same PR
- Use clear, trackable branch names
- Run linting and relevant tests before opening a PR
- Keep all review feedback and follow-up commits in the same PR
- Clean up merged or abandoned branches
- Automate reviewer assignment using CODEOWNERS for critical code paths.
- Do not let PRs remain open for more than 5 business days without exception
  approval.
- Keep `main` stable enough that it can move through QA and release without
  extra stabilization branches

---

## 1. Create a Feature Branch

Before creating a branch, confirm whether the work is linked to a Jira ticket.

### If There Is a JIRA ticket

Create the branch from the latest `main` using one of the approved formats:

```bash
feature/JIRA-123-short-description
fix/JIRA-123-short-description
hotfix/JIRA-123-short-description

#Additional formats that can be used
chore/JIRA-123-short-description   # dependency updates, CI config, tooling
docs/JIRA-123-short-description    # documentation-only changes
refactor/JIRA-123-short-description # code restructure without behavior change
```

### If There Is No JIRA ticket

Ask the requester to define the work type and provide a short descriptive name.
But ideally it should always be a JIRA ticket to track it.

**Allowed formats:**

```bash
feature/short-description
fix/short-description
hotfix/short-description
```

### Feature Branch Rules

- Keep the name short, specific, and readable
- Use lowercase kebab-case for the descriptive portion
- Do not use generic names such as `fix`, `test`, or `my-work`
- Use `hotfix/` only for urgent production-impacting corrections, `fix/` for
  bug fixes and `feature/` for new features

### Workflow

1. Update the local `main` to sync with the remote repository
2. Create and switch to the new branch for the development work for that body
   of work.
3. Push the branch to GitHub and set the upstream.

```bash
git checkout main
git pull origin main
git checkout -b feature/123-short-description
git push -u origin feature/123-short-description
```

> The `-u` flag sets the upstream branch so future pushes can use `git push`.

---

## 2. Create a Pull Request

Only create a pull request when the work is ready for review.

### Process Rules

- Keep the PR small and focused on a single problem
A pull request should target fewer than 400 lines of meaningful diff (excluding generated files, lock files, and migrations). If a change naturally exceeds this, consider splitting it into a foundational PR and a follow-on PR. Large PRs are not blocked by policy, but reviewers are not obligated to approve them within the standard 5-day window.
- Do not include unrelated cleanup or opportunistic improvements
- If you notice unrelated work, log it in GitHub Issues or the team tracking
  tool for later prioritization
- Stay in local development until the branch is review-ready
- If preview environments exist, use them to help reviewers validate the change

### Before Opening the PR

1. Sync the branch with the latest `main`.
2. Resolve conflicts locally.
3. Run the linter or coding standards checks.
4. Run ALL Unit Tests and confirm existing tests still pass. Confirm the CI
   pipeline passes Static Application Security Testing (SAST) on the PR branch.
   CI must be green before any PR can be merged. A failing or skipped pipeline is not an acceptable state for merge. If CI is broken for reasons unrelated to the PR, the pipeline must be fixed in a separate PR first
5. Integration/E2E tests if the team runs them, should be part of the merge gate definition
6. Confirm the branch only contains changes related to the intended issue.

```bash
git checkout main
git pull origin main
git checkout your-branch-name
git merge main
```

> If your team explicitly prefers `rebase` instead of `merge` while preparing a
> branch for review, follow the team convention consistently. The PR must still
> merge to `main` through GitHub using `Squash and Merge`.

### Collect the PR Details

**Required:**

- The `Why`: what problem this solves or what feature it adds
- The `How`: a high-level summary of the implementation approach

**Optional:**

- Jira or GitHub Issue link
- Screenshots & Documentation
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
- Architectural Decision Record (ADR):
- Screenshots:
```

### Review Feedback Rule

If reviewers request changes, make those updates on the same feature branch.
Push additional commits to that branch so the PR updates automatically.

Do not close the PR and create a new one for review fixes.

---

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

> `Squash and Merge` keeps `main` history cleaner by combining fixup commits,
> review commits, and work-in-progress commits into one final commit while
> still keeping every change traceable through the pull request.

### GitHub Flow Release Rule

After merge, the source of truth is the new commit on `main`.

- Do not continue QA or release from the feature branch
- Do not create a separate release branch for normal work
- If QA finds an issue, fix it in a new branch from the latest `main` and open
  a new PR

---

## 4. QA Validation After Merge

QA validation happens from the merged state of `main`, not from a long-lived
release branch.

### Standard QA Sequence

1. Merge the approved PR into `main`.
2. Deploy the current `main` build to QA, or allow automation to deploy it.
3. Validate the change in QA.
4. Record pass or fail status in the PR, issue, or team tracking tool.
5. If QA fails, open a new `fix/` or `hotfix/` branch from `main`.

### Common QA CI/CD Models

- **Automated CI/CD:** Merging to `main` automatically deploys to QA.
- **Semi-automated deployment:** Merging to `main` does not deploy immediately.
  Coordinate with QA, then trigger deployment through the team deployment tool
  or command.
- **Release manager workflow:** A release manager or QA lead batches already
  merged `main` changes into scheduled QA deployments. The deployment source is
  still `main`, not a separate release branch.

### QA Communication

When the build reaches QA, post a short status update if the team uses Slack or
another messaging tool.

**Example:**

```text
[Feature Name] is merged to main and included in the latest QA build.
```

---

## 5. Release to Production

Production releases also come from `main` under GitHub Flow.

### Release Rules

- Release only code that has already been merged into `main`
- Do not create a normal release branch just to stage approved work
- Use tags, deployment records, or release notes to mark what was released
- If a production issue is discovered, fix forward from `main` unless the team
  explicitly decides to revert first
  In a production incident, create a hotfix/revert-<commit-hash> branch, apply the revert there, and open an expedited PR. A single reviewer approval is sufficient under incident conditions. Direct pushes to main are not permitted even in emergencies.

### Standard Release Sequence

1. Confirm the relevant change passed QA or the required validation gate.
2. Confirm `main` is green in CI/CD.
3. Trigger or approve the production deployment from main, ensuring automated
   monitoring and a validated rollback plan are in place.
4. Record the deployed version, tag, or release note according to team
   convention.
5. Communicate release status to stakeholders if required.

### Exception for Long-Lived Release Branches

Long-lived release branches can still make sense for products that must support
multiple shipped versions in parallel, such as desktop apps, mobile apps, or
installed enterprise software.

> Use this exception only when the team needs to maintain older released
> versions because users may report bugs against versions that are no longer
> the current `main` release.

**In that model:**

- `main` remains the default branch for ongoing development
- Release branches are created only from shipped production versions
- Each release branch represents a maintained version line such as
  `release/1.4`
- Bug fixes for an older supported version are made against that release branch
- Any fix that should also apply to the current product must be forward-ported
  back to `main` through a normal PR
- Do not create long-lived release branches for routine web deployments that
  always ship the latest version

**If this exception is used, document:**

- Which versions are still supported
- Who owns maintenance decisions
- How fixes are promoted between the release branch and `main`
- When an older release branch should be retired

---

## 6. Revert a Broken Merge

If the merged change breaks the build or introduces a critical bug, restore
`main` as quickly as possible.

> Because this SOP uses `Squash and Merge`, most reversions should revert the
> squash commit on `main`.

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

---

## 7. Close an Abandoned Pull Request

If the team decides not to continue with a PR:

1. Leave a comment explaining why the PR is being closed.
2. Close the PR on GitHub.
3. Delete the remote branch if the work is clearly abandoned.
4. Keep the remote branch only if the team expects to reference or revive the
   work later.
5. Delete the branch locally to keep the machine clean.

**Example comment:**

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

> Use capital `-D` only for abandoned, unmerged branches. Git blocks normal
> deletion of unmerged branches as a safety measure.

---

## JIRA Flow Strategy

- Primary tracking system: JIRA (we could use GitHub Issues instead of JIRA for
  very small simple projects but JIRA is generally preferred)

**Typical flow:**

`Backlog → To Do → In Progress → In Review → Done`

- **Backlog:** Not yet prioritized. The definition is still under development
  or it is not a prioritized item.
- **To Do:** Fully defined, ready to be worked on (Also sometimes called
  Ready)
- **In Progress:** It is assigned to a team member and it is actively being
  developed
- **In Review:** PR open, under review.
  Then once the PR is approved the QA reviews it if you do manual testing of
  the item.
  (When manual test of the item is conducted then it could be beneficial to
  have another state between In Review and Done called To Test)
- **Done:** Meets Definition of Done ready to deploy to QA Env and then PROD
  Env

**Recommended Issue Types:**

- **Epic:** Big feature
- **Story or Feature:** User-facing work
- **Task:** Technical or internal work
- **Bug:** Defect
- **Hotfix:** Defect that is affecting PROD and it needs to be fixed ASAP
  (optional)

**Jira Issues Dependencies:**


Blocks (Outgoing): Task A blocks Task B. Task A must be done first.

Is Blocked By (Incoming): Task B is blocked by Task A. Task B is waiting on A to finish


**Tips:**

- Restrict skipping steps
- Define required fields
- **Summary:** Mandatory needed at creation
- **Description:** Mandatory needed at creation
- **Assignee:** Mandatory to move from To Do to In Progress.
  Set JIRA to Auto-assign issues when moved to “In Progress”
- **Priority:** Recommended added manually by PM/Scrum Master to guide on what
  issues are more prioritary than others
- **Story Points:** Recommended added manually during planning/estimation
  sessions
  for guidance (it could use story points or t-shirt sizing)
- Set require fields on key transitions (ie. In Progress needs someone
  assigned)
- Auto-move to In Review when PR is opened
- Auto-move to Done when PR is merged (if not using the manual Tesing state)
- Alert when issue is blocked > X days

## Board Setup

### Scrum board (recommended for most teams)

- Backlog view enabled
- Sprint length: 2 weeks

### Kanban

- No sprints; just consume tasks from list

---

## Environment Management

| Area        | DEV                                      | QA                                        | PROD                            |
| ----------- | ---------------------------------------- | ----------------------------------------- | ------------------------------- |
| Purpose     | Build, unit tests, developer integration | Test, UAT, regression, release validation | Live users/business             |
| Data        | Synthetic or masked only                 | Masked production-like data               | Real production data            |
| Access      | Dev team allowed                         | QA + DevOps controlled                    | Very limited, approved/JIT only |
| Infra       | Smaller, cheaper                         | Prod-like but scaled down                 | HA, DR, hardened                |
| Integration | Sandboxes/mocks                          | Partner test endpoints                    | Real partner endpoints          |
| Deployment  | Frequent/automatic                       | Controlled via release candidate          | Approved release only           |
| Deployment Owner  | Any developer (automated or manual)  | QA lead or DevOps, triggered by merge to main  | Release manager or designated approver only          |
---

Principles: 

- Create separate cloud projects/accounts per environment dev, qa and prod
- Terraform modules should be reusable across DEV, QA, PROD. Same code, different variables.
- Promote artifacts, not code. Build immutable image/package and promote those same artifact from DEV → QA → PROD. Do not rebuild separately
- Separate configuration from code. Use environment-specific config stores.

### Control integration services

DEV: uses mocks, stubs, or sandbox APIs.
QA: uses test partner environments with realistic contracts.
PROD: uses real integrations only.

Keep separate API keys, service accounts, topics, queues, and callback URLs per environment.

### Manage data carefully

DEV: synthetic data.
QA: masked/anonymized production-like data.
PROD: real data only, encrypted and access-controlled.

Never copy raw production data to DEV.
Refresh QA data through an approved masking pipeline.

---

## Security Guidelines

- No hardcoded credentials, passwords or tokens should be checked into the repository
- Secret management should be done in a centralized secret vault (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- For local storage of keys use OS keychain / credential manager
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: Secret Service / GNOME Keyring / KWallet
- Your app reads secrets from the OS vault at runtime.
- As an alternative you could store them on a local .env file; but ENSURE that those .env files are never commited to the repo (add them to the gitignore file)
The problem with .env is that you have to generate one where the solution is deployed or used!
Usually you do NOT want to upload .env files directly.
Instead deployment platforms store secrets securely.
vercel env add
docker run -e API_KEY=abc
Using cloud Secrets Manager
- To add an example of what credentials are expected on .env file use .env.example with dummy data (this one is safe to commit)
- No hardcoded credentials, passwords or tokens should be included in the release
- Passwords or sensitivy information should use strong hashing like (bcrypt, Argon2, PBKDF2, etc)
- Authorization: Use RBAC or ABAC as preferred methods. Validate authorization server-side
- Check Session Security: Secure cookies, HttpOnly cookies, Session expiration and CSRF protection
- Define Rotation Frequency Policy
- API Keys: 90 days
- DB Passwords: 90 days
- Certificates: 180 days
- Admin Credentials: 60 days

### Front-End vs Back-End

Safe for frontend:
- public API URLs
- feature flags
- analytics IDs
- public Stripe publishable key

Never expose in frontend:
- DB credentials
- OpenAI secret keys
- AWS secrets
- JWT signing keys
- internal tokens

### Incident Procedure

**If secrets are exposed:**

- Revoke immediately
- Rotate affected credentials
- Review logs
- Open incident report
- Conduct root cause analysis

### Dependency Scanning
- Use trusted repositories only
- Enable dependency scanning
- Maintain Software Bill of Materials (SBOM)

**Recommended Tools:**
- Dependabot
- Snyk
- Trivy
- OWASP Dependency Check

### Container Security

- Minimal base images
- Non-root containers
- Image signing
- Runtime scanning

---

## Infrastructure Security

- Use Infrastructure as Code (IaC)
- Enable logging everywhere
- Encrypt storage volumes
- Restrict public exposure

---

## Logging & Troubleshooting Guidelines

- Determine logging and monitoring needs
- Generate postman test scripts for endpoints and APIs
- Always log this event:Authentication events, Authorization failures, Administrative actions, Security exceptions, API access, Data access events
- NEVER LOG Passwords, Secrets, Tokens,  payment information, Sensitive PII

### Monitoring

Use centralized monitoring for alerting on suspicious activity and anomaly detection

**Recommended tools:**
- Splunk
- ELK Stack
- Datadog
- Sentinel

---

## Backup & Recovery

- Automated daily backups (Encrypted backups)
- Offsite backup storage recommended
- Regular restore testing to RPO/RTO times
