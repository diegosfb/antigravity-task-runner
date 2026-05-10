const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildSetupWorkspacePrompt,
  copySetupWorkspaceGuideFiles,
  ensureSetupWorkspaceDirectories,
  normalizeProjectTemplate,
  parseProjectTemplates
} = require("../out/projectTemplates.js");

test("normalizeProjectTemplate preserves explicit description", () => {
  const template = normalizeProjectTemplate({
    name: "WebService Project",
    description: "Download URL: https://github.com/diegosfb/TestService\nInstructions: Download the latest release source code.",
    downloadUrl: "https://github.com/diegosfb/TestService",
    instructions: "Download the latest release source code."
  });

  assert.deepEqual(template, {
    name: "WebService Project",
    description: "Download URL: https://github.com/diegosfb/TestService\nInstructions: Download the latest release source code.",
    downloadUrl: "https://github.com/diegosfb/TestService",
    instructions: "Download the latest release source code."
  });
});

test("normalizeProjectTemplate builds a description when one is missing", () => {
  const template = normalizeProjectTemplate({
    name: "WebService Project",
    downloadUrl: "https://github.com/diegosfb/TestService",
    instructions: "Download the latest release source code."
  });

  assert.deepEqual(template, {
    name: "WebService Project",
    description: "Download URL: https://github.com/diegosfb/TestService\nInstructions: Download the latest release source code.",
    downloadUrl: "https://github.com/diegosfb/TestService",
    instructions: "Download the latest release source code."
  });
});

test("parseProjectTemplates requires a JSON array", () => {
  assert.throws(
    () => parseProjectTemplates(JSON.stringify({ name: "not-an-array" })),
    /JSON array/
  );
});

test("buildSetupWorkspacePrompt includes the template details and target path", () => {
  const prompt = buildSetupWorkspacePrompt(
    {
      name: "WebService Project",
      description: "Download URL: https://github.com/diegosfb/TestService",
      downloadUrl: "https://github.com/diegosfb/TestService",
      instructions: "Download the latest release source code."
    },
    "/tmp/workspace"
  );

  assert.match(prompt, /WebService Project/);
  assert.match(prompt, /https:\/\/github\.com\/diegosfb\/TestService/);
  assert.match(prompt, /Download the latest release source code\./);
  assert.match(prompt, /\/tmp\/workspace/);
  assert.match(prompt, /CLAUDE\.md, AGENTS\.md, \.agent, and \.claude/);
  assert.match(prompt, /Do not modify files outside/);
});

test("copySetupWorkspaceGuideFiles copies CLAUDE.md and AGENTS.md into the project root", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-project-template-"));
  const resourcesRoot = path.join(tempRoot, "Resources");
  const projectRoot = path.join(tempRoot, "workspace");

  fs.mkdirSync(resourcesRoot, { recursive: true });
  fs.writeFileSync(path.join(resourcesRoot, "CLAUDE.md"), "# CLAUDE\n");
  fs.writeFileSync(path.join(resourcesRoot, "AGENTS.md"), "# AGENTS\n");

  const copiedFiles = await copySetupWorkspaceGuideFiles(resourcesRoot, projectRoot);

  assert.deepEqual(copiedFiles, ["CLAUDE.md", "AGENTS.md"]);
  assert.strictEqual(
    fs.readFileSync(path.join(projectRoot, "CLAUDE.md"), "utf8"),
    "# CLAUDE\n"
  );
  assert.strictEqual(
    fs.readFileSync(path.join(projectRoot, "AGENTS.md"), "utf8"),
    "# AGENTS\n"
  );
});

test("copySetupWorkspaceGuideFiles does not overwrite existing project guide files", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-project-template-"));
  const resourcesRoot = path.join(tempRoot, "Resources");
  const projectRoot = path.join(tempRoot, "workspace");

  fs.mkdirSync(resourcesRoot, { recursive: true });
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.writeFileSync(path.join(resourcesRoot, "CLAUDE.md"), "# NEW CLAUDE\n");
  fs.writeFileSync(path.join(resourcesRoot, "AGENTS.md"), "# NEW AGENTS\n");
  fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), "# EXISTING CLAUDE\n");
  fs.writeFileSync(path.join(projectRoot, "AGENTS.md"), "# EXISTING AGENTS\n");

  const copiedFiles = await copySetupWorkspaceGuideFiles(resourcesRoot, projectRoot);

  assert.deepEqual(copiedFiles, []);
  assert.strictEqual(
    fs.readFileSync(path.join(projectRoot, "CLAUDE.md"), "utf8"),
    "# EXISTING CLAUDE\n"
  );
  assert.strictEqual(
    fs.readFileSync(path.join(projectRoot, "AGENTS.md"), "utf8"),
    "# EXISTING AGENTS\n"
  );
});

test("ensureSetupWorkspaceDirectories creates .agent and .claude in the project root", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-project-template-"));
  const projectRoot = path.join(tempRoot, "workspace");

  const createdDirectories = await ensureSetupWorkspaceDirectories(projectRoot);

  assert.deepEqual(createdDirectories, [".agent", ".claude"]);
  assert.ok(fs.statSync(path.join(projectRoot, ".agent")).isDirectory());
  assert.ok(fs.statSync(path.join(projectRoot, ".claude")).isDirectory());
});

test("ensureSetupWorkspaceDirectories does not recreate existing directories", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-project-template-"));
  const projectRoot = path.join(tempRoot, "workspace");

  fs.mkdirSync(path.join(projectRoot, ".agent"), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, ".claude"), { recursive: true });

  const createdDirectories = await ensureSetupWorkspaceDirectories(projectRoot);

  assert.deepEqual(createdDirectories, []);
  assert.ok(fs.statSync(path.join(projectRoot, ".agent")).isDirectory());
  assert.ok(fs.statSync(path.join(projectRoot, ".claude")).isDirectory());
});
