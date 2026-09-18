# Clarification Preflight

Generate questions with the local model only. Do not call OpenRouter, the Story Points Council, web services, or other external LLMs.

## Workflow

1. Resolve the task. For an ID such as `NEW-006`, read its row from `storypoints-test-data/test/new-tasks.csv`. Also accept a single-task JSON/CSV file or an inline JSON task.
2. Analyze only estimation-relevant ambiguity: scope, technical complexity, uncertainty, dependencies/coordination, integration surface/blast radius, testing/validation burden, compatibility/migration, and inherent risk.
3. Generate up to 12 prioritized, task-specific questions. Return no questions when the task already contains enough detail and no unanswered issue could materially change the estimate, confidence, or historical comparison. Never invent low-value questions merely to fill a quota. Do not ask for facts already present in the task. Do not ask about hours, velocity, assignee skill, familiarity, AI productivity, or business priority.
4. For every question provide `category`, `question`, `why_it_matters`, and `estimation_dimension`. Use [clarification-output-schema.md](clarification-output-schema.md).
5. Save the questions with `../scripts/write_clarifications.py`. By default the script reads only `OUTPUT_FOLDER` from `.agents/skills/storypoints-council/storypoints-council.openrouter.conf`; it does not read or use OpenRouter credentials. Pass the selected backend's `--config` for local CLI mode or any non-default configuration. Output is `<TASK-ID>_clarification-questions_<YYYYMMDDTHHMMSSZ>.json` in that folder.
6. Verify the file exists, parses as JSON, contains the correct task ID, and includes every generated question. An empty `questions` list is valid. Return a concise link to the file and state whether clarification is required.

Example execution after locally generating a temporary questions JSON file:

```bash
python .agents/skills/development-estimation/scripts/write_clarifications.py \
  --task NEW-006 \
  --questions-file /tmp/new-006-questions.json
```
