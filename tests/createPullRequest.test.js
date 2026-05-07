const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o755 });
}

function createTempRepoWithFeatureBranch(branchName = "feature/TEST-123-auto-link") {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-create-pr-"));
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

  execFileSync("git", ["checkout", "-b", branchName], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "feature.txt"), "new feature\n", "utf8");
  execFileSync("git", ["add", "feature.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Add feature branch changes"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", branchName], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir, branchName };
}

function createGhStub(binDir, logPath, bodyCopyPath) {
  writeExecutable(
    path.join(binDir, "gh"),
    `#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ge 2 && "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi

if [[ "$#" -ge 2 && "$1" == "pr" && "$2" == "list" ]]; then
  exit 0
fi

if [[ "$#" -ge 2 && "$1" == "pr" && "$2" == "create" ]]; then
  printf '%s\\n' "$*" > ${JSON.stringify(logPath)}
  args=("$@")
  for ((i = 0; i < \${#args[@]}; i += 1)); do
    if [[ "\${args[$i]}" == "--body-file" ]]; then
      cp "\${args[$((i + 1))]}" ${JSON.stringify(bodyCopyPath)}
      break
    fi
  done
  printf '%s\\n' 'https://github.com/octo-org/octo-repo/pull/123'
  exit 0
fi

printf 'Unexpected gh invocation: %s\\n' "$*" >&2
exit 1
`
  );
}

function createNodeStub(binDir, outputText = "") {
  writeExecutable(
    path.join(binDir, "node"),
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -ge 1 && "$1" == *"infer_jira_issue_link.js" ]]; then
  printf '%s' ${JSON.stringify(outputText)}
  exit 0
fi
exec ${JSON.stringify(process.execPath)} "$@"
`
  );
}

function runCreatePullRequestScript({
  repoDir,
  binDir,
  input
}) {
  const scriptPath = path.join(__dirname, "..", "src", "create_pull_requrest.sh");
  return execFileSync("bash", [scriptPath], {
    cwd: repoDir,
    encoding: "utf8",
    input,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`
    }
  });
}

test("create_pull_requrest.sh uses the inferred Jira issue link without prompting for it", (t) => {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch("feature/TEST-123-auto-link");
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "https://jira.example.com/browse/TEST-123");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "skip\nskip\nAuto-link Jira issue from branch\nUpdates the PR body without prompting for a ticket link.\n\n@octocat\n"
  });

  const prBody = fs.readFileSync(bodyCopyPath, "utf8");

  assert.match(output, /Creating the pull request on GitHub\./);
  assert.match(prBody, /\*\*Linked Issue:\*\* https:\/\/jira\.example\.com\/browse\/TEST-123/);
  assert.match(prBody, /\*\*Reviewer:\*\* `@octocat`/);
});

test("create_pull_requrest.sh leaves the linked issue empty when Jira inference returns nothing", (t) => {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch("feature/TEST-999-no-match");
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "skip\nskip\nSkip missing Jira issue\nLeaves the linked issue as N/A when Jira cannot find the ticket.\n\n@octocat\n"
  });

  const prBody = fs.readFileSync(bodyCopyPath, "utf8");

  assert.match(prBody, /\*\*Linked Issue:\*\* N\/A/);
  assert.match(prBody, /\*\*Reviewer:\*\* `@octocat`/);
});

test("create_pull_requrest.sh commits dirty feature branch changes before rebasing and pushing", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoWithFeatureBranch("feature/TEST-456-dirty-branch");
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");
  fs.writeFileSync(path.join(repoDir, "feature.txt"), "new feature\nwith local edit\n", "utf8");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "Capture dirty branch changes\nskip\nskip\nCommit dirty branch changes before opening the PR.\nStages and commits the local edit, then rebases and pushes before creating the PR.\n\n@octocat\n"
  });

  const branchHeadSubject = execFileSync("git", ["log", "-1", "--pretty=%s", branchName], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const localBranchRef = execFileSync("git", ["rev-parse", branchName], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const remoteBranchRef = execFileSync("git", ["rev-parse", `origin/${branchName}`], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();

  assert.match(output, /Detected uncommitted changes on feature\/TEST-456-dirty-branch/);
  assert.equal(branchHeadSubject, "Capture dirty branch changes");
  assert.equal(remoteBranchRef, localBranchRef);
  assert.equal(currentBranch, "main");
});
