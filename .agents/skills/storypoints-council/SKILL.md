---
name: storypoints-council
description: Estimate historically calibrated Fibonacci story points through one council workflow with either local command-line providers or OpenRouter models. Use when independent estimates, blind peer review, chairman synthesis, confidence, and auditable outputs are required. Select local-cli or openrouter explicitly; external transmission through OpenRouter requires its configured approval and credential controls.
metadata:
  version: "2.0.0"
  library: "Local"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Story Points Council

Run the same calibrated estimation protocol through one of two execution backends:

- `local-cli`: invoke configured Codex, Claude, Gemini, or Ollama commands. Note that a local CLI may still call its provider's hosted service.
- `openrouter`: send the evidence packet to configured models through the OpenRouter API.

The backend changes transport and provider configuration, not estimation meaning or output.

The dispatcher delegates to [local_council.py](scripts/local_council.py) or [openrouter_council.py](scripts/openrouter_council.py). UI discovery metadata is maintained in [openai.yaml](agents/openai.yaml).

## Mode selection

Honor selection in this order:

1. An explicit user choice such as “use local models,” “use the CLI council,” or “estimate through OpenRouter.”
2. The command-line `--mode local-cli|openrouter` value.
3. `MODE` in `storypoints-council.conf`.
4. Safe default: `local-cli`.

Never fall back from a failed local run to OpenRouter. Never transmit data to OpenRouter merely because local providers are unavailable. If the requested mode is unclear and OpenRouter would be required, ask the user to choose.

Examples:

```bash
python scripts/council.py --mode local-cli --history <folder> --task <task>
python scripts/council.py --mode openrouter --history <folder> --task <task>
```

`--config <path>` overrides the selected backend config. `--selector-config <path>` selects a non-default mode-selector file. `--show-selection` prints only the chosen mode, backend, and config path without executing a council or reading credential values.

## Shared estimation contract

Use historical estimates as a stable project ruler. Estimate intrinsic relative complexity, not elapsed time or current productivity. Never lower points because of AI tools, automation, familiarity, velocity, or assignee skill. Genuine removal of scope, uncertainty, integration surface, testing, or risk may reduce points.

Allowed values: `1`, `2`, `3`, `5`, `8`, `13`, `21`.

Every backend runs the same stages:

1. Give each provider the same task, history, and methodology for an independent estimate.
2. Anonymize proposals and obtain blind peer reviews.
3. Ask the configured chairman to synthesize without mechanical averaging or majority voting.
4. Derive confidence from historical evidence quality and council convergence.
5. Append the result to `estimation-output.csv`; optionally write the debate JSON.

Final output must be exactly:

```text
Story Points: <1|2|3|5|8|13|21>
Confidence: <High|Medium|Low>
Closest historical analogs: <up to three real task IDs with points, or None>
Rationale: <concise auditable explanation>
```

Do not expose hidden chain-of-thought in user output or stored artifacts.

## Clarification preflight

Read `ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION` from the selected backend config. When it is `On`, use [development-estimation's clarification contract](../development-estimation/references/clarification-preflight.md) and [writer](../development-estimation/scripts/write_clarifications.py), passing the selected backend config with `--config`.

- If no material questions result, run with `--clarifications-complete`.
- If questions result, show them, link the JSON artifact, and stop before invoking providers. Ask the user to update the source task and reply **Continue**.
- On continuation, reload the source. If unchanged, warn and require a second explicit confirmation before using `--continue-without-clarifications`.

Neither continuation flag grants external-data authorization.

## OpenRouter authorization

Before OpenRouter mode transmits the task or historical corpus, read only `REQUEST_OPENROUTER_APPROVAL` from the selected config without displaying other values.

- `true` or omitted: obtain explicit user approval before executing the backend.
- `false`: the skill-level prompt may be skipped, but runtime authorization and organizational policy still apply.

Never print, log, or commit `OPENROUTER_API_KEY`. Do not claim OpenRouter mode ran unless at least two independent estimates succeeded and the configured chairman completed.

## Configuration

Checked-in examples:

- `storypoints-council.conf.example` — optional default-mode selector.
- `storypoints-council.local.conf.example` — local providers and commands.
- `storypoints-council.openrouter.conf.example` — OpenRouter credential and model settings.

Copy the needed examples to the same names without `.example`. Populated `.conf` files are ignored and must remain outside source control. Relative output folders resolve from the selected backend config.

Read only the relevant mode reference:

- Local CLI: [local-cli-config.md](references/local-cli-config.md) and [local-cli-overview.md](references/local-cli-overview.md).
- OpenRouter: [openrouter-config.md](references/openrouter-config.md) and [openrouter-overview.md](references/openrouter-overview.md).
- Shared council protocol: [council-protocol.md](references/council-protocol.md).
- Local methodology: [estimation-methodology.md](references/estimation-methodology.md).
- OpenRouter methodology retained for behavioral compatibility: [openrouter-estimation-methodology.md](references/openrouter-estimation-methodology.md).

Bundled CSV files are sample calibration inputs, not automatic production history:

- Local CLI samples: [new tasks](resources/new-tasks.csv) and [historical tasks](resources/historical/tasks.csv).
- OpenRouter samples retained from the merged skill: [new tasks](resources/openrouter-new-tasks.csv) and [historical tasks](resources/openrouter-historical-tasks.csv).

Continue after individual provider failures only when at least two independent estimates remain. Never silently substitute the configured chairman. Reporting failure is execution failure.
