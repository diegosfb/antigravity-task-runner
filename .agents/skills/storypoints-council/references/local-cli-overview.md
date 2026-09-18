# Story Points Council

## What it does

The Story Points Council estimates the relative complexity of a software task by comparing it with previously estimated work. It uses a stable historical project baseline so that estimates remain consistent over time and are not reduced because a developer or AI tool could implement the task faster.

The council runs multiple locally installed LLM command-line tools—Codex, Claude, Gemini, and Ollama—and returns one Fibonacci estimate: `1`, `2`, `3`, `5`, `8`, `13`, or `21`. The result also includes confidence, the closest historical analogs, and a concise rationale.

Successful estimates are appended to `estimation-output.csv` in the configured output folder. An optional JSON artifact can preserve the council's concise estimates and reviews for auditing.

## Local CLIs and Ollama

The council invokes every provider through a command-line tool installed on the machine where the script runs. This keeps orchestration local, but the providers do not all execute models in the same place:

- **Codex CLI**, **Claude CLI**, and **Gemini CLI** run as local commands but typically send prompts to their providers' hosted model services. They require their normal authentication and usually require network access.
- **Ollama** runs its server and downloaded model locally. When configured this way, its prompts and model inference stay on the local machine and do not require a hosted LLM service.

The council can combine hosted models accessed through local CLIs with a model served by Ollama. At least two configured providers must be available so that the council has multiple independent estimates. Each provider receives the task, relevant historical estimates, and the shared methodology, so consider the data-handling requirements of every configured hosted provider before running the council.

## How it works

1. The script loads the new task, the historical estimation corpus, and the shared estimation methodology.
2. Each configured provider independently estimates the task from the same evidence.
3. The proposals are anonymized and sent back to the providers for blind peer review.
4. The configured chairman considers the independent estimates and reviews, then selects the final estimate. It does not mechanically average values or rely only on majority vote.
5. The final estimate and its supporting metadata are written to the configured report.

At least two providers must be configured and available. Provider commands, the chairman, output location, clarification behavior, and optional council artifacts are controlled by `storypoints-council.local.conf`. See [local-cli-config.md](local-cli-config.md) for configuration details and [estimation-methodology.md](estimation-methodology.md) for the sizing rules.

## How to use it

### Use it as a regular LLM skill

In a skill-aware LLM environment, ask the LLM to estimate a task with the Story Points Council and provide the task plus the historical-estimates location. The LLM can select the skill automatically from the request, or you can invoke it explicitly as `$storypoints-council`.

For example:

```text
Use $storypoints-council to estimate ./tasks/NEW-123.md using the historical estimates in ./historical.
```

The LLM will handle the council workflow, including any configured clarification preflight, and return the final estimate in the skill's standard four-field format.

Before using the skill, ensure each selected CLI is installed and available on `PATH`. Authenticate Codex, Claude, and Gemini according to their normal CLI setup. If Ollama is selected, ensure its local service is running and the configured model has been downloaded.

### Run it directly from the project root

```bash
python .agents/skills/storypoints-council/scripts/council.py \
  --mode local-cli \
  --config .agents/skills/storypoints-council/storypoints-council.local.conf \
  --history ./historical \
  --task ./new-task.csv
```

### Run it directly from another directory

```bash
python /path/to/StoryPoint-Normalizer/.agents/skills/storypoints-council/scripts/council.py \
  --mode local-cli \
  --config /path/to/StoryPoint-Normalizer/.agents/skills/storypoints-council/storypoints-council.local.conf \
  --history /path/to/historical \
  --task /path/to/new-task.csv
```

`--task` accepts either a task file path or inline task text. `--history` must identify the folder containing the historical tasks and estimates. Use `--providers` to temporarily override the provider list from the configuration file.
