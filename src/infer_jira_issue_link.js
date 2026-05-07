#!/usr/bin/env node

const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

function parseEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) {
    return values;
  }

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return values;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("export ")) {
      line = line.slice("export ".length).trim();
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim().toLowerCase();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }

    if (key) {
      values[key] = value;
    }
  }

  return values;
}

function extractJiraKey(input) {
  const upper = String(input || "").toUpperCase();
  const match = upper.match(/([A-Z][A-Z0-9]+-\d+)/);
  return match ? match[1] : "";
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function getSetting(envValues, key) {
  return String(
    process.env[key] ||
      process.env[key.toLowerCase()] ||
      envValues[key.toLowerCase()] ||
      ""
  ).trim();
}

function jiraIssueExists(baseUrl, email, apiToken, issueKey) {
  const url = new URL(`/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=key`, `${baseUrl}/`);
  const client = url.protocol === "https:" ? https : http;
  const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

  return new Promise((resolve) => {
    const request = client.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: authHeader
        }
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            resolve(false);
            return;
          }

          try {
            const payload = JSON.parse(body);
            resolve(String(payload.key || "").trim().toUpperCase() === issueKey);
          } catch {
            resolve(true);
          }
        });
      }
    );

    request.on("error", () => resolve(false));
    request.end();
  });
}

async function main() {
  const branchName = process.argv[2] || "";
  const issueKey = extractJiraKey(branchName);
  if (!issueKey) {
    return;
  }

  const envValues = parseEnvFile(path.join(process.cwd(), ".env"));
  const baseUrl = normalizeBaseUrl(getSetting(envValues, "JIRA_BASE_URL"));
  const email = getSetting(envValues, "JIRA_EMAIL");
  const apiToken = getSetting(envValues, "JIRA_API_TOKEN");

  if (!baseUrl || !email || !apiToken) {
    return;
  }

  const exists = await jiraIssueExists(baseUrl, email, apiToken, issueKey);
  if (!exists) {
    return;
  }

  process.stdout.write(`${baseUrl}/browse/${issueKey}`);
}

main().catch(() => {
  process.exitCode = 0;
});
