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

function createTempRepoNeedingMainMerge(branchName = "feature/TEST-789-needs-main-merge") {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch(branchName);

  execFileSync("git", ["checkout", "main"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "main-only.txt"), "main branch work\n", "utf8");
  execFileSync("git", ["add", "main-only.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Advance main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["checkout", branchName], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir, branchName };
}

function createTempRepoWithOutdatedLocalMain(branchName = "feature/TEST-654-outdated-local-main") {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch(branchName);
  const remoteDir = path.join(rootDir, "remote.git");
  const updaterDir = path.join(rootDir, "updater");

  execFileSync("git", ["clone", remoteDir, updaterDir], { stdio: "ignore" });
  execFileSync("git", ["checkout", "main"], { cwd: updaterDir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Remote Update User"], {
    cwd: updaterDir,
    stdio: "ignore"
  });
  execFileSync("git", ["config", "user.email", "remote-update@example.com"], {
    cwd: updaterDir,
    stdio: "ignore"
  });
  fs.writeFileSync(path.join(updaterDir, "remote-main.txt"), "remote main work\n", "utf8");
  execFileSync("git", ["add", "remote-main.txt"], { cwd: updaterDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Advance remote main"], { cwd: updaterDir, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "main"], { cwd: updaterDir, stdio: "ignore" });

  return { rootDir, repoDir, branchName };
}

function createTempRepoWithFeatureBranchMatchingMain(branchName = "feature/TEST-321-no-pr-diff") {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-create-pr-no-diff-"));
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

  fs.writeFileSync(path.join(repoDir, "index.js"), "console.log('base');\n", "utf8");
  execFileSync("git", ["add", "index.js"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["branch", "-M", "main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "-b", branchName], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", branchName], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "main"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "index.js"), "console.log('main advanced');\n", "utf8");
  execFileSync("git", ["add", "index.js"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Advance main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", branchName], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["merge", "--ff-only", "main"], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir, branchName };
}

function createTempRepoWithLocalMainAheadAfterFeatureMerged(
  branchName = "feature/TEST-987-local-main-drift"
) {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch(branchName);

  execFileSync("git", ["checkout", "main"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "main-only.txt"), "main branch work\n", "utf8");
  execFileSync("git", ["add", "main-only.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Advance main"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", branchName], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["merge", "--no-edit", "main"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", "main"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "local-main-only.txt"), "local-only main work\n", "utf8");
  execFileSync("git", ["add", "local-main-only.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Advance local main only"], { cwd: repoDir, stdio: "ignore" });

  execFileSync("git", ["checkout", branchName], { cwd: repoDir, stdio: "ignore" });

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
  input,
  env = {}
}) {
  const scriptPath = path.join(__dirname, "..", "src", "create_pull_requrest.sh");
  return execFileSync("bash", [scriptPath], {
    cwd: repoDir,
    encoding: "utf8",
    input,
    env: {
      ...process.env,
      ...env,
      PATH: `${binDir}:${process.env.PATH}`
    }
  });
}

function assertNoManualPrSummaryPrompts(output) {
  assert.doesNotMatch(output, /What problem does this PR solve/);
  assert.doesNotMatch(output, /Briefly describe your technical approach/);
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
    input: "skip\n\n@octocat\n"
  });

  const prBody = fs.readFileSync(bodyCopyPath, "utf8");

  assert.match(output, /Creating the pull request on GitHub\./);
  assert.doesNotMatch(output, /What command runs your project's build or validation step/);
  assertNoManualPrSummaryPrompts(output);
  assert.match(output, /Drafted the PR summary automatically from the branch commits\./);
  assert.match(prBody, /\*\*Why:\*\*\nAdd feature branch changes/);
  assert.match(prBody, /feature\.txt/);
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
    input: "skip\n\n@octocat\n"
  });

  const prBody = fs.readFileSync(bodyCopyPath, "utf8");

  assert.match(prBody, /\*\*Linked Issue:\*\* N\/A/);
  assert.match(prBody, /\*\*Why:\*\*\nAdd feature branch changes/);
  assert.match(prBody, /\*\*Reviewer:\*\* `@octocat`/);
});

test("create_pull_requrest.sh uses the configured Project Testing Command before prompting", (t) => {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch("feature/TEST-456-saved-test-command");
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  const testMarkerPath = path.join(rootDir, "saved-test-command.log");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");
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

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "\n@octocat\n",
    env: {
      ANTIGRAVITY_PROJECT_TESTING_COMMAND: "saved-project-tests"
    }
  });

  assert.match(output, /Using Project Testing Command from settings\./);
  assert.doesNotMatch(output, /What command runs your project's test suite/);
  assertNoManualPrSummaryPrompts(output);
  assert.equal(fs.readFileSync(testMarkerPath, "utf8"), "used\n");
});

test("create_pull_requrest.sh commits dirty feature branch changes before pushing", (t) => {
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
    input: "Capture dirty branch changes\nskip\n\n@octocat\n"
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
  assertNoManualPrSummaryPrompts(output);
  assert.equal(branchHeadSubject, "Capture dirty branch changes");
  assert.equal(remoteBranchRef, localBranchRef);
  assert.equal(currentBranch, "main");
});

test("create_pull_requrest.sh stops when local main needs updates from origin/main", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoWithOutdatedLocalMain();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  try {
    runCreatePullRequestScript({
      repoDir,
      binDir,
      input: ""
    });
    assert.fail("Expected the PR creation script to stop when local main is behind origin/main.");
  } catch (error) {
    const combinedOutput = `${error.stdout ?? ""}${error.stderr ?? ""}`;

    assert.equal(error.status, 1);
    assert.match(combinedOutput, /Local main is missing commits from origin\/main\./);
    assert.match(combinedOutput, /Create Pull Request will not update or merge main automatically\./);
    assert.match(combinedOutput, /Run 'Pull Remote and merge' first/);
    assert.ok(combinedOutput.includes(`Stay on ${branchName}`));
    assert.doesNotMatch(combinedOutput, /What command runs your project's test suite/);
    assert.ok(!fs.existsSync(bodyCopyPath));
    assert.ok(!fs.existsSync(ghLogPath));
    const currentBranch = execFileSync("git", ["branch", "--show-current"], {
      cwd: repoDir,
      encoding: "utf8"
    }).trim();
    assert.equal(currentBranch, branchName);
  }
});

test("create_pull_requrest.sh stops when the feature branch still needs the latest origin/main merge", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoNeedingMainMerge();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  try {
    runCreatePullRequestScript({
      repoDir,
      binDir,
      input: ""
    });
    assert.fail("Expected the PR creation script to stop when the feature branch does not include main.");
  } catch (error) {
    const combinedOutput = `${error.stdout ?? ""}${error.stderr ?? ""}`;

    assert.equal(error.status, 1);
    assert.match(combinedOutput, new RegExp(`${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} does not include the latest origin/main commits\\.`));
    assert.match(combinedOutput, /Create Pull Request will not merge main automatically\./);
    assert.match(combinedOutput, new RegExp(`Run 'Pull Remote and merge' first so the latest origin/main changes are pulled locally and merged into ${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`));
    assert.doesNotMatch(combinedOutput, /What command runs your project's test suite/);
    assert.ok(!fs.existsSync(bodyCopyPath));
    assert.ok(!fs.existsSync(ghLogPath));
    const currentBranch = execFileSync("git", ["branch", "--show-current"], {
      cwd: repoDir,
      encoding: "utf8"
    }).trim();
    assert.equal(currentBranch, branchName);
  }
});

test("create_pull_requrest.sh allows PR creation when the feature branch already includes origin/main", (t) => {
  const { rootDir, repoDir, branchName } =
    createTempRepoWithLocalMainAheadAfterFeatureMerged();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "skip\n\n@octocat\n"
  });

  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();

  assert.match(output, new RegExp(`Verified that ${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} already contains the latest origin/main commits\\.`));
  assert.match(output, /Creating the pull request on GitHub\./);
  assertNoManualPrSummaryPrompts(output);
  assert.ok(fs.existsSync(bodyCopyPath));
  assert.ok(fs.existsSync(ghLogPath));
  assert.equal(currentBranch, "main");
});

test("create_pull_requrest.sh stops before prompting when the feature branch has no commits beyond main", (t) => {
  const { rootDir, repoDir, branchName } = createTempRepoWithFeatureBranchMatchingMain();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createNodeStub(binDir, "");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  try {
    runCreatePullRequestScript({
      repoDir,
      binDir,
      input: "skip\n"
    });
    assert.fail("Expected the PR creation script to stop when there are no commits to open a PR for.");
  } catch (error) {
    const combinedOutput = `${error.stdout ?? ""}${error.stderr ?? ""}`;

    assert.equal(error.status, 1);
    assert.match(combinedOutput, /There are no commits on feature\/TEST-321-no-pr-diff that are not already on main\./);
    assert.match(combinedOutput, /GitHub cannot create a pull request when there are no commits between the base and head branches\./);
    assert.match(combinedOutput, /Run 'git log --oneline main\.\.feature\/TEST-321-no-pr-diff'\./);
    assert.doesNotMatch(combinedOutput, /What problem does this PR solve/);
    assert.ok(!fs.existsSync(bodyCopyPath));
    assert.ok(!fs.existsSync(ghLogPath));
    const currentBranch = execFileSync("git", ["branch", "--show-current"], {
      cwd: repoDir,
      encoding: "utf8"
    }).trim();
    assert.equal(currentBranch, branchName);
  }
});
