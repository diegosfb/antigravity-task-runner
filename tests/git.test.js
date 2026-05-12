const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function setupGitModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") {
      return {
        workspace: { getConfiguration: () => ({ get: () => false }) }
      };
    }
    return originalRequire.apply(this, arguments);
  };
  const git = require("../out/git.js");
  Module.prototype.require = originalRequire;
  return git;
}

function createTempGitRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@t.com"], { cwd: repoRoot, stdio: "ignore" });
  fs.writeFileSync(path.join(repoRoot, "README.md"), "test\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["branch", "-M", "main"], { cwd: repoRoot, stdio: "ignore" });
  return repoRoot;
}

test("isAutocommitRunning returns false when .env does not exist", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  assert.equal(git.isAutocommitRunning(repoRoot), false);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("isAutocommitRunning returns true for truthy env values", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  fs.writeFileSync(path.join(repoRoot, ".env"), "autocommit_running=true\n", "utf8");
  assert.equal(git.isAutocommitRunning(repoRoot), true);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("isAutocommitRunning returns false for falsy env values", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  fs.writeFileSync(path.join(repoRoot, ".env"), "autocommit_running=0\n", "utf8");
  assert.equal(git.isAutocommitRunning(repoRoot), false);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("isAutocommitRunning returns true when autocommit_pid is a number", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  fs.writeFileSync(path.join(repoRoot, ".env"), "autocommit_pid=12345\n", "utf8");
  assert.equal(git.isAutocommitRunning(repoRoot), true);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("isAutocommitRunning returns false when autocommit_pid is not a number", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  fs.writeFileSync(path.join(repoRoot, ".env"), "autocommit_pid=abc\n", "utf8");
  assert.equal(git.isAutocommitRunning(repoRoot), false);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("hasGitHubRemoteSync returns true when remote contains github.com", () => {
  const git = setupGitModule();
  const repoRoot = createTempGitRepo();
  execFileSync("git", ["remote", "add", "origin", "https://github.com/octo-org/repo.git"], { cwd: repoRoot, stdio: "ignore" });
  assert.equal(git.hasGitHubRemoteSync(repoRoot), true);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("hasGitHubRemoteSync returns false when no github remote", () => {
  const git = setupGitModule();
  const repoRoot = createTempGitRepo();
  execFileSync("git", ["remote", "add", "origin", "https://gitlab.com/org/repo.git"], { cwd: repoRoot, stdio: "ignore" });
  assert.equal(git.hasGitHubRemoteSync(repoRoot), false);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("hasGitHubRemoteSync returns false when no remotes configured", () => {
  const git = setupGitModule();
  const repoRoot = createTempGitRepo();
  assert.equal(git.hasGitHubRemoteSync(repoRoot), false);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("getCurrentBranchNameSync returns branch name", () => {
  const git = setupGitModule();
  const repoRoot = createTempGitRepo();
  assert.equal(git.getCurrentBranchNameSync(repoRoot), "main");
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("getCurrentBranchNameSync returns undefined when not in a git repo", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-notgit-"));
  assert.equal(git.getCurrentBranchNameSync(repoRoot), undefined);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("startAutocommit and stopAutocommit manage timers", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  git.startAutocommit(repoRoot);
  assert.equal(git.isAutocommitRunning(repoRoot), true);
  git.stopAutocommit(repoRoot);
  assert.equal(git.isAutocommitRunning(repoRoot), false);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

test("startAutocommit is idempotent", () => {
  const git = setupGitModule();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-"));
  git.startAutocommit(repoRoot);
  git.startAutocommit(repoRoot);
  assert.equal(git.isAutocommitRunning(repoRoot), true);
  git.stopAutocommit(repoRoot);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});
