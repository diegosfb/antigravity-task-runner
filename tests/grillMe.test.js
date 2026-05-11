const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  GRILL_ME_SKILL_NAME,
  buildFeatureGrillMePrompt,
  copyGrillMeSkill
} = require("../out/grillMe.js");

test("GRILL_ME_SKILL_NAME matches the bundled skill folder", () => {
  assert.equal(GRILL_ME_SKILL_NAME, "grill-me");
});

test("buildFeatureGrillMePrompt injects the feature details into the requested review prompt", () => {
  assert.equal(
    buildFeatureGrillMePrompt("Jira item TASK-654 (Story, To Do): Add billing approval workflow"),
    "use skill grill-me to review the feature Jira item TASK-654 (Story, To Do): Add billing approval workflow"
  );
});

test("copyGrillMeSkill copies the skill into .agent/skills and .claude/skills", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-grill-me-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "grill-me");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# Grill Me\n");

  const copiedPaths = await copyGrillMeSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, [
    ".agent/skills/grill-me",
    ".claude/skills/grill-me"
  ]);
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".agent", "skills", "grill-me", "SKILL.md"), "utf8"),
    "# Grill Me\n"
  );
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".claude", "skills", "grill-me", "SKILL.md"), "utf8"),
    "# Grill Me\n"
  );
});

test("copyGrillMeSkill does not overwrite an existing bundled grill-me skill", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-grill-me-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "grill-me");
  const existingAgentSkill = path.join(projectRoot, ".agent", "skills", "grill-me", "SKILL.md");
  const existingClaudeSkill = path.join(projectRoot, ".claude", "skills", "grill-me", "SKILL.md");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# New Grill Me\n");
  fs.mkdirSync(path.dirname(existingAgentSkill), { recursive: true });
  fs.mkdirSync(path.dirname(existingClaudeSkill), { recursive: true });
  fs.writeFileSync(existingAgentSkill, "# Existing Agent Grill Me\n");
  fs.writeFileSync(existingClaudeSkill, "# Existing Claude Grill Me\n");

  const copiedPaths = await copyGrillMeSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, []);
  assert.equal(fs.readFileSync(existingAgentSkill, "utf8"), "# Existing Agent Grill Me\n");
  assert.equal(fs.readFileSync(existingClaudeSkill, "utf8"), "# Existing Claude Grill Me\n");
});
