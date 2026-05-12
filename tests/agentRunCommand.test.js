const test = require("node:test");
const assert = require("node:assert/strict");

const { buildAgentRunCommand } = require("../out/agentRunCommand.js");

test("OpenCode Jira command uses the default model", () => {
  const command = buildAgentRunCommand(
    "/tmp/repo",
    "OpenCode",
    "work on Jira Item TEST-1 - Example summary"
  );

  assert.match(command, /^opencode run "/);
  assert.doesNotMatch(command, /\s-m\s/);
});

test("Qwen Code Jira command keeps the explicit qwen model", () => {
  const command = buildAgentRunCommand(
    "/tmp/repo",
    "Qwen Code",
    "work on Jira Item TEST-2 - Example summary"
  );

  assert.match(command, /^opencode run -m ollama\/qwen3-coder:30b "/);
});

test("Codex Jira command uses exec full-auto without a heredoc", () => {
  const command = buildAgentRunCommand(
    "/tmp/repo",
    "Codex",
    "work on Jira Item TEST-3 - Example summary"
  );

  assert.match(command, /^codex exec --full-auto -C "\/tmp\/repo"/);
  assert.doesNotMatch(command, /ANTIGRAVITY_JIRA_PROMPT_EOF|ANTIGRAVITY_HARNESS_PROMPT_EOF|<<'/);
  assert.match(command, /"work on Jira Item TEST-3 - Example summary"$/);
});
