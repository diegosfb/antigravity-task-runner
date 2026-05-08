# CI Workflows

This folder contains GitHub Actions workflows used to validate, package, and release the project.

## Why this exists
- **Consistency**: Ensure validation runs the same way for every change.
- **Security**: Catch dependency vulnerabilities and accidental secret leaks early.
- **Stability**: Prevent breaking changes from landing in `main` without validation.

## What it does
The `ci.yml` workflow runs four jobs:

1. **Lint and Test**
   - Installs dependencies, runs `npm run lint`, then runs `npm test`, which compiles the extension and executes the Node test suite.
2. **Dependency Audit**
   - Runs `npm audit --production` to flag known vulnerabilities.
3. **Secret Scan**
   - Uses TruffleHog to detect potential secrets in the repo history and the current commit.
4. **Dependency Review** (PRs only)
   - Uses GitHub’s dependency review action to detect risky dependency changes.

## Build Artifacts Workflow

`build-artifacts.yml` runs on git tags (`v*`) and builds a single Docker image, then pushes it to:
- AWS ECR
- GCP Artifact Registry

Required GitHub secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GCP_SERVICE_ACCOUNT_JSON`

## Deploy Workflow Secrets

The deploy workflow uses the same credentials as build artifacts:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GCP_SERVICE_ACCOUNT_JSON`

The deploy workflow accepts a `version_tag` input. If omitted, it deploys the latest git tag.

## CD Workflow

`cd.yml` publishes the VS Code extension to the Marketplace.

- **Automatic**: Runs on pushed tags matching `v*`.
- **Manual**: `workflow_dispatch` supports an optional `ref` input for retries or manual publishes.
- **Validation**: Installs dependencies, runs `npm run lint`, runs `npm test`, packages a `.vsix`, uploads it as a workflow artifact, and publishes it with `@vscode/vsce`.

Required GitHub secret:
- `VSCE_PAT`

## How to use it
- **Automatic**: The workflow runs on every push to `main` and every pull request targeting `main`.
- **Manual trigger**: You can also re-run a workflow from the GitHub Actions UI:
  1. Go to the repository on GitHub
  2. Click the **Actions** tab
  3. Select **CI**
  4. Click **Re-run jobs**

## Notes
- If the secret scan finds a leak, treat it as a real incident: revoke the key and rotate credentials.
- If `npm audit` fails on a false positive, document it and consider suppressing it explicitly with a policy tool.

## Production Approval Gate (GitHub Environments)

The `deploy.yml` workflow uses GitHub Environments so production deployments can require manual approval.

### How to configure the `prod` approval rule
1. Go to **GitHub → Repository → Settings → Environments**.
2. Create (or select) an environment named **`prod`**.
3. Under **Deployment protection rules**, enable **Required reviewers**.
4. Add the users or team that must approve production deployments.
5. (Optional) Add environment secrets for prod (e.g., cloud credentials).

### How it works
- The workflow uses `environment: prod` when you select `prod` in the dispatch input.
- GitHub will pause the job until an approved reviewer grants access.
