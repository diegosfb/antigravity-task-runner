const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAgenticHarnessPromptCommandForCommand
} = require("../out/agenticHarnessCommand.js");

test("buildAgenticHarnessPromptCommandForCommand keeps claude prompt mode behavior", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "claude",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.equal(command, 'claude "create the jira project"');
});

test("buildAgenticHarnessPromptCommandForCommand uses codex exec with trust overrides", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "codex",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.match(command, /^codex exec --full-auto -C "\/tmp\/repo"/);
  assert.match(command, /trust_level=\\"trusted\\"/);
  assert.match(command, /projects\.\\"\/tmp\/repo\\"\.\w+=\\"trusted\\"/);
  assert.match(command, /<<'ANTIGRAVITY_HARNESS_PROMPT_EOF'/);
  assert.match(command, /\ncreate the jira project\nANTIGRAVITY_HARNESS_PROMPT_EOF$/);
});

test("buildAgenticHarnessPromptCommandForCommand keeps opencode commands simple", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "opencode run -m ollama/qwen3-coder:30b",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.equal(command, 'opencode run -m ollama/qwen3-coder:30b "create the jira project"');
});

test("buildAgenticHarnessPromptCommandForCommand supports codex commands with extra args", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "codex --model gpt-5.5-codex",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.match(command, /^codex exec --model gpt-5\.5-codex --full-auto -C "\/tmp\/repo"/);
});

test("buildAgenticHarnessPromptCommandForCommand supports full executable paths", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "/usr/local/bin/claude",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.equal(command, '/usr/local/bin/claude "create the jira project"');
});
