const test = require("node:test");
const assert = require("node:assert/strict");

function createVscodeMock() {
  return {};
}

function setupBacklogItemCompletedModule() {
  const Module = require("module");
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === "vscode") return createVscodeMock();
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve("../out/backlogItemCompleted.js")];
  const moduleExports = require("../out/backlogItemCompleted.js");
  Module.prototype.require = originalRequire;
  return moduleExports;
}

test("getDefaultBacklogItemCompletedValues uses the provided project key", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const values = backlogItemCompleted.getDefaultBacklogItemCompletedValues(" TASK ");

  assert.deepEqual(values, {
    issueKey: "",
    projectKey: "TASK"
  });
});

test("sanitizeBacklogItemCompletedFormValues trims payload values", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const values = backlogItemCompleted.sanitizeBacklogItemCompletedFormValues(
    {
      issueKey: " TASK-123 ",
      projectKey: " TASK "
    },
    "OTHER"
  );

  assert.deepEqual(values, {
    issueKey: "TASK-123",
    projectKey: "TASK"
  });
});

test("getMissingBacklogItemCompletedFields requires both project and backlog item", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const missing = backlogItemCompleted.getMissingBacklogItemCompletedFields({
    issueKey: "",
    projectKey: ""
  });

  assert.deepEqual(missing, ["Jira Project", "Backlog Item"]);
});

test("renderBacklogItemCompletedHtml renders the page structure and issue details", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const html = backlogItemCompleted.renderBacklogItemCompletedHtml(
    { cspSource: "vscode-resource:" },
    {
      issueKey: "TASK-2",
      projectKey: "TASK"
    },
    [
      {
        id: "1",
        key: "TASK-1",
        summary: "First item",
        projectKey: "TASK",
        projectName: "Task Project",
        issueTypeName: "Story",
        statusName: "In Progress"
      },
      {
        id: "2",
        key: "TASK-2",
        summary: "Second item",
        projectKey: "TASK",
        projectName: "Task Project",
        issueTypeName: "Bug",
        statusName: "To Do"
      }
    ]
  );

  assert.match(html, /Backlog Item Completed/);
  assert.match(html, /saveBacklogItemCompletedDraft/);
  assert.match(html, /Mark Completed/);
  assert.match(html, /<span class="detail-label">Jira Project<\/span>/);
  assert.match(html, /<option value="TASK-2" selected>TASK-2 - Second item<\/option>/);
  assert.match(html, /The selected item will move to In Review, or Done when review is unavailable\./);
});
