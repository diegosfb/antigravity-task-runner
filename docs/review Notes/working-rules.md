# Working Rules Review Notes

These notes review repository operating rules for consistency with the current
ADLC workflow. Canonical policy remains `constitution.md`, `AGENTS.md`,
`CODEX.md`, `ADLC_workflow_settings.json`, and the agent contracts under
`.agents/agents/`.

## Status

Sound with corrections. The previous note listed useful guards, but it assumed
generic build/release behavior and did not distinguish Task Runner sidebar
actions from the Agent-Orchestrated SDLC.

## Current Validation Commands

Use the commands that actually exist in `package.json`:

| Purpose | Command | Notes |
|---|---|---|
| TypeScript compile | `npm run compile` | Runs `tsc -p ./`. |
| Lint | `npm run lint` | ESLint over `src/**/*.ts` and `tests/**/*.js`. |
| Tests | `npm test` | Runs compile first, then Node tests. |
| Version bump | `npm run bump-version -- patch` | Also supports `minor` and `major`. |
| Release workflow | `npm run create-release` | Repo-specific release automation. |

Do not refer to `npm run build`; this repository does not define that script.

## ADLC Consistency

- `sdlc-orchestrator` owns full workflow sequencing from Project Description to
  Live Release.
- Individual Task Runner sidebar actions are local conveniences. They do not
  prove that the full ADLC gate sequence has run.
- Development work is owned by `developer-agent`; implementation specialists
  live behind that agent.
- Architecture and solutioning are owned by `architect-agent`; niche
  architecture specialists live behind that agent.
- Testing, documentation, code review, and deployment remain explicit workflow
  gates.

## Security Guards

- Warn immediately if a secret, token, password, or credential is detected.
- Never commit `config/.env`; use `config/.env.example` only for safe examples.
- `antigravity.jiraApiToken` in `package.json` is a VS Code setting
  declaration, not an actual token value.
- Run the configured secret/security checks before commit or release when the
  active workflow requires them.

## Inconsistencies Found

- Prior wording treated extension validation as `npm run lint && npm test`; that
  is still useful, but `npm test` already runs `npm run compile`.
- Prior wording implied release automation should always be run before commit.
  That is only correct for release work, not ordinary documentation or feature
  changes.

## Proposed Improvements

- Add a lightweight docs-only validation command if Markdown checks become
  common.
- Add a central "review notes are advisory" banner to this folder if these
  notes are surfaced in the UI.
