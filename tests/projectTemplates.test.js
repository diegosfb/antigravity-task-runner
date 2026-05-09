const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSetupWorkspacePrompt,
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
  assert.match(prompt, /Do not modify files outside/);
});
