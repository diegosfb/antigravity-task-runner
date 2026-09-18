# Configuration

Copy `storypoints-council.local.conf.example` to `storypoints-council.local.conf`. Keep machine-specific configuration out of source control.

Required keys:
- `STORYPOINT_COUNCIL_PROVIDERS`: comma-separated subset of `codex`, `claude`, `gemini`, and `ollama`. At least two providers are required. Only listed providers run.
- `OUTPUT_FOLDER`: directory where `estimation-output.csv` is created or appended. Relative paths resolve from the config file's directory.

Optional keys:
- `STORYPOINT_CHAIRMAN_PROVIDER`: chairman provider; defaults to `codex` and must be listed in `STORYPOINT_COUNCIL_PROVIDERS`.
- `CODEX_COUNCIL_CMD`, `CLAUDE_COUNCIL_CMD`, `GEMINI_COUNCIL_CMD`, `OLLAMA_COUNCIL_CMD`: shell command templates. Every configured template must contain `{prompt_file}`. The Ollama model is selected in `OLLAMA_COUNCIL_CMD`.
- `COUNCIL_DEBATE_OUTPUT`: defaults to `Off`. `On` writes the per-run council JSON artifact.
- `ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION`: defaults to `Off`. `On` enables the local clarification preflight.

Example:
```text
STORYPOINT_COUNCIL_PROVIDERS='codex','claude','gemini','ollama'
STORYPOINT_CHAIRMAN_PROVIDER='codex'
CODEX_COUNCIL_CMD='codex exec - < {prompt_file}'
CLAUDE_COUNCIL_CMD='claude -p "$(cat {prompt_file})"'
GEMINI_COUNCIL_CMD='gemini -p "$(cat {prompt_file})"'
OLLAMA_COUNCIL_CMD='ollama run llama3.2 < {prompt_file}'
OUTPUT_FOLDER='./output'
COUNCIL_DEBATE_OUTPUT=Off
ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION=Off
```

Command templates are trusted local shell commands. Do not put secrets in them. The orchestrator sends the prompt only to these locally invoked commands; a CLI may independently use a remote service according to that CLI's own configuration.
