const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  CLOUD_ARCHITECT_REVIEW_PROMPT,
  copyCloudArchitectSkill,
  detectCloudInfrastructureSignals,
  hasCloudInfrastructureNeeds
} = require("../out/cloudArchitectReview.js");

test("CLOUD_ARCHITECT_REVIEW_PROMPT keeps the requested review prompt text", () => {
  assert.equal(
    CLOUD_ARCHITECT_REVIEW_PROMPT,
    "use skill cloud-architect to review the infrastructure setup, do a right sizing and propose improvements"
  );
});

test("detectCloudInfrastructureSignals finds infrastructure directories and deployment files", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-cloud-review-"));

  fs.mkdirSync(path.join(repoRoot, "config", "Infrastructure"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "config", "Infrastructure", "aws.yaml"), "name: aws\n");
  fs.mkdirSync(path.join(repoRoot, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "scripts", "deploy-gcp-cloudrun.sh"), "#!/bin/sh\n");
  fs.writeFileSync(path.join(repoRoot, "docker-compose.yml"), "services:\n");

  const signals = detectCloudInfrastructureSignals(repoRoot, 5);

  assert.ok(signals.includes("config/Infrastructure"));
  assert.ok(signals.includes("scripts/deploy-gcp-cloudrun.sh"));
  assert.ok(signals.includes("docker-compose.yml"));
  assert.equal(hasCloudInfrastructureNeeds(repoRoot), true);
});

test("detectCloudInfrastructureSignals ignores agent skill folders", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-cloud-review-"));

  fs.mkdirSync(
    path.join(repoRoot, ".claude", "skills", "cloud-architect", "references"),
    { recursive: true }
  );
  fs.writeFileSync(
    path.join(repoRoot, ".claude", "skills", "cloud-architect", "references", "aws.md"),
    "# AWS\n"
  );

  assert.deepEqual(detectCloudInfrastructureSignals(repoRoot, 5), []);
  assert.equal(hasCloudInfrastructureNeeds(repoRoot), false);
});

test("copyCloudArchitectSkill copies the skill into .agent/skills and .claude/skills", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-cloud-review-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "cloud-architect");

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# Cloud Architect\n");

  const copiedPaths = await copyCloudArchitectSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, [
    ".agent/skills/cloud-architect",
    ".claude/skills/cloud-architect"
  ]);
  assert.equal(
    fs.readFileSync(
      path.join(projectRoot, ".agent", "skills", "cloud-architect", "SKILL.md"),
      "utf8"
    ),
    "# Cloud Architect\n"
  );
  assert.equal(
    fs.readFileSync(
      path.join(projectRoot, ".claude", "skills", "cloud-architect", "SKILL.md"),
      "utf8"
    ),
    "# Cloud Architect\n"
  );
});

test("copyCloudArchitectSkill does not overwrite an existing project skill", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-cloud-review-"));
  const extensionRoot = path.join(tempRoot, "extension");
  const projectRoot = path.join(tempRoot, "project");
  const sourceRoot = path.join(extensionRoot, "Resources", "cloud-architect");
  const existingAgentSkill = path.join(
    projectRoot,
    ".agent",
    "skills",
    "cloud-architect",
    "SKILL.md"
  );
  const existingClaudeSkill = path.join(
    projectRoot,
    ".claude",
    "skills",
    "cloud-architect",
    "SKILL.md"
  );

  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "SKILL.md"), "# New Cloud Architect\n");
  fs.mkdirSync(path.dirname(existingAgentSkill), { recursive: true });
  fs.mkdirSync(path.dirname(existingClaudeSkill), { recursive: true });
  fs.writeFileSync(existingAgentSkill, "# Existing Agent Skill\n");
  fs.writeFileSync(existingClaudeSkill, "# Existing Claude Skill\n");

  const copiedPaths = await copyCloudArchitectSkill(extensionRoot, projectRoot);

  assert.deepEqual(copiedPaths, []);
  assert.equal(fs.readFileSync(existingAgentSkill, "utf8"), "# Existing Agent Skill\n");
  assert.equal(fs.readFileSync(existingClaudeSkill, "utf8"), "# Existing Claude Skill\n");
});
