"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultJiraRunnerValues = getDefaultJiraRunnerValues;
exports.sanitizeJiraRunnerValues = sanitizeJiraRunnerValues;
exports.getConfiguredJiraCredentials = getConfiguredJiraCredentials;
exports.getMissingJiraRunnerFields = getMissingJiraRunnerFields;
exports.buildJiraRunnerArgs = buildJiraRunnerArgs;
const vscode = require("vscode");
const utils_1 = require("./utils");
function getDefaultJiraRunnerValues() {
    return {
        enableJira: false,
        jiraProjectName: ""
    };
}
function sanitizeJiraRunnerValues(values) {
    return {
        enableJira: values?.enableJira === true,
        jiraProjectName: typeof values?.jiraProjectName === "string" ? values.jiraProjectName.trim() : ""
    };
}
function getConfiguredJiraCredentials() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return {
        username: (config.get("jiraEmail") || "").trim(),
        url: (config.get("jiraBaseUrl") || "").trim(),
        apiToken: (config.get("jiraApiToken") || "").trim()
    };
}
function getMissingJiraRunnerFields(values, credentials = getConfiguredJiraCredentials()) {
    if (!values.enableJira) {
        return [];
    }
    const missing = [];
    if (!values.jiraProjectName)
        missing.push("Jira Project Name");
    if (!credentials.username)
        missing.push("Jira Username setting");
    if (!credentials.url)
        missing.push("Jira URL setting");
    if (!credentials.apiToken)
        missing.push("Jira API Token setting");
    return missing;
}
function buildJiraRunnerArgs(values, credentials = getConfiguredJiraCredentials()) {
    if (!values.enableJira) {
        return [];
    }
    return [
        "--jira-username",
        (0, utils_1.quoteShellArg)(credentials.username),
        "--jira-url",
        (0, utils_1.quoteShellArg)(credentials.url),
        "--jira-api-token",
        (0, utils_1.quoteShellArg)(credentials.apiToken),
        "--jira-project",
        (0, utils_1.quoteShellArg)(values.jiraProjectName)
    ];
}
//# sourceMappingURL=jiraRunner.js.map