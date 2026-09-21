# AGENTS.md

This file is the authoritative agent guide for this repository. Prefer it over `CLAUDE.md` and any generic agent defaults when they conflict.

## Project Description  v1.2.3


## Maintenance Rule

- Keep this file short and project-specific, roughly 50 to 100 lines.
- Do not pad it with generic coding advice.
- Regularly update `Project Description`, `Current Focus`, `Recent Changes`, and `Commands` so the file reflects the repo as it exists now.

## Commits

- This project explicitly authorizes Claude Code, Gemini, Codex, and similar agents to commit after each meaningful unit of work without waiting for an explicit user request.
- Agents should also push those commits regularly when the change is in a safe, shareable state.

## Working Rules

- Before making non-trivial code changes, confirm product requirements, technical requirements, engineering principles, and hard constraints with the user when they are unclear.
- Make the smallest coherent change that satisfies the request and fits the existing extension architecture.
- Do not revert user changes you did not make.
- Warn immediately if you detect a secret, token, password, or credential in the repo.
- Never commit secrets or `config/.env`; use `config/.env.example` as the safe reference.

## Commands

- Install dependencies: `npm install`
- Lint source and tests: `npm run lint`
- Compile extension: `npm run compile`
- Run tests: `npm test`
- Sync contributed view name/version metadata: `npm run sync-view-name`
- Bump extension version without git tag: `npm run bump-version [major|minor|patch]`
- Create release package and GitHub release: `npm run create-release`
- Direct VSIX packaging path used by release flow: `vsce package`

## Operational Scripts

- Build deployable container artifacts: `./scripts/build-artifacts.sh <tag>`
- Create or update infrastructure: `./scripts/create-infra.sh`
- Switch active environment: `./scripts/switch-env.sh`
- Deploy to AWS App Runner: `./scripts/deploy-aws-apprunner.sh [tag]`
- Deploy to GCP Cloud Run: `./scripts/deploy-gcp-cloudrun.sh [tag]`
- Check cloud deployment status: `./scripts/check-aws-deployment.sh` and `./scripts/check-gcp-deployment.sh`
- Build and tag versioned artifacts: `./scripts/build-version.sh`

## Validation

- Minimum validation for extension changes: `npm run lint && npm test`.
- For release changes, also verify `vsce package` or `npm run create-release` as appropriate.
- For deployment script changes, validate the relevant script arguments and required cloud configuration before pushing.
