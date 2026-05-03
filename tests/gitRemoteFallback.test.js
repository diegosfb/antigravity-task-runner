const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o755 });
}

function createStubEnvironment({ ghAuthOk, buildGitScriptBody, gitScriptBody }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-fallback-"));
  const binDir = path.join(rootDir, "bin");
  const logPath = path.join(rootDir, "git.log");
  const resolvedGitScriptBody =
    typeof buildGitScriptBody === "function"
      ? buildGitScriptBody({ logPath })
      : (gitScriptBody ?? `printf '%s\\n' "$*" >> "${logPath}"`);
  fs.mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "git"),
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -ge 3 && "$1" == "remote" && "$2" == "get-url" && "$3" == "origin" ]]; then
  printf '%s\\n' 'git@github.com:octo-org/octo-repo.git'
  exit 0
fi

${resolvedGitScriptBody}
`
  );

  writeExecutable(
    path.join(binDir, "gh"),
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -ge 2 && "$1" == "auth" && "$2" == "status" ]]; then
  ${ghAuthOk ? "exit 0" : "exit 1"}
fi

printf '%s\\n' "$*" >> "${logPath}"
`
  );

  return { rootDir, binDir, logPath };
}

test("run_remote_git uses an HTTPS override plus gh credentials for GitHub SSH remotes", (t) => {
  const { rootDir, binDir, logPath } = createStubEnvironment({ ghAuthOk: true });
  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const helperPath = path.join(__dirname, "..", "src", "git_remote_fallback.sh");
  execFileSync(
    "bash",
    ["-c", `source ${JSON.stringify(helperPath)}; run_remote_git pull origin main`],
    {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`
      },
      stdio: "ignore"
    }
  );

  const loggedCommand = fs.readFileSync(logPath, "utf8").trim();
  assert.match(loggedCommand, /-c credential\.helper=!gh auth git-credential/);
  assert.match(loggedCommand, /-c remote\.origin\.url=https:\/\/github\.com\/octo-org\/octo-repo\.git/);
  assert.match(loggedCommand, /-c remote\.origin\.pushurl=https:\/\/github\.com\/octo-org\/octo-repo\.git/);
  assert.match(loggedCommand, /pull origin main$/);
});

test("run_remote_git falls back to the configured SSH remote when gh is unavailable", (t) => {
  const { rootDir, binDir, logPath } = createStubEnvironment({ ghAuthOk: false });
  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const helperPath = path.join(__dirname, "..", "src", "git_remote_fallback.sh");
  execFileSync(
    "bash",
    ["-c", `source ${JSON.stringify(helperPath)}; run_remote_git pull origin main`],
    {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`
      },
      stdio: "ignore"
    }
  );

  const loggedCommand = fs.readFileSync(logPath, "utf8").trim();
  assert.equal(loggedCommand, "pull origin main");
});

test("run_remote_git retries GitHub SSH remotes over HTTPS after an SSH auth failure", (t) => {
  const { rootDir, binDir, logPath } = createStubEnvironment({
    ghAuthOk: false,
    buildGitScriptBody: ({ logPath: tempLogPath }) => `
printf '%s\\n' "$*" >> "${tempLogPath}"
if [[ "$*" == "pull origin main" ]]; then
  printf '%s\\n' 'git@github.com: Permission denied (publickey).' >&2
  printf '%s\\n' 'fatal: Could not read from remote repository.' >&2
  exit 1
fi
`
  });
  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const helperPath = path.join(__dirname, "..", "src", "git_remote_fallback.sh");
  execFileSync(
    "bash",
    ["-c", `source ${JSON.stringify(helperPath)}; run_remote_git pull origin main`],
    {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`
      },
      stdio: "ignore"
    }
  );

  const loggedCommands = fs.readFileSync(logPath, "utf8").trim().split("\n");
  assert.equal(loggedCommands[0], "pull origin main");
  assert.match(loggedCommands[1], /-c remote\.origin\.url=https:\/\/github\.com\/octo-org\/octo-repo\.git/);
  assert.match(loggedCommands[1], /-c remote\.origin\.pushurl=https:\/\/github\.com\/octo-org\/octo-repo\.git/);
  assert.match(loggedCommands[1], /pull origin main$/);
});

test("run_remote_git preserves failure status and prints a recovery hint when GitHub access still fails", (t) => {
  const { rootDir, binDir, logPath } = createStubEnvironment({
    ghAuthOk: false,
    buildGitScriptBody: ({ logPath: tempLogPath }) => `
printf '%s\\n' "$*" >> "${tempLogPath}"
printf '%s\\n' 'git remote failed' >&2
exit 1
`
  });
  t.after(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const helperPath = path.join(__dirname, "..", "src", "git_remote_fallback.sh");
  let error;
  try {
    execFileSync(
      "bash",
      ["-c", `source ${JSON.stringify(helperPath)}; run_remote_git pull origin main`],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH}`
        }
      }
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error, "expected run_remote_git to exit with an error");
  assert.equal(error.status, 1);
  assert.match(error.stderr, /SSH access to GitHub failed\. Retrying with a temporary HTTPS remote\./);
  assert.match(error.stderr, /Detected a GitHub SSH remote that this machine could not use:/);
  assert.match(error.stderr, /git remote set-url origin https:\/\/github\.com\/octo-org\/octo-repo\.git/);

  const loggedCommands = fs.readFileSync(logPath, "utf8").trim().split("\n");
  assert.equal(loggedCommands.length, 2);
  assert.equal(loggedCommands[0], "pull origin main");
  assert.match(loggedCommands[1], /-c remote\.origin\.url=https:\/\/github\.com\/octo-org\/octo-repo\.git/);
  assert.match(loggedCommands[1], /pull origin main$/);
});
