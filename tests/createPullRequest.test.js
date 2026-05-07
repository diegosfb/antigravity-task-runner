const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o755 });
}

function createTempRepoWithFeatureBranch() {
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

  execFileSync("git", ["checkout", "-b", "feature/test-pr"], { cwd: repoDir, stdio: "ignore" });
  fs.writeFileSync(path.join(repoDir, "README.md"), "hello\nfeature branch change\n", "utf8");
  fs.writeFileSync(path.join(repoDir, "feature.txt"), "new feature\n", "utf8");
  execFileSync("git", ["add", "README.md", "feature.txt"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "Add feature branch changes"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["push", "-u", "origin", "feature/test-pr"], { cwd: repoDir, stdio: "ignore" });

  return { rootDir, repoDir };
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

function createClaudeStub(binDir, responseText, promptLogPath) {
  writeExecutable(
    path.join(binDir, "claude"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" > ${JSON.stringify(promptLogPath)}
cat <<'EOF'
${responseText}
EOF
`
  );
}

function createFailingClaudeStub(binDir) {
  writeExecutable(
    path.join(binDir, "claude"),
    `#!/usr/bin/env bash
set -euo pipefail
exit 1
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

test("create_pull_requrest.sh uses Claude to draft Why/How and defaults the reviewer", (t) => {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  const claudePromptLogPath = path.join(rootDir, "claude-prompt.log");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createClaudeStub(
    binDir,
    `WHY_START
Make pull request creation faster by pre-filling the reviewer and PR summary.
WHY_END
HOW_START
Adds a configurable default reviewer, passes it into the PR creation script, and uses Claude to draft the Why and How from the branch diff before opening the PR.
HOW_END`,
    claudePromptLogPath
  );

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "skip\n\n\n\n",
    env: {
      ANTIGRAVITY_DEFAULT_GITHUB_REVIEWER: "@diegosfb"
    }
  });

  const ghCreateCommand = fs.readFileSync(ghLogPath, "utf8").trim();
  const prBody = fs.readFileSync(bodyCopyPath, "utf8");
  const claudePrompt = fs.readFileSync(claudePromptLogPath, "utf8");

  assert.match(output, /Claude drafted the PR summary automatically\./);
  assert.match(ghCreateCommand, /--reviewer diegosfb$/);
  assert.match(prBody, /\*\*Why:\*\*\nMake pull request creation faster by pre-filling the reviewer and PR summary\./);
  assert.match(prBody, /\*\*How:\*\*\nAdds a configurable default reviewer, passes it into the PR creation script, and uses Claude to draft the Why and How from the branch diff before opening the PR\./);
  assert.match(prBody, /\*\*Reviewer:\*\* `@diegosfb`/);
  assert.match(claudePrompt, /Return only the following exact marker blocks and nothing else:/);
});

test("create_pull_requrest.sh falls back to manual PR copy when Claude is unavailable", (t) => {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createFailingClaudeStub(binDir);

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "skip\nManual why from the user\nManual how from the user\n\n\n@octocat\n",
    env: {
      ANTIGRAVITY_DEFAULT_GITHUB_REVIEWER: "@diegosfb"
    }
  });

  const ghCreateCommand = fs.readFileSync(ghLogPath, "utf8").trim();
  const prBody = fs.readFileSync(bodyCopyPath, "utf8");

  assert.match(output, /Claude could not draft the PR summary automatically, so let's fill it in manually\./);
  assert.match(ghCreateCommand, /--reviewer octocat$/);
  assert.match(prBody, /\*\*Why:\*\*\nManual why from the user/);
  assert.match(prBody, /\*\*How:\*\*\nManual how from the user/);
  assert.match(prBody, /\*\*Reviewer:\*\* `@octocat`/);
});

test("create_pull_requrest.sh commits pending changes before opening the PR", (t) => {
  const { rootDir, repoDir } = createTempRepoWithFeatureBranch();
  const binDir = path.join(rootDir, "bin");
  const ghLogPath = path.join(rootDir, "gh-pr-create.log");
  const bodyCopyPath = path.join(rootDir, "pr-body.md");
  const claudePromptLogPath = path.join(rootDir, "claude-prompt.log");
  fs.mkdirSync(binDir, { recursive: true });
  createGhStub(binDir, ghLogPath, bodyCopyPath);
  createClaudeStub(
    binDir,
    `WHY_START
Capture the last local changes before opening the pull request.
WHY_END
HOW_START
Commits the dirty working tree first, then syncs main into the feature branch and opens the pull request with the updated diff.
HOW_END`,
    claudePromptLogPath
  );

  fs.writeFileSync(path.join(repoDir, "README.md"), "hello\nfeature branch change\npending update\n", "utf8");
  fs.writeFileSync(path.join(repoDir, "pending-change.txt"), "waiting to be committed\n", "utf8");

  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const output = runCreatePullRequestScript({
    repoDir,
    binDir,
    input: "Capture pending PR changes\nskip\n\n\n\n",
    env: {
      ANTIGRAVITY_DEFAULT_GITHUB_REVIEWER: "@diegosfb"
    }
  });

  const lastCommitMessage = execFileSync("git", ["log", "-1", "--pretty=%s"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();
  const pendingFileAtHead = execFileSync("git", ["show", "HEAD:pending-change.txt"], {
    cwd: repoDir,
    encoding: "utf8"
  });
  const readmeAtHead = execFileSync("git", ["show", "HEAD:README.md"], {
    cwd: repoDir,
    encoding: "utf8"
  });
  const statusOutput = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoDir,
    encoding: "utf8"
  }).trim();

  assert.match(output, /Detected uncommitted changes on feature\/test-pr\./);
  assert.equal(lastCommitMessage, "Capture pending PR changes");
  assert.equal(pendingFileAtHead, "waiting to be committed\n");
  assert.equal(readmeAtHead, "hello\nfeature branch change\npending update\n");
  assert.equal(statusOutput, "");
});
