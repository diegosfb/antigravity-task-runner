const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o755 });
}

function createStubEnvironment({ ghAuthOk }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-git-fallback-"));
  const binDir = path.join(rootDir, "bin");
  const logPath = path.join(rootDir, "git.log");
  fs.mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, "git"),
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -ge 3 && "$1" == "remote" && "$2" == "get-url" && "$3" == "origin" ]]; then
  printf '%s\\n' 'git@github.com:octo-org/octo-repo.git'
  exit 0
fi

printf '%s\\n' "$*" >> "${logPath}"
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
