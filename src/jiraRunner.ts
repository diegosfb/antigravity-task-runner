import * as vscode from "vscode";
import { quoteShellArg } from "./utils";

export type JiraRunnerValues = {
  enableJira: boolean;
  jiraProjectName: string;
};

export type JiraCredentials = {
  username: string;
  url: string;
  apiToken: string;
};

export function getDefaultJiraRunnerValues(): JiraRunnerValues {
  return {
    enableJira: false,
    jiraProjectName: ""
  };
}

export function sanitizeJiraRunnerValues(
  values: Partial<JiraRunnerValues> | undefined
): JiraRunnerValues {
  return {
    enableJira: values?.enableJira === true,
    jiraProjectName:
      typeof values?.jiraProjectName === "string" ? values.jiraProjectName.trim() : ""
  };
}

export function getConfiguredJiraCredentials(): JiraCredentials {
  const config = vscode.workspace.getConfiguration("antigravity");
  return {
    username: (config.get<string>("jiraEmail") || "").trim(),
    url: (config.get<string>("jiraBaseUrl") || "").trim(),
    apiToken: (config.get<string>("jiraApiToken") || "").trim()
  };
}

export function getMissingJiraRunnerFields(
  values: JiraRunnerValues,
  credentials: JiraCredentials = getConfiguredJiraCredentials()
): string[] {
  if (!values.enableJira) {
    return [];
  }

  const missing: string[] = [];
  if (!values.jiraProjectName) missing.push("Jira Project Name");
  if (!credentials.username) missing.push("Jira Username setting");
  if (!credentials.url) missing.push("Jira URL setting");
  if (!credentials.apiToken) missing.push("Jira API Token setting");
  return missing;
}

export function buildJiraRunnerArgs(
  values: JiraRunnerValues,
  credentials: JiraCredentials = getConfiguredJiraCredentials()
): string[] {
  if (!values.enableJira) {
    return [];
  }

  return [
    "--jira-username",
    quoteShellArg(credentials.username),
    "--jira-url",
    quoteShellArg(credentials.url),
    "--jira-api-token",
    quoteShellArg(credentials.apiToken),
    "--jira-project",
    quoteShellArg(values.jiraProjectName)
  ];
}
