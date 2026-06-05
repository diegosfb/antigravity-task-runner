const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

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
  const values = backlogItemCompleted.getDefaultBacklogItemCompletedValues(" TASK ", "/tmp/workspace");

  assert.deepEqual(values, {
    backlogDir: "/tmp/workspace/docs/backlog",
    backlogItemPath: "",
    issueKey: "",
    projectKey: "TASK",
    useJira: true
  });
});

test("sanitizeBacklogItemCompletedFormValues trims payload values", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const values = backlogItemCompleted.sanitizeBacklogItemCompletedFormValues(
    {
      backlogDir: " /tmp/custom-backlog ",
      backlogItemPath: " /tmp/custom-backlog/task-demo.md ",
      issueKey: " TASK-123 ",
      projectKey: " TASK ",
      useJira: false
    },
    "OTHER",
    "/tmp/workspace"
  );

  assert.deepEqual(values, {
    backlogDir: "/tmp/custom-backlog",
    backlogItemPath: "/tmp/custom-backlog/task-demo.md",
    issueKey: "TASK-123",
    projectKey: "TASK",
    useJira: false
  });
});

test("getMissingBacklogItemCompletedFields requires a project and one target when Jira is enabled", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const missing = backlogItemCompleted.getMissingBacklogItemCompletedFields({
    backlogDir: "",
    backlogItemPath: "",
    issueKey: "",
    projectKey: "",
    useJira: true
  });

  assert.deepEqual(missing, ["Jira Project", "Assigned Jira item or local backlog item"]);
});

test("getMissingBacklogItemCompletedFields only requires a local backlog item when Jira is disabled", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const missing = backlogItemCompleted.getMissingBacklogItemCompletedFields({
    backlogDir: "",
    backlogItemPath: "",
    issueKey: "TASK-123",
    projectKey: "TASK",
    useJira: false
  });

  assert.deepEqual(missing, ["Local backlog item"]);
});

test("loadBacklogItemsForCompletion keeps To Do, In Progress, and missing-status files", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backlog-item-completed-"));

  fs.writeFileSync(
    path.join(tempDir, "feature-alpha.md"),
    "# Feature: Alpha\n\n## Description\nShip alpha.\n\n## Status\nTo Do\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(tempDir, "feature-beta.md"),
    "# Feature: Beta\n\n## Description\nShip beta.\n\n## Status\nIn Review\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(tempDir, "feature-gamma.md"),
    "# Feature: Gamma\n\n## Description\nShip gamma.\n",
    "utf8"
  );

  const items = backlogItemCompleted.loadBacklogItemsForCompletion(tempDir);

  assert.deepEqual(
    items.map((item) => ({ fileName: item.fileName, statusName: item.statusName })),
    [
      { fileName: "feature-alpha.md", statusName: "To Do" },
      { fileName: "feature-gamma.md", statusName: "" }
    ]
  );
});

test("findMatching helpers compare Jira descriptions with backlog description sections", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const backlogItems = [
    {
      description: "- First line\n- Second line",
      displayName: "Feature: Matching Item",
      fileName: "feature-matching-item.md",
      filePath: "/tmp/feature-matching-item.md",
      statusName: "To Do"
    }
  ];
  const issues = [
    {
      description: "First line\nSecond line",
      id: "1",
      issueTypeName: "Story",
      key: "TASK-1",
      projectKey: "TASK",
      projectName: "Task Runner",
      statusName: "To Do",
      summary: "Matching Jira issue"
    }
  ];

  assert.equal(
    backlogItemCompleted.findMatchingBacklogItemForJiraIssue(issues[0], backlogItems)?.filePath,
    "/tmp/feature-matching-item.md"
  );
  assert.equal(
    backlogItemCompleted.findMatchingJiraIssueForBacklogItem(backlogItems[0], issues)?.key,
    "TASK-1"
  );
});

test("findMatching helpers fall back to Jira summary and backlog title when descriptions are empty", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const backlogItems = [
    {
      description: "",
      displayName: "Epic: Test Item",
      fileName: "epic-test-item.md",
      filePath: "/tmp/epic-test-item.md",
      statusName: "To Do"
    }
  ];
  const issues = [
    {
      description: "",
      id: "17",
      issueTypeName: "Epic",
      key: "ANTIGRAVIT-17",
      projectKey: "ANTIGRAVIT",
      projectName: "Antigravity",
      statusName: "In Progress",
      summary: "Test Item"
    }
  ];

  assert.equal(
    backlogItemCompleted.findMatchingBacklogItemForJiraIssue(issues[0], backlogItems)?.filePath,
    "/tmp/epic-test-item.md"
  );
  assert.equal(
    backlogItemCompleted.findMatchingJiraIssueForBacklogItem(backlogItems[0], issues)?.key,
    "ANTIGRAVIT-17"
  );
});

test("upsertBacklogItemCompletedStatus updates an existing status section", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const updated = backlogItemCompleted.upsertBacklogItemCompletedStatus(
    "# Feature: Alpha\n\n## Description\nShip alpha.\n\n## Status\nTo Do\n\n## Notes\nKeep note.\n"
  );

  assert.match(updated, /## Status\nIn Review\n\n## Notes/);
});

test("upsertBacklogItemCompletedStatus creates a status section when missing", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const updated = backlogItemCompleted.upsertBacklogItemCompletedStatus(
    "# Feature: Alpha\n\n## Description\nShip alpha.\n"
  );

  assert.match(updated, /## Status\nIn Review\n$/);
});

test("renderBacklogItemCompletedHtml renders the page structure and issue details", () => {
  const backlogItemCompleted = setupBacklogItemCompletedModule();
  const html = backlogItemCompleted.renderBacklogItemCompletedHtml(
    { cspSource: "vscode-resource:" },
    {
      backlogDir: "/tmp/workspace/docs/backlog",
      backlogItemPath: "/tmp/workspace/docs/backlog/feature-second-item.md",
      issueKey: "TASK-2",
      projectKey: "TASK",
      useJira: true
    },
    [
      {
        description: "First item description",
        id: "1",
        key: "TASK-1",
        summary: "First item",
        projectKey: "TASK",
        projectName: "Task Project",
        issueTypeName: "Story",
        statusName: "In Progress"
      },
      {
        description: "Second item description",
        id: "2",
        key: "TASK-2",
        summary: "Second item",
        projectKey: "TASK",
        projectName: "Task Project",
        issueTypeName: "Bug",
        statusName: "To Do"
      }
    ],
    [
      {
        description: "Second item description",
        displayName: "Feature: Second Item",
        fileName: "feature-second-item.md",
        filePath: "/tmp/workspace/docs/backlog/feature-second-item.md",
        statusName: "In Progress"
      }
    ]
  );

  assert.match(html, /Backlog Item Completed/);
  assert.match(html, /Backlog Folder/);
  assert.match(html, /Item to Mark Completed/);
  assert.match(html, /Use Jira/);
  assert.match(html, /loadBacklogItemCompletedBacklogItems/);
  assert.match(html, /saveBacklogItemCompletedDraft/);
  assert.match(html, /Mark Completed/);
  assert.match(html, /<span class="detail-label">Jira Project<\/span>/);
  assert.match(html, /id="useJira"/);
  assert.ok(html.includes('replace(/^[^:]+: */, "")'));
  assert.match(html, /<option value="TASK-2" selected>TASK-2 - Second item<\/option>/);
  assert.match(html, /feature-second-item\.md/);
  assert.match(
    html,
    /Selected Jira items move to In Review, or Done when review is unavailable\. Selected local backlog files get a Status of In Review\./
  );
});
