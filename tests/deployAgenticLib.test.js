const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME,
  resolveDeployAgenticLibSourceFolder
} = require("../out/deployAgenticLib.js");

test("DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME matches the bundled script name", () => {
  assert.equal(DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME, "deploy-agentic-lib-to-project");
});

test("resolveDeployAgenticLibSourceFolder keeps directory selections unchanged", () => {
  const selectedPath = "/tmp/shared-lib";
  const result = resolveDeployAgenticLibSourceFolder(selectedPath, () => ({
    isDirectory: () => true
  }));

  assert.equal(result, selectedPath);
});

test("resolveDeployAgenticLibSourceFolder promotes file selections to the parent folder", () => {
  const selectedFile = path.join("/tmp", "shared-lib", "skills", "my-skill", "SKILL.md");
  const result = resolveDeployAgenticLibSourceFolder(selectedFile, () => ({
    isDirectory: () => false
  }));

  assert.equal(result, path.dirname(selectedFile));
});
