const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const {
  createFileSystemResourceProvider,
  createGitHubResourceProvider
} = require("../out/resourceProvider.js");

test("createFileSystemResourceProvider resolves files and directories from a local Resources root", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-resource-provider-"));
  const resourcesRoot = path.join(tempRoot, "Resources");
  const skillRoot = path.join(resourcesRoot, "cloud-architect");

  fs.mkdirSync(skillRoot, { recursive: true });
  fs.writeFileSync(path.join(resourcesRoot, "help.md"), "# Help\n");
  fs.writeFileSync(path.join(skillRoot, "SKILL.md"), "# Cloud Architect\n");

  const provider = createFileSystemResourceProvider(resourcesRoot);
  const helpPath = await provider.ensureFile("help.md");
  const directoryPath = await provider.ensureDirectory("cloud-architect");

  assert.equal(fs.readFileSync(helpPath, "utf8"), "# Help\n");
  assert.equal(fs.readFileSync(path.join(directoryPath, "SKILL.md"), "utf8"), "# Cloud Architect\n");
  assert.equal(await provider.readTextFile("help.md"), "# Help\n");
});

test("createGitHubResourceProvider downloads remote files and directories into its cache", async (t) => {
  const requestCounts = new Map();
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const key = `${url.pathname}${url.search}`;
    requestCounts.set(key, (requestCounts.get(key) || 0) + 1);

    if (url.pathname === "/blob/main/Resources/help.md" && url.searchParams.get("raw") === "1") {
      response.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      response.end("# Remote Help\n");
      return;
    }

    if (url.pathname === "/blob/main/Resources/cloud-architect/SKILL.md") {
      response.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      response.end("# Remote Cloud Architect\n");
      return;
    }

    if (url.pathname === "/blob/main/Resources/cloud-architect/references/aws.md") {
      response.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      response.end("# Remote AWS\n");
      return;
    }

    if (url.pathname === "/api/cloud-architect" && url.searchParams.get("ref") === "main") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify([
          {
            name: "SKILL.md",
            type: "file",
            download_url: `http://127.0.0.1:${server.address().port}/blob/main/Resources/cloud-architect/SKILL.md?raw=1`
          },
          {
            name: "references",
            type: "dir"
          }
        ])
      );
      return;
    }

    if (url.pathname === "/api/cloud-architect/references" && url.searchParams.get("ref") === "main") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify([
          {
            name: "aws.md",
            type: "file",
            download_url: `http://127.0.0.1:${server.address().port}/blob/main/Resources/cloud-architect/references/aws.md?raw=1`
          }
        ])
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const provider = createGitHubResourceProvider({
    cacheRoot: fs.mkdtempSync(path.join(os.tmpdir(), "antigravity-resource-cache-")),
    contentsApiBaseUrl: `http://127.0.0.1:${server.address().port}/api`,
    rawBaseUrl: `http://127.0.0.1:${server.address().port}/blob/main/Resources`
  });

  const helpPath = await provider.ensureFile("help.md");
  const skillDirectory = await provider.ensureDirectory("cloud-architect");

  assert.equal(fs.readFileSync(helpPath, "utf8"), "# Remote Help\n");
  assert.equal(
    fs.readFileSync(path.join(skillDirectory, "SKILL.md"), "utf8"),
    "# Remote Cloud Architect\n"
  );
  assert.equal(
    fs.readFileSync(path.join(skillDirectory, "references", "aws.md"), "utf8"),
    "# Remote AWS\n"
  );

  await provider.ensureFile("help.md");
  await provider.ensureDirectory("cloud-architect");

  assert.equal(requestCounts.get("/blob/main/Resources/help.md?raw=1"), 1);
  assert.equal(requestCounts.get("/api/cloud-architect?ref=main"), 1);
  assert.equal(requestCounts.get("/api/cloud-architect/references?ref=main"), 1);
  assert.equal(requestCounts.get("/blob/main/Resources/cloud-architect/SKILL.md?raw=1"), 1);
  assert.equal(requestCounts.get("/blob/main/Resources/cloud-architect/references/aws.md?raw=1"), 1);
});
