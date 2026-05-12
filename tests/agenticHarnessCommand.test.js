const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAgenticHarnessFileCommandForCommand,
  buildAgenticHarnessPromptCommandForCommand
} = require("../out/agenticHarnessCommand.js");

test("buildAgenticHarnessPromptCommandForCommand uses --dangerously-skip-permissions and --print for dangerous mode", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "claude",
    "/tmp/repo",
    "create the jira project",
    "dangerous"
  );

  assert.equal(command, 'claude --dangerously-skip-permissions --print "create the jira project"');
});

test("buildAgenticHarnessPromptCommandForCommand keeps claude prompt mode behavior", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "claude",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.equal(command, 'claude "create the jira project"');
});

test("buildAgenticHarnessPromptCommandForCommand keeps codex prompt mode interactive", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "codex",
    "/tmp/repo",
    "create the jira project",
    "prompt"
  );

  assert.match(command, /^codex -C "\/tmp\/repo"/);
  assert.match(command, /trust_level=\\"trusted\\"/);
  assert.match(command, /projects\.\\"\/tmp\/repo\\"\.\w+=\\"trusted\\"/);
  assert.doesNotMatch(command, /\bcodex exec\b/);
  assert.doesNotMatch(command, /--full-auto/);
  assert.match(command, /"create the jira project"$/);
});

test("buildAgenticHarnessPromptCommandForCommand keeps codex dangerous mode in exec full-auto", () => {
  const command = buildAgenticHarnessPromptCommandForCommand(
    "codex",
    "/tmp/repo",
    "create the jira project",
    "dangerous"
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

  assert.match(command, /^codex --model gpt-5\.5-codex -C "\/tmp\/repo"/);
});

test("buildAgenticHarnessFileCommandForCommand keeps codex prompt mode interactive", () => {
  const command = buildAgenticHarnessFileCommandForCommand(
    "codex",
    "/tmp/repo",
    "/tmp/prompt.txt",
    "prompt"
  );

  assert.match(command, /^codex -C "\/tmp\/repo"/);
  assert.doesNotMatch(command, /\bcodex exec\b/);
  assert.doesNotMatch(command, /--full-auto/);
  assert.match(command, /"\$\(cat "\/tmp\/prompt\.txt"\)"$/);
});

test("buildAgenticHarnessFileCommandForCommand keeps codex dangerous mode in exec full-auto", () => {
  const command = buildAgenticHarnessFileCommandForCommand(
    "codex",
    "/tmp/repo",
    "/tmp/prompt.txt",
    "dangerous"
  );

  assert.match(command, /^codex exec --full-auto -C "\/tmp\/repo"/);
  assert.match(command, /- < "\/tmp\/prompt\.txt"$/);
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
