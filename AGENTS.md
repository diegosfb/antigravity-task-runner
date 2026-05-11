# AGENTS.md

A VS Code extension that lets teams browse and run Antigravity AI agents and workflows directly from the sidebar.

## Current Focus

- Improving agent prompt autonomy and non-interactive execution.
- Standardizing AGENTS.md across projects using progressive disclosure.

## Recent Changes

- Created default GitHub environments on repo init (`setupWorkspace`).
- Loaded Update AGENTS.md prompt from file instead of inline string.
- Added Audit Secrets & Variables to Setup Workspace right-click menu.

## Commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Compile | `npm run compile` |
| Lint | `npm run lint` |
| Test | `npm test` |
| Sync view name/version | `npm run sync-view-name` |
| Bump version | `npm run bump-version [major\|minor\|patch]` |
| Release | `npm run create-release` |

Minimum validation before any PR: `npm run lint && npm test`.
Release (`npm run create-release`) bumps the patch version, compiles, packages the VSIX, commits, pushes, and creates a GitHub release automatically.

## Commit Authorization

This project explicitly authorizes Claude Code, Gemini, Codex, and similar agents to commit after each meaningful unit of work without waiting for an explicit user request. Push when the change is in a safe, shareable state.

## Working Rules

- Make the smallest coherent change that satisfies the request and fits the existing extension architecture.
- Do not revert user changes you did not make.
- Never commit `config/.env`; use `config/.env.example` as the safe reference.
- Warn immediately if you detect a secret, token, password, or credential in the repo.

## Details

- [Deployment & Infrastructure Scripts](docs/agents/deployment.md)
- [Extended Validation & Guards](docs/agents/working-rules.md)
