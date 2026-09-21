# task-runner

VS Code extension that lists TaskRunner agents and workflows from the current project root.

## Usage

- Open the Antigravity view in the activity bar.
- Use the `.antigravity` folder tree at the top of the view to browse files.
- Use the "Agentic Platform" selector at the top of the view (or the view title button) to choose Antigravity Agent, OpenClaude, Codex, or Ollama.
- Click an agent to run it with the selected platform (use the context menu to open `AGENT.md`).
- Click a workflow to run its matching script (when present) or open its `.md` file.

## Settings

- `antigravity.terminalName`: Terminal name used when running workflow scripts.
- `antigravity.agentTerminalName`: Terminal name used when running agents.
- `antigravity.agenticPlatform`: Agentic platform used when running agents (`antigravity`, `openclaude`, `codex`, or `ollama`).
- `antigravity.antigravityPath`: Path to the Antigravity executable for running agents.
- `antigravity.antigravityArgs`: Arguments template for Antigravity (supports `{agent}` and `{agentFile}`; defaults to opening `{agentFile}`).
- `antigravity.openClaudePath`: Path to the OpenClaude executable for running agents.
- `antigravity.codexPath`: Path to the OpenAI Codex executable for running agents.
- `antigravity.codexArgs`: Arguments template for Codex (supports `{agent}` and `{agentFile}`).
- `antigravity.ollamaPath`: Path to the Ollama executable for running agents.
- `antigravity.ollamaArgs`: Arguments template for Ollama (supports `{agent}` and `{agentFile}`).

## License

task-runner is offered under the **Personal Use Source License 1.0** contained
in the [`LICENSE`](LICENSE) file.

Copyright © 2026 Diego Fernandez Brihuega.

### What this means

Subject to the complete license terms:

* A natural person may use and modify task-runner for private personal use,
  solely on their own behalf.
* Any use by, for, at the request of, or for the benefit of an employer,
  company, nonprofit, educational institution, government body, or other
  organization requires a separate paid commercial license.
* Organizational evaluation, proof-of-concept work, development, testing,
  quality assurance, continuous integration, staging, training, internal
  operations, and production use all require a paid commercial license.
* Redistribution, publication, sublicensing, hosting for third parties, and
  providing task-runner as a service are not permitted by the personal-use
  license.

The `LICENSE` file controls if this summary conflicts with its terms.

### Commercial Licensing

To obtain a paid commercial license for organizational or other use not
permitted by the personal-use license, please contact:

**Diego Fernandez Brihuega**

for information about obtaining a commercial license.

### Third-Party Software

task-runner may include or depend upon third-party software that is distributed
under separate licenses. Those components remain subject to their respective
licenses.

Nothing in the Personal Use Source License changes the license terms applicable
to third-party components.
