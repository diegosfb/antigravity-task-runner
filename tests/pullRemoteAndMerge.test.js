const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o755 });
}

function initializeRepo(rootPrefix) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), rootPrefix));
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

  return { rootDir, remoteDir, repoDir };
}

function createUserShellStub(binDir, logPath) {
  const shellPath = path.join(binDir, "user-shell");
  writeExecutable(
    shellPath,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" > ${JSON.stringify(logPath)}

if [[ "$#" -ge 2 && "$1" == "-lc" ]]; then
  command="$2"
  command="\${command//test\\/\\*\\*\\/\\*.test.js/test/example.test.js}"
  exec /bin/bash -lc "$command"
fi

exec /bin/bash "$@"
`
  );
  return shellPath;
}

function createTempRepoForPullRemoteAndMerge(branchName = "feature/test-pull-remote-merge") {
  const { rootDir, repoDir } = initializeRepo("antigravity-pull-merge-");

  fs.writeFileSync(path.join(repoDir, "README.md"), "base\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["branch", "-M", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", path.join(rootDir, "remote.git")], {
    cwd: repoDir,
    stdio: "ignore"
  });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "-b", branchName], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "feature-only.txt"), "feature branch work\n", "utf8");
  execFileSync("git", ["add", "feature-only.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Add feature work"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", branchName], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "main"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "main-only.txt"), "main branch work\n", "utf8");
  execFileSync("git", ["add", "main-only.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Advance main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["checkout", branchName], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir, branchName };
}

function createTempRepoWithMergeConflict(branchName = "feature/test-pull-merge-conflict") {
  const { rootDir, repoDir } = initializeRepo("antigravity-pull-merge-conflict-");

  fs.writeFileSync(path.join(repoDir, "index.js"), "console.log('base');\n", "utf8");
  execFileSync("git", ["add", "index.js"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["branch", "-M", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", path.join(rootDir, "remote.git")], {
    cwd: repoDir,
    stdio: "ignore"
  });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "-b", branchName], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "index.js"), "console.log('feature change');\n", "utf8");
  execFileSync("git", ["add", "index.js"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Update index.js on feature"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", branchName], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "main"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "index.js"), "console.log('main change');\n", "utf8");
  execFileSync("git", ["add", "index.js"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Update index.js on main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["checkout", branchName], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir, branchName };
}

function runPullRemoteAndMergeScript({ repoDir, branchName, input = "", env = {} }) {
  const scriptPath = path.join(__dirname, "..", "src", "pull_remote_and_merge.sh");
  return execFileSync("bash", [scriptPath, branchName], {
    cwd: repoDir,
    encoding: "utf8",
    input,
    env: {
      ...process.env,
      ...env
    }
  });
}

test("pull_remote_and_merge.sh pulls main, merges it into the feature branch, runs tests, and pushes", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoForPullRemoteAndMerge();
  const binDir = path.join(rootDir, "bin");
  const testMarkerPath = path.join(rootDir, "saved-project-tests.log");
  fs.mkdirSync(binDir, { recursive: true });
  writeExecutable(
    path.join(binDir, "saved-project-tests"),
    `#!/usr/bin/env bash
set -euo pipefail
printf 'used\\n' > ${JSON.stringify(testMarkerPath)}
`
  );

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runPullRemoteAndMergeScript({
    repoDir,
    branchName,
    env: {
      ANTIGRAVITY_PROJECT_TESTING_COMMAND: "saved-project-tests",
      PATH: `${binDir}:${process.env.PATH}`
    }
  });

  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const headParents = execFileSync("git", ["rev-list", "--parents", "-n", "1", "HEAD"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim().split(/\s+/);
  const remoteHead = execFileSync("git", ["ls-remote", "--heads", "origin", branchName], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim().split(/\s+/)[0];
  const localHead = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();

  assert.equal(currentBranch, branchName);
  assert.equal(fs.existsSync(path.join(repoDir, "main-only.txt")), true);
  assert.equal(fs.existsSync(testMarkerPath), true);
  assert.equal(headParents.length, 3);
  assert.equal(remoteHead, localHead);
  assert.match(output, /\+ git checkout main/);
  assert.match(output, /\+ git -c pull\.rebase=true pull origin main/);
  assert.match(output, /Using Project Testing Command from settings\./);
  assert.match(output, new RegExp(`\\+ git push origin ${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("pull_remote_and_merge.sh runs the saved Project Testing Command with the user's shell", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoForPullRemoteAndMerge(
    "feature/test-pull-remote-merge-shell"
  );
  const binDir = path.join(rootDir, "bin");
  const shellLogPath = path.join(rootDir, "user-shell.log");
  fs.mkdirSync(binDir, { recursive: true });
  const shellPath = createUserShellStub(binDir, shellLogPath);

  fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, "test", "example.test.js"),
    `const test = require("node:test");
const assert = require("node:assert/strict");

test("passes through the user's shell glob expansion", () => {
  assert.equal(1, 1);
});
`,
    "utf8"
  );
  execFileSync("git", ["add", "test/example.test.js"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Add shell-based node test"], {
    cwd: repoDir,
    stdio: "ignore"
  });

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runPullRemoteAndMergeScript({
    repoDir,
    branchName,
    env: {
      ANTIGRAVITY_PROJECT_TESTING_COMMAND: "node --test test/**/*.test.js",
      SHELL: shellPath
    }
  });

  assert.match(output, /Using Project Testing Command from settings\./);
  assert.doesNotMatch(output, /Could not find .+test\/\*\*\/\*\.test\.js/);
  assert.match(fs.readFileSync(shellLogPath, "utf8"), /-lc node --test test\/\*\*\/\*\.test\.js/);
});

test("pull_remote_and_merge.sh stops with merge recovery guidance when conflicts occur", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoWithMergeConflict();

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  let error;
  try {
    runPullRemoteAndMergeScript({
      repoDir,
      branchName,
      env: {
        ANTIGRAVITY_PROJECT_TESTING_COMMAND: "skip"
      }
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error, "expected merge script to fail on conflicts");
  assert.equal(error.status, 1);

  const combinedOutput = `${error.stdout || ""}${error.stderr || ""}`;
  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const mergeHead = execFileSync("git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();

  assert.equal(currentBranch, branchName);
  assert.notEqual(mergeHead, "");
  assert.match(combinedOutput, /Merge stopped because of conflicts\./);
  assert.match(combinedOutput, /git add\/rm <conflicted_files>/);
  assert.match(combinedOutput, /git commit' to complete the merge/);
  assert.match(combinedOutput, new RegExp(`git push origin ${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(combinedOutput, /git merge --abort/);
});
