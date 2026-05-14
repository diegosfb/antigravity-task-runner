const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "link-agentic-definitions.sh");

function makeTempWorkspace() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-link-agentic-definitions-"));
  const workspaceRoot = path.join(tempRoot, "workspace");
  fs.mkdirSync(workspaceRoot, { recursive: true });
  return { tempRoot, workspaceRoot };
}

function runScript(args, cwd) {
  return execFileSync("bash", [scriptPath, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function assertSymlink(linkPath, expectedTarget) {
  assert.ok(fs.lstatSync(linkPath).isSymbolicLink(), `${linkPath} should be a symlink`);
  assert.equal(
    fs.realpathSync(linkPath),
    fs.realpathSync(expectedTarget)
  );
}

test("links a single skill folder into all harness skill directories", () => {
  const { tempRoot, workspaceRoot } = makeTempWorkspace();
  const sourceSkill = path.join(tempRoot, "shared", "demo-skill");

  fs.mkdirSync(sourceSkill, { recursive: true });
  fs.writeFileSync(path.join(sourceSkill, "SKILL.md"), "# Demo Skill\n", "utf8");

  const output = runScript([sourceSkill], workspaceRoot);
  const expectedTarget = sourceSkill;

  assert.match(output, /created=3/);
  assertSymlink(path.join(workspaceRoot, ".agent2", "skills", "demo-skill"), expectedTarget);
  assertSymlink(path.join(workspaceRoot, ".claude2", "skills", "demo-skill"), expectedTarget);
  assertSymlink(path.join(workspaceRoot, ".codex", "skills", "demo-skill"), expectedTarget);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("links every agent in an agents collection folder", () => {
  const { tempRoot, workspaceRoot } = makeTempWorkspace();
  const agentsRoot = path.join(tempRoot, "shared", "agents");
  const writerAgent = path.join(agentsRoot, "writer-agent");
  const reviewAgent = path.join(agentsRoot, "review-agent");

  fs.mkdirSync(writerAgent, { recursive: true });
  fs.mkdirSync(reviewAgent, { recursive: true });
  fs.writeFileSync(path.join(writerAgent, "AGENT.md"), "# Writer Agent\n", "utf8");
  fs.writeFileSync(path.join(reviewAgent, "AGENT.md"), "# Review Agent\n", "utf8");

  const output = runScript([agentsRoot], workspaceRoot);

  assert.match(output, /created=6/);
  assertSymlink(path.join(workspaceRoot, ".agent2", "agents", "writer-agent"), writerAgent);
  assertSymlink(path.join(workspaceRoot, ".agent2", "agents", "review-agent"), reviewAgent);
  assertSymlink(path.join(workspaceRoot, ".claude2", "agents", "writer-agent"), writerAgent);
  assertSymlink(path.join(workspaceRoot, ".claude2", "agents", "review-agent"), reviewAgent);
  assertSymlink(path.join(workspaceRoot, ".codex", "agents", "writer-agent"), writerAgent);
  assertSymlink(path.join(workspaceRoot, ".codex", "agents", "review-agent"), reviewAgent);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("links skills and agents when a package folder contains both", () => {
  const { tempRoot, workspaceRoot } = makeTempWorkspace();
  const packageRoot = path.join(tempRoot, "shared", "my-package");
  const skillDir = path.join(packageRoot, "skills", "delivery-skill");
  const agentDir = path.join(packageRoot, "agents", "delivery-agent");

  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Delivery Skill\n", "utf8");
  fs.writeFileSync(path.join(agentDir, "AGENT.md"), "# Delivery Agent\n", "utf8");

  const output = runScript([packageRoot], workspaceRoot);

  assert.match(output, /created=6/);
  assertSymlink(path.join(workspaceRoot, ".agent2", "skills", "delivery-skill"), skillDir);
  assertSymlink(path.join(workspaceRoot, ".claude2", "skills", "delivery-skill"), skillDir);
  assertSymlink(path.join(workspaceRoot, ".codex", "skills", "delivery-skill"), skillDir);
  assertSymlink(path.join(workspaceRoot, ".agent2", "agents", "delivery-agent"), agentDir);
  assertSymlink(path.join(workspaceRoot, ".claude2", "agents", "delivery-agent"), agentDir);
  assertSymlink(path.join(workspaceRoot, ".codex", "agents", "delivery-agent"), agentDir);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("fails for unrecognized folders", () => {
  const { tempRoot, workspaceRoot } = makeTempWorkspace();
  const unknownRoot = path.join(tempRoot, "shared", "unknown");

  fs.mkdirSync(unknownRoot, { recursive: true });

  const result = spawnSync("bash", [scriptPath, unknownRoot], {
    cwd: workspaceRoot,
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a recognized skill folder, agent folder, or package folder/);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});
