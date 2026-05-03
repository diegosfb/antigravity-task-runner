const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function createTempRepoWithRemote() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-feature-branch-"));
  const remoteDir = path.join(rootDir, "remote.git");
  const repoDir = path.join(rootDir, "repo");

  execFileSync("git", ["init", "--bare", remoteDir], { stdio: "ignore" });
  fs.mkdirSync(repoDir, { recursive: true });
  execFileSync("git", ["init"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.com"], {
    cwd: repoDir,
    stdio: "ignore"
  });
  fs.writeFileSync(path.join(repoDir, "README.md"), "hello\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["branch", "-M", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir };
}

test("create_feature_branch.sh pushes and verifies the remote branch", (t) => {
  const { rootDir, repoDir } = createTempRepoWithRemote();
  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const scriptPath = path.join(__dirname, "..", "src", "create_feature_branch.sh");
  const output = execFileSync("bash", ["-lc", `${JSON.stringify(scriptPath)} "feature/test-branch" 2>&1`], {
    cwd: repoDir,
    encoding: "utf8"
  });

  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const upstream = execFileSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const remoteHeads = execFileSync("git", ["ls-remote", "--heads", "origin", "feature/test-branch"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();

  assert.equal(currentBranch, "feature/test-branch");
  assert.equal(upstream, "origin/feature/test-branch");
  assert.match(remoteHeads, /refs\/heads\/feature\/test-branch$/m);
  assert.match(output, /Remote verified \| Yes/);
  assert.match(output, /branch is already fully created/i);
});
