const test = require("node:test");
const assert = require("node:assert/strict");

const { buildMergeReviewPrompt } = require("../out/mergeReviewPrompt.js");

test("buildMergeReviewPrompt includes merge review constraints and configured test command", () => {
  const prompt = buildMergeReviewPrompt({
    currentBranch: "feature/review-merge",
    baseBranch: "main",
    projectTestingCommand: "npm test"
  });

  assert.match(prompt, /latest main branch/);
  assert.match(prompt, /active feature branch is feature\/review-merge/);
  assert.match(prompt, /Do not modify files, stage changes, create commits, or push anything\./);
  assert.match(prompt, /Run this configured project testing command if it helps validate the merge: npm test\./);
  assert.match(prompt, /If you find issues, list them in severity order with file paths and line references when possible\./);
});

test("buildMergeReviewPrompt calls out missing test configuration", () => {
  const prompt = buildMergeReviewPrompt({
    currentBranch: "feature/no-test-command"
  });

  assert.match(prompt, /most recent merge of main into feature\/no-test-command/);
  assert.match(prompt, /No project testing command is configured in settings/);
  assert.match(prompt, /If no issues are found, explicitly say the merge looks OK/);
});
