# Configuration

Copy `storypoints-council.openrouter.conf.example` to `storypoints-council.openrouter.conf`. Keep the populated file out of source control.

Required keys:
- `OPENROUTER_API_KEY`: OpenRouter API credential.
- `STORYPOINT_COUNCIL_MODELS`: comma-separated OpenRouter model IDs; individually quoted values are accepted.
- `OUTPUT_FOLDER`: directory where `estimation-output.csv` is created or appended. Relative paths resolve from the config file's directory.

Optional key:
- `STORYPOINT_CHAIRMAN_MODEL`: chairman model; defaults to the first council model.
- `REQUEST_OPENROUTER_APPROVAL`: whether the skill asks for user approval before transmitting the task and historical corpus. Defaults to `true`. Set to `false` to suppress the skill-level question; runtime authorization still applies. Values are case-insensitive `true` or `false`, optionally quoted.
- `COUNCIL_DEBATE_OUTPUT`: controls the per-run council JSON artifact. Defaults to `Off`. Set to `On` to write model estimations, peer reviews, and the final chairman result to `<TASK-ID>_council_<YYYYMMDDTHHMMSSZ>.json` in `OUTPUT_FOLDER`. Values are case-insensitive `On` or `Off`, optionally quoted.
- `ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION`: controls the local clarification preflight. Defaults to `Off`. When `On`, run the clarification-preflight mode in `development-estimation` before OpenRouter. If questions are generated, pause until the user adds answers to the source task description, saves it, and continues. Values are case-insensitive `On` or `Off`, optionally quoted.

Example:
```text
OPENROUTER_API_KEY=HERE GOES MY APIKEY
STORYPOINT_COUNCIL_MODELS='anthropic/claude-fable-5','qwen/qwen3.8-27b','google/gemini-3.7-flash','anthropic/claude-opus-5','thinkingmachines/inkling','openai/gpt-5.6-sol-pro','anthropic/claude-sonnet-5','nvidia/nemotron-3-ultra-550b-a55b:free'
STORYPOINT_CHAIRMAN_MODEL='anthropic/claude-fable-5'
OUTPUT_FOLDER='./output'
REQUEST_OPENROUTER_APPROVAL=true
COUNCIL_DEBATE_OUTPUT=Off
ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION=Off
```
