# Extended Validation & Guards

## Validation Gates

- **Extension changes:** `npm run lint && npm test` must pass before committing.
- **Release changes:** run `npm run create-release` — it bumps the patch version, compiles TypeScript, packages the VSIX via `vsce package`, commits, pushes, and creates a GitHub release. Verify the VSIX attaches correctly to the release.
- **Deployment script changes:** validate the script arguments and required cloud configuration locally before pushing.

## Before Making Non-Trivial Changes

Confirm with the user when any of these are unclear before starting implementation:

- Product requirements
- Technical requirements
- Engineering principles
- Hard constraints

Do not start implementation until those points are clear enough to avoid preventable rework.

## Security Guards

- Warn immediately if you detect a secret, token, password, or credential anywhere in the repo.
- Never commit `config/.env`; `config/.env.example` is the safe reference.
- The `antigravity.jiraApiToken` setting in `package.json` is a VS Code setting declaration (no actual secret value) — this is safe to commit.
