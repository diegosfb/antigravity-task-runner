const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const {
  createJiraProject,
  INVALID_JIRA_TOKEN_MESSAGE,
  searchOpenTodoJiraIssuesForProject,
  searchOpenUnassignedTodoJiraIssuesForAssignment,
  transitionJiraIssueToReviewOrDone,
  transitionJiraIssueToStatus,
  validateJiraCredentials
} = require("../out/jira.js");

function readJsonBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      resolve(body ? JSON.parse(body) : null);
    });
  });
}

test("validateJiraCredentials accepts a valid Jira API token", async (t) => {
  let capturedAuthorizationHeader = null;

  const server = http.createServer((request, response) => {
    if (request.url === "/rest/api/3/myself" && request.method === "GET") {
      capturedAuthorizationHeader = request.headers.authorization;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ accountId: "account-123" }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ errorMessages: ["Unexpected endpoint"] }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  await validateJiraCredentials({
    baseUrl: `http://127.0.0.1:${port}`,
    email: "person@example.com",
    apiToken: "secret-token"
  });

  assert.equal(
    capturedAuthorizationHeader,
    `Basic ${Buffer.from("person@example.com:secret-token").toString("base64")}`
  );
});

test("validateJiraCredentials tells the user to update settings when the Jira API token is invalid", async (t) => {
  const server = http.createServer((request, response) => {
    if (request.url === "/rest/api/3/myself" && request.method === "GET") {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ errorMessages: ["Unauthorized"] }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ errorMessages: ["Unexpected endpoint"] }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  await assert.rejects(
    () =>
      validateJiraCredentials({
        baseUrl: `http://127.0.0.1:${port}`,
        email: "person@example.com",
        apiToken: "stale-token"
      }),
    (error) => {
      assert.equal(error.message, INVALID_JIRA_TOKEN_MESSAGE);
      return true;
    }
  );
});

test("createJiraProject creates and configures a team-managed kanban Jira software project", async (t) => {
  let capturedCreateRequest = null;
  let capturedWorkflowReadRequest = null;
  let capturedWorkflowUpdateRequest = null;
  let capturedBoardColumnsUpdateRequest = null;
  const capturedRoleActorPosts = [];
  const capturedRoleActorDeletes = [];

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");

    if (request.url === "/rest/api/3/myself" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ accountId: "lead-account-id" }));
      return;
    }

    if (request.url === "/rest/api/3/project" && request.method === "POST") {
      capturedCreateRequest = {
        headers: request.headers,
        body: await readJsonBody(request)
      };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ id: "10000", key: "TASK" }));
      return;
    }

    if (
      request.url ===
        "/rest/api/3/project/TASK/roledetails?excludeConnectAddons=true&excludeOtherServiceRoles=true" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify([
          {
            admin: true,
            id: 1001,
            name: "Administrators",
            roleConfigurable: true,
            translatedName: "Administrators"
          },
          {
            admin: false,
            default: true,
            id: 1002,
            name: "Members",
            roleConfigurable: true,
            translatedName: "Members"
          },
          {
            admin: false,
            id: 1003,
            name: "Viewers",
            roleConfigurable: true,
            translatedName: "Viewers"
          }
        ])
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/role/1001" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          actors: [
            {
              actorGroup: {
                groupId: "legacy-admin-group-id",
                name: "legacy-admins"
              },
              name: "legacy-admins",
              type: "atlassian-group-role-actor"
            }
          ],
          id: 1001,
          name: "Administrators"
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/role/1002" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          actors: [],
          id: 1002,
          name: "Members"
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/role/1003" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          actors: [
            {
              actorGroup: {
                groupId: "all-users-group-id",
                name: "all-users"
              },
              name: "all-users",
              type: "atlassian-group-role-actor"
            }
          ],
          id: 1003,
          name: "Viewers"
        })
      );
      return;
    }

    if (request.url.startsWith("/rest/api/3/project/TASK/role/") && request.method === "DELETE") {
      capturedRoleActorDeletes.push(request.url);
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.url.startsWith("/rest/api/3/project/TASK/role/") && request.method === "POST") {
      capturedRoleActorPosts.push({
        path: request.url,
        body: await readJsonBody(request)
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (
      request.url === "/rest/api/3/issue/createmeta/TASK/issuetypes" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          issueTypes: [
            { id: "10001", name: "Task" },
            { id: "10002", name: "Story" },
            { id: "10003", name: "Sub-task" }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/workflows" && request.method === "POST") {
      capturedWorkflowReadRequest = {
        body: await readJsonBody(request)
      };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          statuses: [
            {
              description: "Initial work state",
              id: "1",
              name: "To Do",
              statusCategory: "TODO",
              statusReference: "todo-status"
            },
            {
              description: "Work is happening",
              id: "2",
              name: "In Progress",
              statusCategory: "IN_PROGRESS",
              statusReference: "in-progress-status"
            },
            {
              description: "Work is complete",
              id: "3",
              name: "Done",
              statusCategory: "DONE",
              statusReference: "done-status"
            }
          ],
          workflows: [
            {
              description: "Project workflow",
              id: "workflow-1",
              name: "Project workflow",
              scope: {
                project: { id: "10000" },
                type: "PROJECT"
              },
              startPointLayout: { x: 0, y: 0 },
              statuses: [
                {
                  layout: { x: 100, y: 200 },
                  properties: {},
                  statusReference: "todo-status"
                },
                {
                  layout: { x: 300, y: 200 },
                  properties: {},
                  statusReference: "in-progress-status"
                },
                {
                  layout: { x: 500, y: 200 },
                  properties: {},
                  statusReference: "done-status"
                }
              ],
              transitions: [
                {
                  actions: [],
                  description: "Create the issue",
                  id: "1",
                  links: [],
                  name: "Create",
                  properties: {},
                  toStatusReference: "todo-status",
                  triggers: [],
                  type: "INITIAL",
                  validators: []
                },
                {
                  actions: [],
                  description: "Start work",
                  id: "21",
                  links: [
                    {
                      fromPort: 0,
                      fromStatusReference: "todo-status",
                      toPort: 0
                    }
                  ],
                  name: "Start Progress",
                  properties: {},
                  toStatusReference: "in-progress-status",
                  triggers: [],
                  type: "DIRECTED",
                  validators: []
                },
                {
                  actions: [],
                  description: "Finish work",
                  id: "31",
                  links: [
                    {
                      fromPort: 0,
                      fromStatusReference: "in-progress-status",
                      toPort: 0
                    }
                  ],
                  name: "Done",
                  properties: {},
                  toStatusReference: "done-status",
                  triggers: [],
                  type: "DIRECTED",
                  validators: []
                }
              ],
              version: {
                id: "workflow-version-1",
                versionNumber: 1
              }
            }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/workflows/update" && request.method === "POST") {
      capturedWorkflowUpdateRequest = {
        body: await readJsonBody(request)
      };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ workflows: [] }));
      return;
    }

    if (
      requestUrl.pathname === "/rest/agile/1.0/board" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("projectKeyOrId") === "TASK" &&
      requestUrl.searchParams.get("type") === "kanban"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          values: [{ id: 176, name: "Task Runner Board", type: "kanban" }]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/statuses" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify([
          {
            id: "10001",
            name: "Task",
            statuses: [
              { id: "10001", name: "To Do" },
              { id: "10002", name: "In Progress" },
              { id: "10004", name: "In Review" },
              { id: "10005", name: "Done" }
            ]
          },
          {
            id: "10002",
            name: "Story",
            statuses: [
              { id: "10001", name: "To Do" },
              { id: "10002", name: "In Progress" },
              { id: "10004", name: "In Review" },
              { id: "10005", name: "Done" }
            ]
          }
        ])
      );
      return;
    }

    if (
      requestUrl.pathname === "/rest/greenhopper/1.0/rapidviewconfig/editmodel" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("rapidViewId") === "176"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          currentStatisticsField: { id: "none_" },
          mappedColumns: [
            {
              isKanPlanColumn: false,
              mappedStatuses: [{ id: "10001" }],
              name: "To Do"
            },
            {
              isKanPlanColumn: false,
              mappedStatuses: [{ id: "10002" }],
              name: "In Progress"
            },
            {
              isKanPlanColumn: false,
              mappedStatuses: [{ id: "10005" }],
              name: "Done"
            }
          ],
          rapidViewId: 176
        })
      );
      return;
    }

    if (request.url === "/rest/greenhopper/1.0/rapidviewconfig/columns" && request.method === "PUT") {
      capturedBoardColumnsUpdateRequest = {
        body: await readJsonBody(request)
      };
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const createdProject = await createJiraProject(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    {
      key: "TASK",
      name: "Task Runner",
      description: "Created from the extension"
    }
  );

  assert.equal(createdProject.id, "10000");
  assert.equal(createdProject.key, "TASK");
  assert.equal(createdProject.warnings.length, 1);
  assert.ok(
    createdProject.warnings.includes(
      "Jira still requires a manual access-level check. Verify project member and admin roles in your Jira settings."
    )
  );

  assert.ok(capturedCreateRequest, "expected the project creation request to be captured");
  assert.match(
    capturedCreateRequest.headers.authorization ?? "",
    /^Basic\s+/,
    "expected Jira auth to be sent"
  );
  assert.equal(capturedCreateRequest.body.assigneeType, "PROJECT_LEAD");
  assert.equal(capturedCreateRequest.body.leadAccountId, "lead-account-id");
  assert.equal(capturedCreateRequest.body.projectTypeKey, "software");
  assert.equal(
    capturedCreateRequest.body.projectTemplateKey,
    "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban"
  );

  assert.deepEqual(
    capturedRoleActorDeletes.sort(),
    [
      "/rest/api/3/project/TASK/role/1001?groupId=legacy-admin-group-id",
      "/rest/api/3/project/TASK/role/1003?groupId=all-users-group-id"
    ].sort()
  );
  assert.deepEqual(capturedRoleActorPosts, [
    {
      path: "/rest/api/3/project/TASK/role/1001",
      body: { group: ["site-admins"] }
    },
    {
      path: "/rest/api/3/project/TASK/role/1001",
      body: { user: ["lead-account-id"] }
    }
  ]);

  assert.ok(capturedWorkflowReadRequest, "expected the workflow read request to be captured");
  assert.deepEqual(capturedWorkflowReadRequest.body.projectAndIssueTypes, [
    { projectId: "10000", issueTypeId: "10001" },
    { projectId: "10000", issueTypeId: "10002" }
  ]);

  assert.ok(capturedWorkflowUpdateRequest, "expected the workflow update request to be captured");
  const inReviewStatus = capturedWorkflowUpdateRequest.body.statuses.find(
    (status) => status.name === "In Review"
  );
  assert.ok(inReviewStatus, "expected the workflow update to add the In Review status");
  assert.match(
    inReviewStatus.statusReference,
    /^[0-9a-f-]{36}$/i,
    "expected In Review to use a stable UUID status reference"
  );

  const updatedWorkflow = capturedWorkflowUpdateRequest.body.workflows[0];
  assert.ok(
    updatedWorkflow.statuses.some(
      (status) => status.statusReference === inReviewStatus.statusReference
    ),
    "expected the updated workflow to reference In Review"
  );
  const inReviewLayout = updatedWorkflow.statuses.find(
    (status) => status.statusReference === inReviewStatus.statusReference
  )?.layout;
  assert.deepEqual(
    inReviewLayout,
    { x: 400, y: 200 },
    "expected In Review to be laid out between In Progress and Done"
  );
  assert.ok(
    updatedWorkflow.transitions.some(
      (transition) =>
        transition.name === "In Review" &&
        transition.type === "GLOBAL" &&
        transition.toStatusReference === inReviewStatus.statusReference
    ),
    "expected a global transition into In Review"
  );
  assert.ok(
    updatedWorkflow.transitions.some(
      (transition) =>
        transition.type === "DIRECTED" &&
        transition.toStatusReference === "done-status" &&
        transition.links.some(
          (link) => link.fromStatusReference === inReviewStatus.statusReference
        )
    ),
    "expected a path from In Review to Done"
  );

  assert.ok(
    capturedBoardColumnsUpdateRequest,
    "expected the board columns update request to be captured"
  );
  assert.deepEqual(capturedBoardColumnsUpdateRequest.body, {
    currentStatisticsField: { id: "none_" },
    mappedColumns: [
      {
        isKanPlanColumn: false,
        mappedStatuses: [{ id: "10001" }],
        name: "To Do"
      },
      {
        isKanPlanColumn: false,
        mappedStatuses: [{ id: "10002" }],
        name: "In Progress"
      },
      {
        isKanPlanColumn: false,
        mappedStatuses: [{ id: "10004" }],
        name: "In Review"
      },
      {
        isKanPlanColumn: false,
        mappedStatuses: [{ id: "10005" }],
        name: "Done"
      }
    ],
    rapidViewId: 176
  });
});

test("searchOpenUnassignedTodoJiraIssuesForAssignment filters out blocked and off-project items", async (t) => {
  let capturedSearchRequest = null;

  const server = http.createServer(async (request, response) => {
    if (request.url === "/rest/api/3/search/jql" && request.method === "POST") {
      capturedSearchRequest = await readJsonBody(request);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          issues: [
            {
              id: "10001",
              key: "TASK-1",
              fields: {
                summary: "Blocked by unfinished work",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" },
                issuelinks: [
                  {
                    type: {
                      inward: "is blocked by",
                      name: "Blocks",
                      outward: "blocks"
                    },
                    inwardIssue: {
                      id: "10011",
                      key: "TASK-11",
                      fields: {
                        status: { name: "In Progress" }
                      }
                    }
                  }
                ]
              }
            },
            {
              id: "10002",
              key: "TASK-2",
              fields: {
                summary: "Blocked by reviewed work",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" },
                issuelinks: [
                  {
                    type: {
                      inward: "is blocked by",
                      name: "Blocks",
                      outward: "blocks"
                    },
                    inwardIssue: {
                      id: "10012",
                      key: "TASK-12",
                      fields: {
                        status: { name: "In Review" }
                      }
                    }
                  }
                ]
              }
            },
            {
              id: "10003",
              key: "TASK-3",
              fields: {
                summary: "Unblocked issue",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" },
                issuelinks: []
              }
            },
            {
              id: "10004",
              key: "TASK-4",
              fields: {
                summary: "Blocks another issue but is not blocked itself",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" },
                issuelinks: [
                  {
                    type: {
                      inward: "is blocked by",
                      name: "Blocks",
                      outward: "blocks"
                    },
                    outwardIssue: {
                      id: "10014",
                      key: "TASK-14",
                      fields: {
                        status: { name: "To Do" }
                      }
                    }
                  }
                ]
              }
            },
            {
              id: "10005",
              key: "TASK-5",
              fields: {
                summary: "Blocked by completed work",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" },
                issuelinks: [
                  {
                    type: {
                      inward: "is blocked by",
                      name: "Blocks",
                      outward: "blocks"
                    },
                    inwardIssue: {
                      id: "10015",
                      key: "TASK-15",
                      fields: {
                        status: { name: "Done" }
                      }
                    }
                  }
                ]
              }
            },
            {
              id: "10006",
              key: "TASK-6",
              fields: {
                summary: "Blocked by completed work exposed through outwardIssue",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" },
                issuelinks: [
                  {
                    type: {
                      inward: "blocks",
                      name: "Custom Reverse Blocks",
                      outward: "is blocked by"
                    },
                    outwardIssue: {
                      id: "10016",
                      key: "TASK-16",
                      fields: {
                        status: { name: "Done" }
                      }
                    }
                  }
                ]
              }
            },
            {
              id: "10007",
              key: "OTHER-7",
              fields: {
                summary: "Available issue from another project",
                issuetype: { name: "Task" },
                project: { key: "OTHER", name: "Other Project" },
                status: { name: "To Do" },
                issuelinks: []
              }
            }
          ]
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const issues = await searchOpenUnassignedTodoJiraIssuesForAssignment(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK"
  );

  assert.deepEqual(
    issues.map((issue) => issue.key),
    ["TASK-2", "TASK-3", "TASK-4", "TASK-5", "TASK-6"]
  );
  assert.ok(issues.every((issue) => issue.projectKey === "TASK"));
  assert.deepEqual(capturedSearchRequest.fields, [
    "summary",
    "issuetype",
    "project",
    "status",
    "issuelinks"
  ]);
  assert.match(capturedSearchRequest.jql, /^project = "TASK" AND assignee IS EMPTY AND statusCategory = "To Do"/);
});

test("searchOpenTodoJiraIssuesForProject returns all To Do issues for the selected project", async (t) => {
  let capturedSearchRequest = null;

  const server = http.createServer(async (request, response) => {
    if (request.url === "/rest/api/3/search/jql" && request.method === "POST") {
      capturedSearchRequest = await readJsonBody(request);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          issues: [
            {
              id: "30001",
              key: "TASK-31",
              fields: {
                summary: "Assigned To Do issue",
                issuetype: { name: "Story" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" }
              }
            },
            {
              id: "30002",
              key: "TASK-32",
              fields: {
                summary: "Unassigned To Do issue",
                issuetype: { name: "Task" },
                project: { key: "TASK", name: "Task Runner" },
                status: { name: "To Do" }
              }
            },
            {
              id: "30003",
              key: "OTHER-33",
              fields: {
                summary: "To Do issue from another project",
                issuetype: { name: "Task" },
                project: { key: "OTHER", name: "Other Project" },
                status: { name: "To Do" }
              }
            }
          ]
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const issues = await searchOpenTodoJiraIssuesForProject(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK"
  );

  assert.deepEqual(
    issues.map((issue) => issue.key),
    ["TASK-31", "TASK-32"]
  );
  assert.deepEqual(capturedSearchRequest.fields, [
    "summary",
    "issuetype",
    "project",
    "status"
  ]);
  assert.match(capturedSearchRequest.jql, /^project = "TASK" AND statusCategory = "To Do"/);
});

test("searchOpenUnassignedTodoJiraIssuesForAssignment reloads missing blocker statuses before filtering", async (t) => {
  const capturedSearchRequests = [];

  const server = http.createServer(async (request, response) => {
    if (request.url === "/rest/api/3/search/jql" && request.method === "POST") {
      const requestBody = await readJsonBody(request);
      capturedSearchRequests.push(requestBody);

      if (capturedSearchRequests.length === 1) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            issues: [
              {
                id: "20001",
                key: "TASK-21",
                fields: {
                  summary: "Blocked by unfinished work with missing link status",
                  issuetype: { name: "Task" },
                  project: { key: "TASK", name: "Task Runner" },
                  status: { name: "To Do" },
                  issuelinks: [
                    {
                      type: {
                        inward: "is blocked by",
                        name: "Blocks",
                        outward: "blocks"
                      },
                      inwardIssue: {
                        id: "20011",
                        key: "TASK-211",
                        fields: {}
                      }
                    }
                  ]
                }
              },
              {
                id: "20002",
                key: "TASK-22",
                fields: {
                  summary: "Blocked by reviewed work with missing link status",
                  issuetype: { name: "Task" },
                  project: { key: "TASK", name: "Task Runner" },
                  status: { name: "To Do" },
                  issuelinks: [
                    {
                      type: {
                        inward: "is blocked by",
                        name: "Blocks",
                        outward: "blocks"
                      },
                      inwardIssue: {
                        id: "20012",
                        key: "TASK-212",
                        fields: {}
                      }
                    }
                  ]
                }
              },
              {
                id: "20003",
                key: "TASK-23",
                fields: {
                  summary: "Unblocked issue",
                  issuetype: { name: "Task" },
                  project: { key: "TASK", name: "Task Runner" },
                  status: { name: "To Do" },
                  issuelinks: []
                }
              }
            ]
          })
        );
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          issues: [
            {
              id: "20011",
              key: "TASK-211",
              fields: {
                status: { name: "In Progress" }
              }
            },
            {
              id: "20012",
              key: "TASK-212",
              fields: {
                status: { name: "In Review" }
              }
            }
          ]
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const issues = await searchOpenUnassignedTodoJiraIssuesForAssignment(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK"
  );

  assert.equal(capturedSearchRequests.length, 2);
  assert.deepEqual(issues.map((issue) => issue.key), ["TASK-22", "TASK-23"]);
  assert.deepEqual(capturedSearchRequests[1].fields, ["status"]);
  assert.match(capturedSearchRequests[1].jql, /"TASK-211"/);
  assert.match(capturedSearchRequests[1].jql, /"TASK-212"/);
});

test("createJiraProject warns when Jira rejects the board column update", async (t) => {
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");

    if (request.url === "/rest/api/3/myself" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ accountId: "lead-account-id" }));
      return;
    }

    if (request.url === "/rest/api/3/project" && request.method === "POST") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ id: "10000", key: "TASK" }));
      return;
    }

    if (
      request.url ===
        "/rest/api/3/project/TASK/roledetails?excludeConnectAddons=true&excludeOtherServiceRoles=true" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify([
          {
            admin: true,
            id: 1001,
            name: "Administrators",
            roleConfigurable: true,
            translatedName: "Administrators"
          },
          {
            admin: false,
            default: true,
            id: 1002,
            name: "Members",
            roleConfigurable: true,
            translatedName: "Members"
          }
        ])
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/role/1001" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          actors: [],
          id: 1001,
          name: "Administrators"
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/role/1002" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          actors: [],
          id: 1002,
          name: "Members"
        })
      );
      return;
    }

    if (request.url.startsWith("/rest/api/3/project/TASK/role/") && request.method === "POST") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (
      request.url === "/rest/api/3/issue/createmeta/TASK/issuetypes" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          issueTypes: [
            { id: "10001", name: "Task" },
            { id: "10002", name: "Story" }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/workflows" && request.method === "POST") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          statuses: [
            {
              description: "Initial work state",
              id: "1",
              name: "To Do",
              statusCategory: "TODO",
              statusReference: "todo-status"
            },
            {
              description: "Work is happening",
              id: "2",
              name: "In Progress",
              statusCategory: "IN_PROGRESS",
              statusReference: "in-progress-status"
            },
            {
              description: "Work is complete",
              id: "3",
              name: "Done",
              statusCategory: "DONE",
              statusReference: "done-status"
            }
          ],
          workflows: [
            {
              description: "Project workflow",
              id: "workflow-1",
              name: "Project workflow",
              scope: {
                project: { id: "10000" },
                type: "PROJECT"
              },
              statuses: [
                {
                  layout: { x: 100, y: 200 },
                  properties: {},
                  statusReference: "todo-status"
                },
                {
                  layout: { x: 300, y: 200 },
                  properties: {},
                  statusReference: "in-progress-status"
                },
                {
                  layout: { x: 500, y: 200 },
                  properties: {},
                  statusReference: "done-status"
                }
              ],
              transitions: [
                {
                  actions: [],
                  description: "Create the issue",
                  id: "1",
                  links: [],
                  name: "Create",
                  properties: {},
                  toStatusReference: "todo-status",
                  triggers: [],
                  type: "INITIAL",
                  validators: []
                },
                {
                  actions: [],
                  description: "Start work",
                  id: "21",
                  links: [
                    {
                      fromPort: 0,
                      fromStatusReference: "todo-status",
                      toPort: 0
                    }
                  ],
                  name: "Start Progress",
                  properties: {},
                  toStatusReference: "in-progress-status",
                  triggers: [],
                  type: "DIRECTED",
                  validators: []
                },
                {
                  actions: [],
                  description: "Finish work",
                  id: "31",
                  links: [
                    {
                      fromPort: 0,
                      fromStatusReference: "in-progress-status",
                      toPort: 0
                    }
                  ],
                  name: "Done",
                  properties: {},
                  toStatusReference: "done-status",
                  triggers: [],
                  type: "DIRECTED",
                  validators: []
                }
              ],
              version: {
                id: "workflow-version-1",
                versionNumber: 1
              }
            }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/workflows/update" && request.method === "POST") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ workflows: [] }));
      return;
    }

    if (
      requestUrl.pathname === "/rest/agile/1.0/board" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("projectKeyOrId") === "TASK" &&
      requestUrl.searchParams.get("type") === "kanban"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          values: [{ id: 176, name: "Task Runner Board", type: "kanban" }]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/project/TASK/statuses" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify([
          {
            id: "10001",
            name: "Task",
            statuses: [
              { id: "10001", name: "To Do" },
              { id: "10002", name: "In Progress" },
              { id: "10004", name: "In Review" },
              { id: "10005", name: "Done" }
            ]
          }
        ])
      );
      return;
    }

    if (
      requestUrl.pathname === "/rest/greenhopper/1.0/rapidviewconfig/editmodel" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("rapidViewId") === "176"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          currentStatisticsField: { id: "none_" },
          mappedColumns: [
            {
              isKanPlanColumn: false,
              mappedStatuses: [{ id: "10001" }],
              name: "To Do"
            },
            {
              isKanPlanColumn: false,
              mappedStatuses: [{ id: "10002" }],
              name: "In Progress"
            },
            {
              isKanPlanColumn: false,
              mappedStatuses: [{ id: "10005" }],
              name: "Done"
            }
          ],
          rapidViewId: 176
        })
      );
      return;
    }

    if (request.url === "/rest/greenhopper/1.0/rapidviewconfig/columns" && request.method === "PUT") {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          errorMessages: ["Greenhopper rejected the board columns."]
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const createdProject = await createJiraProject(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    {
      key: "TASK",
      name: "Task Runner",
      description: "Created from the extension"
    }
  );

  assert.equal(createdProject.id, "10000");
  assert.equal(createdProject.key, "TASK");
  assert.ok(
    createdProject.warnings.includes(
      "Jira still requires a manual access-level check. Verify project member and admin roles in your Jira settings."
    )
  );
  assert.ok(
    createdProject.warnings.includes(
      'The Jira project was created, but the extension could not automatically configure the board columns so "In Review" appears between "In Progress" and "Done": Greenhopper rejected the board columns.'
    )
  );
});

test("transitionJiraIssueToReviewOrDone moves to In Review when the board column is visible", async (t) => {
  let capturedTransitionRequest = null;

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");

    if (
      requestUrl.pathname === "/rest/agile/1.0/board" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("projectKeyOrId") === "TASK"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ values: [{ id: 176, type: "kanban" }] }));
      return;
    }

    if (
      request.url === "/rest/agile/1.0/board/176/configuration" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          columnConfig: {
            columns: [
              { name: "To Do" },
              { name: "In Progress" },
              { name: "In Review" },
              { name: "Done" }
            ]
          }
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          transitions: [
            {
              id: "41",
              name: "Move to Review",
              to: { name: "In Review" }
            },
            {
              id: "31",
              name: "Done",
              to: { name: "Done" }
            }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "POST") {
      capturedTransitionRequest = await readJsonBody(request);
      response.writeHead(204);
      response.end();
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const result = await transitionJiraIssueToReviewOrDone(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK",
    "TASK-1"
  );

  assert.deepEqual(result, { statusName: "In Review" });
  assert.deepEqual(capturedTransitionRequest, {
    transition: {
      id: "41"
    }
  });
});

test("transitionJiraIssueToReviewOrDone falls back to Done when In Review is not visible on the board", async (t) => {
  let capturedTransitionRequest = null;

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");

    if (
      requestUrl.pathname === "/rest/agile/1.0/board" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("projectKeyOrId") === "TASK"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ values: [{ id: 176, type: "kanban" }] }));
      return;
    }

    if (
      request.url === "/rest/agile/1.0/board/176/configuration" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          columnConfig: {
            columns: [{ name: "To Do" }, { name: "In Progress" }, { name: "Done" }]
          }
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          transitions: [
            {
              id: "41",
              name: "Move to Review",
              to: { name: "In Review" }
            },
            {
              id: "31",
              name: "Done",
              to: { name: "Done" }
            }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "POST") {
      capturedTransitionRequest = await readJsonBody(request);
      response.writeHead(204);
      response.end();
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const result = await transitionJiraIssueToReviewOrDone(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK",
    "TASK-1"
  );

  assert.deepEqual(result, {
    fallbackReason: '"In Review" is not visible on the Jira board.',
    statusName: "Done"
  });
  assert.deepEqual(capturedTransitionRequest, {
    transition: {
      id: "31"
    }
  });
});

test("transitionJiraIssueToReviewOrDone falls back to Done when moving to In Review fails", async (t) => {
  let capturedTransitionRequest = null;
  let transitionReads = 0;

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");

    if (
      requestUrl.pathname === "/rest/agile/1.0/board" &&
      request.method === "GET" &&
      requestUrl.searchParams.get("projectKeyOrId") === "TASK"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ values: [{ id: 176, type: "kanban" }] }));
      return;
    }

    if (
      request.url === "/rest/agile/1.0/board/176/configuration" &&
      request.method === "GET"
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          columnConfig: {
            columns: [
              { name: "To Do" },
              { name: "In Progress" },
              { name: "In Review" },
              { name: "Done" }
            ]
          }
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "GET") {
      transitionReads += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          transitions: [
            {
              id: "31",
              name: "Done",
              to: { name: "Done" }
            }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "POST") {
      capturedTransitionRequest = await readJsonBody(request);
      response.writeHead(204);
      response.end();
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const result = await transitionJiraIssueToReviewOrDone(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK",
    "TASK-1"
  );

  assert.equal(transitionReads, 2);
  assert.deepEqual(capturedTransitionRequest, {
    transition: {
      id: "31"
    }
  });
  assert.equal(result.statusName, "Done");
  assert.match(
    result.fallbackReason ?? "",
    /^moving to "In Review" failed: Transition "In Review" is not available\./
  );
});

test("transitionJiraIssueToStatus matches the target status when Jira names the transition differently", async (t) => {
  let capturedTransitionRequest = null;

  const server = http.createServer(async (request, response) => {
    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          transitions: [
            {
              id: "21",
              name: "Start Progress",
              to: { name: "In Progress" }
            },
            {
              id: "31",
              name: "Done",
              to: { name: "Done" }
            }
          ]
        })
      );
      return;
    }

    if (request.url === "/rest/api/3/issue/TASK-1/transitions" && request.method === "POST") {
      capturedTransitionRequest = await readJsonBody(request);
      response.writeHead(204);
      response.end();
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  await transitionJiraIssueToStatus(
    {
      baseUrl: `http://127.0.0.1:${port}`,
      email: "person@example.com",
      apiToken: "secret-token"
    },
    "TASK-1",
    "In Progress"
  );

  assert.deepEqual(capturedTransitionRequest, {
    transition: {
      id: "21"
    }
  });
});
