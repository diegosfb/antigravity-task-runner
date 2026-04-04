# Antigravity Launcher

VS Code extension that lists Antigravity agents and workflows from the configured `.agent/antigravity` directory.

## Usage

- Open the Antigravity view in the activity bar.
- Use the `.antigravity` folder tree at the top of the view to browse files.
- Use the "Agentic Platform" selector at the top of the view (or the view title button) to choose Antigravity Agent, OpenClaude, Codex, or Ollama.
- Click an agent to run it with the selected platform (use the context menu to open `AGENT.md`).
- Click a workflow to run its matching script (when present) or open its `.md` file.

## Settings

- `antigravity.rootPath`: Path to the `.agent/antigravity` folder.
- `antigravity.terminalName`: Terminal name used when running workflow scripts.
- `antigravity.agentTerminalName`: Terminal name used when running agents.
- `antigravity.agenticPlatform`: Agentic platform used when running agents (`antigravity`, `openclaude`, `codex`, or `ollama`).
- `antigravity.antigravityPath`: Path to the Antigravity executable for running agents.
- `antigravity.antigravityArgs`: Arguments template for Antigravity (supports `{agent}` and `{agentFile}`).
- `antigravity.openClaudePath`: Path to the OpenClaude executable for running agents.
- `antigravity.codexPath`: Path to the OpenAI Codex executable for running agents.
- `antigravity.codexArgs`: Arguments template for Codex (supports `{agent}` and `{agentFile}`).
- `antigravity.ollamaPath`: Path to the Ollama executable for running agents.
- `antigravity.ollamaArgs`: Arguments template for Ollama (supports `{agent}` and `{agentFile}`).
