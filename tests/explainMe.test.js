const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  EXPLAIN_ME_PROMPT,
  EXPLAIN_ME_SKILL_NAME,
  copyExplainMeSkill
} = require("../out/explainMe.js");

test("EXPLAIN_ME_SKILL_NAME matches the bundled skill folder", () => {
  assert.equal(EXPLAIN_ME_SKILL_NAME, "explain-me");
});

test("EXPLAIN_ME_PROMPT keeps the requested project explanation prompt text", () => {
  assert.equal(
    EXPLAIN_ME_PROMPT,
    "use skill explain-me to explain the solution of the whole project and a detailed explanation of the latest uncommited changes"
  );
});

test("copyExplainMeSkill copies the skill into .agent/skills and .claude/skills", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-explain-me-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "explain-me");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# Explain Me\n");

  const copiedPaths = await copyExplainMeSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, [
    ".agent/skills/explain-me",
    ".claude/skills/explain-me"
  ]);
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".agent", "skills", "explain-me", "SKILL.md"), "utf8"),
    "# Explain Me\n"
  );
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".claude", "skills", "explain-me", "SKILL.md"), "utf8"),
    "# Explain Me\n"
  );
});

test("copyExplainMeSkill does not overwrite an existing bundled explain-me skill", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-explain-me-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "explain-me");
  const existingAgentSkill = path.join(projectRoot, ".agent", "skills", "explain-me", "SKILL.md");
  const existingClaudeSkill = path.join(projectRoot, ".claude", "skills", "explain-me", "SKILL.md");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# New Explain Me\n");
  fs.mkdirSync(path.dirname(existingAgentSkill), { recursive: true });
  fs.mkdirSync(path.dirname(existingClaudeSkill), { recursive: true });
  fs.writeFileSync(existingAgentSkill, "# Existing Agent Explain Me\n");
  fs.writeFileSync(existingClaudeSkill, "# Existing Claude Explain Me\n");

  const copiedPaths = await copyExplainMeSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, []);
  assert.equal(fs.readFileSync(existingAgentSkill, "utf8"), "# Existing Agent Explain Me\n");
  assert.equal(fs.readFileSync(existingClaudeSkill, "utf8"), "# Existing Claude Explain Me\n");
});
