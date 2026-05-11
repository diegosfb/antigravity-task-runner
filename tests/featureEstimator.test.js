const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildFeatureEstimatorPrompt,
  copyFeatureEstimatorSkill,
  FEATURE_ESTIMATOR_SKILL_NAME
} = require("../out/featureEstimator.js");

test("FEATURE_ESTIMATOR_SKILL_NAME matches the bundled skill folder", () => {
  assert.equal(FEATURE_ESTIMATOR_SKILL_NAME, "estimator");
});

test("buildFeatureEstimatorPrompt injects the feature details into the requested prompt", () => {
  assert.equal(
    buildFeatureEstimatorPrompt("Jira item TASK-321: Add role-based billing controls"),
    "use skill estimator to estimate the complexity of this feature Jira item TASK-321: Add role-based billing controls estimating the man hours required and the skills/profiles required. Also do a breakdown of hours per skill/profile required"
  );
});

test("copyFeatureEstimatorSkill copies the skill into .agent/skills and .claude/skills", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-feature-estimator-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "estimator");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# Estimator\n");

  const copiedPaths = await copyFeatureEstimatorSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, [
    ".agent/skills/estimator",
    ".claude/skills/estimator"
  ]);
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".agent", "skills", "estimator", "SKILL.md"), "utf8"),
    "# Estimator\n"
  );
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".claude", "skills", "estimator", "SKILL.md"), "utf8"),
    "# Estimator\n"
  );
});

test("copyFeatureEstimatorSkill does not overwrite an existing bundled estimator skill", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-feature-estimator-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "estimator");
  const existingAgentSkill = path.join(projectRoot, ".agent", "skills", "estimator", "SKILL.md");
  const existingClaudeSkill = path.join(projectRoot, ".claude", "skills", "estimator", "SKILL.md");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# New Estimator\n");
  fs.mkdirSync(path.dirname(existingAgentSkill), { recursive: true });
  fs.mkdirSync(path.dirname(existingClaudeSkill), { recursive: true });
  fs.writeFileSync(existingAgentSkill, "# Existing Agent Estimator\n");
  fs.writeFileSync(existingClaudeSkill, "# Existing Claude Estimator\n");

  const copiedPaths = await copyFeatureEstimatorSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, []);
  assert.equal(fs.readFileSync(existingAgentSkill, "utf8"), "# Existing Agent Estimator\n");
  assert.equal(fs.readFileSync(existingClaudeSkill, "utf8"), "# Existing Claude Estimator\n");
});
