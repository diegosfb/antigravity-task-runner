"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJiraCurrentUserAccountId = getJiraCurrentUserAccountId;
exports.createJiraProject = createJiraProject;
exports.getJiraProjects = getJiraProjects;
exports.searchOpenUnassignedJiraIssues = searchOpenUnassignedJiraIssues;
exports.searchOpenAssignedJiraIssuesForCurrentUser = searchOpenAssignedJiraIssuesForCurrentUser;
exports.assignJiraIssueToCurrentUser = assignJiraIssueToCurrentUser;
exports.transitionJiraIssueToStatus = transitionJiraIssueToStatus;
exports.getJiraIssueTypes = getJiraIssueTypes;
exports.getJiraCreateFieldMetadata = getJiraCreateFieldMetadata;
exports.createJiraIssue = createJiraIssue;
const http = require("http");
const https = require("https");
function normalizeFieldName(fieldKey, field) {
    return (field?.name || fieldKey).trim().toLowerCase();
}
function isProvidedJiraField(fieldKey, field) {
    const normalizedKey = fieldKey.trim().toLowerCase();
    const normalizedName = normalizeFieldName(fieldKey, field);
    return (["summary", "description", "project", "issuetype"].includes(normalizedKey) ||
        ["summary", "description", "project", "issue type"].includes(normalizedName));
}
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
async function getJiraProjects(credentials) {
    const response = await jiraRequest(credentials, {
        method: "GET",
        apiPath: "/rest/api/3/project/search?maxResults=100&orderBy=name"
    });
    return (response.values ?? []).sort((a, b) => a.name.localeCompare(b.name));
}
async function searchOpenUnassignedJiraIssues(credentials) {
    const response = await jiraRequest(credentials, {
        method: "POST",
        apiPath: "/rest/api/3/search",
        body: {
            fields: ["summary", "issuetype", "project", "status"],
            jql: "assignee IS EMPTY AND statusCategory != Done ORDER BY updated DESC",
            maxResults: 100
        }
    });
    return (response.issues ?? [])
        .map((issue) => ({
        id: (issue.id ?? "").trim(),
        key: (issue.key ?? "").trim(),
        summary: (issue.fields?.summary ?? "").trim(),
        projectKey: (issue.fields?.project?.key ?? "").trim(),
        projectName: (issue.fields?.project?.name ?? "").trim(),
        issueTypeName: (issue.fields?.issuetype?.name ?? "").trim(),
        statusName: (issue.fields?.status?.name ?? "").trim()
    }))
        .filter((issue) => issue.id && issue.key && issue.summary);
}
async function searchOpenAssignedJiraIssuesForCurrentUser(credentials) {
    const response = await jiraRequest(credentials, {
        method: "POST",
        apiPath: "/rest/api/3/search",
        body: {
            fields: ["summary", "issuetype", "project", "status"],
            jql: "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC",
            maxResults: 100
        }
    });
    return (response.issues ?? [])
        .map((issue) => ({
        id: (issue.id ?? "").trim(),
        key: (issue.key ?? "").trim(),
        summary: (issue.fields?.summary ?? "").trim(),
        projectKey: (issue.fields?.project?.key ?? "").trim(),
        projectName: (issue.fields?.project?.name ?? "").trim(),
        issueTypeName: (issue.fields?.issuetype?.name ?? "").trim(),
        statusName: (issue.fields?.status?.name ?? "").trim()
    }))
        .filter((issue) => issue.id && issue.key && issue.summary);
}
async function assignJiraIssueToCurrentUser(credentials, issueKey) {
    const accountId = await getJiraCurrentUserAccountId(credentials);
    await jiraRequest(credentials, {
        method: "PUT",
        apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`,
        body: {
            accountId
        }
    });
}
async function clearJiraIssueAssignee(credentials, issueKey) {
    await jiraRequest(credentials, {
        method: "PUT",
        apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`,
        body: {
            accountId: null
        }
    });
}
async function transitionJiraIssueToStatus(credentials, issueKey, targetStatusName) {
    const response = await jiraRequest(credentials, {
        method: "GET",
        apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`
    });
    const transitions = response.transitions ?? [];
    const transition = transitions.find((candidate) => (candidate.name ?? "").trim().toLowerCase() === targetStatusName.trim().toLowerCase());
    if (!transition?.id) {
        const available = transitions
            .map((candidate) => (candidate.name ?? "").trim())
            .filter(Boolean)
            .join(", ");
        throw new Error(available
            ? `Transition "${targetStatusName}" is not available. Available transitions: ${available}.`
            : `Transition "${targetStatusName}" is not available for ${issueKey}.`);
    }
    await jiraRequest(credentials, {
        method: "POST",
        apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
        body: {
            transition: {
                id: transition.id
            }
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
    const autoPopulatedFieldKeys = new Set();
    const metadata = await getJiraCreateFieldMetadata(credentials, details.projectKey, issueType.id);
    let currentUserAccountId;
    for (const [fieldKey, field] of Object.entries(metadata)) {
        if (!field.required)
            continue;
        const fieldName = normalizeFieldName(fieldKey, field);
        if (fieldName === "epic name") {
            fields[fieldKey] = details.summary.trim();
            autoPopulatedFieldKeys.add(fieldKey);
            continue;
        }
        if (fieldName === "reporter") {
            currentUserAccountId || (currentUserAccountId = await getJiraCurrentUserAccountId(credentials));
            fields[fieldKey] = { accountId: currentUserAccountId };
            autoPopulatedFieldKeys.add(fieldKey);
        }
    }
    const unsupportedRequiredFields = Object.entries(metadata)
        .filter(([fieldKey, field]) => {
        if (!field.required)
            return false;
        if (isProvidedJiraField(fieldKey, field))
            return false;
        return fields[fieldKey] === undefined;
    })
        .map(([, field]) => field.name || "Unknown field");
    if (unsupportedRequiredFields.length > 0) {
        throw new Error(`Jira requires additional fields for this issue type: ${unsupportedRequiredFields.join(", ")}.`);
    }
    const createIssueRequest = () => jiraRequest(credentials, {
        method: "POST",
        apiPath: "/rest/api/3/issue",
        body: { fields }
    });
    try {
        const createdIssue = await createIssueRequest();
        await clearJiraIssueAssignee(credentials, createdIssue.key);
        return createdIssue;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const unsupportedFieldKeys = Array.from(message.matchAll(/Field '([^']+)' cannot be set\./g), (match) => match[1]);
        const retryableFieldKeys = unsupportedFieldKeys.filter((fieldKey) => autoPopulatedFieldKeys.has(fieldKey));
        if (retryableFieldKeys.length === 0) {
            throw error;
        }
        for (const fieldKey of retryableFieldKeys) {
            delete fields[fieldKey];
        }
        const createdIssue = await createIssueRequest();
        await clearJiraIssueAssignee(credentials, createdIssue.key);
        return createdIssue;
    }
}
//# sourceMappingURL=jira.js.map