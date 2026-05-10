const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "vscode") return {};
  return originalRequire.apply(this, arguments);
};

const { appendEnvComment } = require("../out/utils.js");

test("appendEnvComment adds a new comment line", () => {
  const tmp = path.join(os.tmpdir(), `test-env-${Date.now()}`);
  appendEnvComment(tmp, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN");
  try {
    const content = fs.readFileSync(tmp, "utf8");
    assert.strictEqual(content, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN\n");
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
});

test("appendEnvComment does not duplicate an existing comment", () => {
  const tmp = path.join(os.tmpdir(), `test-env-${Date.now()}`);
  fs.writeFileSync(tmp, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN\n");
  appendEnvComment(tmp, "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN");
  try {
    const content = fs.readFileSync(tmp, "utf8");
    const lines = content.split("\n").filter(Boolean);
    assert.strictEqual(lines.filter(l => l === "# GITHUB_SECRET[production]: DOCKERHUB_TOKEN").length, 1);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
});

test("appendEnvComment creates the file if it does not exist", () => {
  const tmp = path.join(os.tmpdir(), `test-env-new-${Date.now()}`);
  appendEnvComment(tmp, "# GITHUB_SECRET[_repo]: ANTHROPIC_API_KEY");
  try {
    const content = fs.readFileSync(tmp, "utf8");
    assert.strictEqual(content, "# GITHUB_SECRET[_repo]: ANTHROPIC_API_KEY\n");
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
});
