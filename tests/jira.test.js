const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { createJiraProject } = require("../out/jira.js");

test("createJiraProject creates a Jira software project", async (t) => {
  let capturedCreateRequest = null;

  const server = http.createServer((request, response) => {
    if (request.url === "/rest/api/3/myself" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ accountId: "lead-account-id" }));
      return;
    }

    if (request.url === "/rest/api/3/project" && request.method === "POST") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        capturedCreateRequest = {
          headers: request.headers,
          body: JSON.parse(body)
        };
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ id: "10000", key: "TASK" }));
      });
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

  assert.deepEqual(createdProject, { id: "10000", key: "TASK" });
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
    "com.pyxis.greenhopper.jira:gh-simplified-basic"
  );
});
