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

const { scanWorkflowFiles, GITHUB_BUILTIN_SECRETS } = require("../out/secrets-audit.js");

test("scanWorkflowFiles extracts secrets from workflow content", () => {
  const content = `
jobs:
  deploy:
    environment: production
    steps:
      - run: echo \${{ secrets.DOCKERHUB_TOKEN }}
      - run: echo \${{ vars.APP_URL }}
`;
  const result = scanWorkflowFiles([{ name: "deploy.yml", content }]);
  assert.deepEqual(result["production"].secrets, ["DOCKERHUB_TOKEN"]);
  assert.deepEqual(result["production"].variables, ["APP_URL"]);
});

test("scanWorkflowFiles tags secrets with no environment as _repo", () => {
  const content = `
jobs:
  build:
    steps:
      - run: echo \${{ secrets.ANTHROPIC_API_KEY }}
`;
  const result = scanWorkflowFiles([{ name: "build.yml", content }]);
  assert.ok(result["_repo"].secrets.includes("ANTHROPIC_API_KEY"));
});

test("scanWorkflowFiles skips GITHUB_TOKEN", () => {
  const content = `
jobs:
  build:
    steps:
      - run: echo \${{ secrets.GITHUB_TOKEN }}
`;
  const result = scanWorkflowFiles([{ name: "build.yml", content }]);
  const allSecrets = Object.values(result).flatMap(v => v.secrets);
  assert.ok(!allSecrets.includes("GITHUB_TOKEN"));
});

test("scanWorkflowFiles deduplicates across multiple files", () => {
  const fileA = { name: "a.yml", content: "jobs:\n  deploy:\n    environment: production\n    steps:\n      - run: echo ${{ secrets.DOCKERHUB_TOKEN }}\n" };
  const fileB = { name: "b.yml", content: "jobs:\n  deploy:\n    environment: production\n    steps:\n      - run: echo ${{ secrets.DOCKERHUB_TOKEN }}\n" };
  const result = scanWorkflowFiles([fileA, fileB]);
  assert.strictEqual(result["production"].secrets.filter(s => s === "DOCKERHUB_TOKEN").length, 1);
});

test("scanWorkflowFiles resets env to _repo on new job boundary", () => {
  const content = `
jobs:
  deploy:
    environment: production
    steps:
      - run: echo \${{ secrets.DEPLOY_KEY }}
  build:
    steps:
      - run: echo \${{ secrets.BUILD_TOKEN }}
`;
  const result = scanWorkflowFiles([{ name: "multi-job.yml", content }]);
  assert.ok(result["production"].secrets.includes("DEPLOY_KEY"));
  assert.ok(result["_repo"].secrets.includes("BUILD_TOKEN"));
  assert.ok(!result["production"].secrets.includes("BUILD_TOKEN"));
});

test("scanWorkflowFiles does not treat env block environment as job environment", () => {
  const content = `
jobs:
  build:
    steps:
      - run: echo \${{ secrets.REAL_SECRET }}
        env:
          environment: staging
`;
  const result = scanWorkflowFiles([{ name: "env-block.yml", content }]);
  const allEnvs = Object.keys(result).filter(k => k !== "_repo");
  assert.strictEqual(allEnvs.length, 0, "should have no named environments");
  assert.ok(result["_repo"].secrets.includes("REAL_SECRET"));
});

test("scanWorkflowFiles handles multi-line environment block", () => {
  const content = `
jobs:
  deploy:
    environment:
      name: production
      url: https://example.com
    steps:
      - run: echo \${{ secrets.DEPLOY_TOKEN }}
`;
  const result = scanWorkflowFiles([{ name: "multiline-env.yml", content }]);
  assert.ok(result["production"] !== undefined, "production env should exist");
  assert.ok(result["production"].secrets.includes("DEPLOY_TOKEN"));
});

const { parseGitHubOwnerRepo } = require("../out/secrets-audit.js");

test("parseGitHubOwnerRepo handles HTTPS remote", () => {
  const result = parseGitHubOwnerRepo("https://github.com/myorg/myrepo.git");
  assert.deepEqual(result, { owner: "myorg", repo: "myrepo" });
});

test("parseGitHubOwnerRepo handles SSH remote", () => {
  const result = parseGitHubOwnerRepo("git@github.com:myorg/myrepo.git");
  assert.deepEqual(result, { owner: "myorg", repo: "myrepo" });
});

test("parseGitHubOwnerRepo returns null for non-GitHub remote", () => {
  const result = parseGitHubOwnerRepo("https://gitlab.com/myorg/myrepo.git");
  assert.strictEqual(result, null);
});

test("parseGitHubOwnerRepo handles repo names with dots", () => {
  const result = parseGitHubOwnerRepo("https://github.com/org/my-repo.js.git");
  assert.deepEqual(result, { owner: "org", repo: "my-repo.js" });
});
