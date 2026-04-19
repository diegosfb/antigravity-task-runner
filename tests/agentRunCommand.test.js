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
