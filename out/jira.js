"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJiraCurrentUserAccountId = getJiraCurrentUserAccountId;
exports.createJiraProject = createJiraProject;
exports.getJiraIssueTypes = getJiraIssueTypes;
exports.getJiraCreateFieldMetadata = getJiraCreateFieldMetadata;
exports.createJiraIssue = createJiraIssue;
const http = require("http");
const https = require("https");
function normalizeBaseUrl(baseUrl) {
    return baseUrl.trim().replace(/\/+$/, "");
}
function getAuthHeader(credentials) {
    return `Basic ${Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString("base64")}`;
}
async function jiraRequest(credentials, options) {
    const baseUrl = normalizeBaseUrl(credentials.baseUrl);
    const url = new URL(options.apiPath, `${baseUrl}/`);
    const client = url.protocol === "https:" ? https : http;
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    return new Promise((resolve, reject) => {
        const request = client.request(url, {
            method: options.method,
            headers: {
                Accept: "application/json",
                Authorization: getAuthHeader(credentials),
                ...(body
                    ? {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(body)
                    }
                    : {})
            }
        }, (response) => {
            let chunks = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                chunks += chunk;
            });
            response.on("end", () => {
                const status = response.statusCode ?? 0;
                if (status >= 200 && status < 300) {
                    if (!chunks.trim()) {
                        resolve(undefined);
                        return;
                    }
                    try {
                        resolve(JSON.parse(chunks));
                    }
                    catch {
                        resolve(chunks);
                    }
                    return;
                }
                let message = `Jira request failed with status ${status}.`;
                try {
                    const payload = JSON.parse(chunks);
                    const parts = [
                        ...(payload.errorMessages ?? []),
                        ...Object.values(payload.errors ?? {})
                    ].filter(Boolean);
                    if (parts.length > 0) {
                        message = parts.join(" ");
                    }
                }
                catch {
                    if (chunks.trim()) {
                        message = chunks.trim();
                    }
                }
                reject(new Error(message));
            });
        });
        request.on("error", (error) => reject(error));
        if (body)
            request.write(body);
        request.end();
    });
}
function toAdfDocument(text) {
    const trimmed = (text ?? "").trim();
    return {
        type: "doc",
        version: 1,
        content: trimmed
            ? [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: trimmed }]
                }
            ]
            : []
    };
}
async function getJiraCurrentUserAccountId(credentials) {
    const response = await jiraRequest(credentials, {
        method: "GET",
        apiPath: "/rest/api/3/myself"
    });
    const accountId = response.accountId?.trim();
    if (!accountId) {
        throw new Error("Unable to determine the Jira account ID for the current user.");
    }
    return accountId;
}
async function createJiraProject(credentials, details) {
    const leadAccountId = await getJiraCurrentUserAccountId(credentials);
    return jiraRequest(credentials, {
        method: "POST",
        apiPath: "/rest/api/3/project",
        body: {
            assigneeType: "PROJECT_LEAD",
            description: details.description?.trim() || undefined,
            key: details.key,
            leadAccountId,
            name: details.name,
            projectTemplateKey: "com.pyxis.greenhopper.jira:gh-simplified-basic",
            projectTypeKey: "software"
        }
    });
}
async function getJiraIssueTypes(credentials, projectKey) {
    const response = await jiraRequest(credentials, {
        method: "GET",
        apiPath: `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`
    });
    return response.issueTypes ?? [];
}
async function getJiraCreateFieldMetadata(credentials, projectKey, issueTypeId) {
    const response = await jiraRequest(credentials, {
        method: "GET",
        apiPath: `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`
    });
    return response.fields ?? {};
}
async function createJiraIssue(credentials, details) {
    const issueTypes = await getJiraIssueTypes(credentials, details.projectKey);
    const issueType = issueTypes.find((candidate) => candidate.name.toLowerCase() === details.issueTypeName.toLowerCase());
    if (!issueType) {
        throw new Error(`Issue type "${details.issueTypeName}" is not available in Jira project ${details.projectKey}.`);
    }
    const fields = {
        project: { key: details.projectKey },
        issuetype: { id: issueType.id },
        summary: details.summary.trim(),
        description: toAdfDocument(details.description)
    };
    const metadata = await getJiraCreateFieldMetadata(credentials, details.projectKey, issueType.id);
    const unsupportedRequiredFields = Object.entries(metadata)
        .filter(([fieldKey, field]) => {
        if (!field.required)
            return false;
        if (["summary", "description", "project", "issuetype"].includes(fieldKey))
            return false;
        const fieldName = (field.name ?? "").toLowerCase();
        if (fieldName === "epic name")
            return false;
        return true;
    })
        .map(([, field]) => field.name || "Unknown field");
    if (unsupportedRequiredFields.length > 0) {
        throw new Error(`Jira requires additional fields for this issue type: ${unsupportedRequiredFields.join(", ")}.`);
    }
    for (const [fieldKey, field] of Object.entries(metadata)) {
        const fieldName = (field.name ?? "").toLowerCase();
        if (fieldName !== "epic name" || !field.required)
            continue;
        fields[fieldKey] = details.summary.trim();
    }
    return jiraRequest(credentials, {
        method: "POST",
        apiPath: "/rest/api/3/issue",
        body: { fields }
    });
}
//# sourceMappingURL=jira.js.map