# OpenRouter Story Points Council

## What it does

The OpenRouter Story Points Council estimates the relative complexity of a software task by comparing it with previously estimated work. It uses a stable historical project baseline so estimates remain consistent over time and are not reduced merely because a developer or AI tool could implement the task faster.

The council sends the same evidence to multiple configured models through OpenRouter and returns one Fibonacci estimate: `1`, `2`, `3`, `5`, `8`, `13`, or `21`. The result also includes confidence, the closest historical analogs, and a concise rationale.

Successful estimates are appended to `estimation-output.csv` in the configured output folder. When enabled, a JSON artifact also records the models' concise estimates, peer reviews, and final result for auditing.

## OpenRouter models and data handling

The orchestration script runs locally, but model inference is performed by external models accessed through the OpenRouter API. The task, relevant historical estimates, shared methodology, and council prompts are transmitted to OpenRouter and the configured model providers.

The council can use models from multiple providers through one OpenRouter configuration. This provides genuine model diversity without requiring separate local CLIs for Codex, Claude, Gemini, or Ollama. At least two council models must be configured; three or more models from different providers are recommended.

An OpenRouter API key and network access are required. Review the sensitivity and data-handling requirements of the task and historical corpus before transmission. When `REQUEST_OPENROUTER_APPROVAL=true` or is omitted, the skill asks for approval before sending data. Setting it to `false` suppresses only that skill-level question and does not override runtime authorization requirements.

## How it works

1. The script loads the new task, historical estimation corpus, shared methodology, and selected configuration.
2. Every configured council model independently estimates the task from the same evidence.
3. The proposals are anonymized and returned to the models for blind peer review and ranking.
4. The configured chairman model considers the independent estimates and reviews, then selects the final estimate. It does not mechanically average values or rely only on majority vote.
5. The final estimate and its supporting metadata are written to the configured report and, when enabled, the council JSON artifact.

At least two independent model estimates must succeed. The chairman defaults to the first configured council model but can be set separately. Model selection, chairman selection, output location, transmission approval, clarification behavior, and optional council artifacts are controlled by `storypoints-council.openrouter.conf`. See [openrouter-config.md](openrouter-config.md) for configuration details and [openrouter-estimation-methodology.md](openrouter-estimation-methodology.md) for the sizing rules.

## How to use it

### Use it as a regular LLM skill

In a skill-aware LLM environment, ask the LLM to estimate a task with the Story Points Council in OpenRouter mode and provide the task plus the historical-estimates location. The LLM can select the skill automatically from the request, or you can invoke `$storypoints-council` explicitly.

For example:

```text
Use $storypoints-council in OpenRouter mode to estimate ./tasks/NEW-123.md using the historical estimates in ./historical.
```

The LLM handles the configured approval and clarification preflights, runs the council, and returns the final estimate in the skill's standard four-field format.

Before using the skill, populate `storypoints-council.openrouter.conf` with an OpenRouter API key, at least two model IDs, and an output folder. The populated file contains a credential and must remain outside source control.

### Run it directly from the project root

```bash
python .agents/skills/storypoints-council/scripts/council.py \
  --mode openrouter \
  --history ./historical \
  --task ./new-task.csv
```

### Run it directly from another directory

```bash
python /path/to/StoryPoint-Normalizer/.agents/skills/storypoints-council/scripts/council.py \
  --mode openrouter \
  --history /path/to/historical \
  --task /path/to/new-task.csv

```

`--config` is optional. By default, OpenRouter mode loads `storypoints-council.openrouter.conf` relative to the unified skill. To use a different file, add `--config /path/to/another.conf`.

`--task` accepts either a task file path or inline task text. `--history` identifies the folder containing historical tasks and estimates. Use `--models` to temporarily override the configured council model list; credentials still come from the configuration file.
