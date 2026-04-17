import * as http from "http";
import * as https from "https";

export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraProjectDetails {
  key: string;
  name: string;
  description?: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
}

export interface JiraIssueDetails {
  projectKey: string;
  issueTypeName: string;
  summary: string;
  description?: string;
}

interface JiraRequestOptions {
  method: "GET" | "POST";
  apiPath: string;
  body?: unknown;
}

type JiraFieldMetadata = {
  key: string;
  name?: string;
  required?: boolean;
  schema?: {
    type?: string;
  };
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function getAuthHeader(credentials: JiraCredentials): string {
  return `Basic ${Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString("base64")}`;
}

async function jiraRequest<T>(
  credentials: JiraCredentials,
  options: JiraRequestOptions
): Promise<T> {
  const baseUrl = normalizeBaseUrl(credentials.baseUrl);
  const url = new URL(options.apiPath, `${baseUrl}/`);
  const client = url.protocol === "https:" ? https : http;
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);

  return new Promise<T>((resolve, reject) => {
    const request = client.request(
      url,
      {
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
      },
      (response) => {
        let chunks = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          chunks += chunk;
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            if (!chunks.trim()) {
              resolve(undefined as T);
              return;
            }
            try {
              resolve(JSON.parse(chunks) as T);
            } catch {
              resolve(chunks as T);
            }
            return;
          }

          let message = `Jira request failed with status ${status}.`;
          try {
            const payload = JSON.parse(chunks) as {
              errorMessages?: string[];
              errors?: Record<string, string>;
            };
            const parts = [
              ...(payload.errorMessages ?? []),
              ...Object.values(payload.errors ?? {})
            ].filter(Boolean);
            if (parts.length > 0) {
              message = parts.join(" ");
            }
          } catch {
            if (chunks.trim()) {
              message = chunks.trim();
            }
          }
          reject(new Error(message));
        });
      }
    );

    request.on("error", (error) => reject(error));
    if (body) request.write(body);
    request.end();
  });
}

function toAdfDocument(text: string | undefined) {
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

export async function getJiraCurrentUserAccountId(
  credentials: JiraCredentials
): Promise<string> {
  const response = await jiraRequest<{ accountId?: string }>(credentials, {
    method: "GET",
    apiPath: "/rest/api/3/myself"
  });
  const accountId = response.accountId?.trim();
  if (!accountId) {
    throw new Error("Unable to determine the Jira account ID for the current user.");
  }
  return accountId;
}

export async function createJiraProject(
  credentials: JiraCredentials,
  details: JiraProjectDetails
): Promise<{ id: string; key: string }> {
  const leadAccountId = await getJiraCurrentUserAccountId(credentials);
  return jiraRequest<{ id: string; key: string }>(credentials, {
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

export async function getJiraIssueTypes(
  credentials: JiraCredentials,
  projectKey: string
): Promise<JiraIssueType[]> {
  const response = await jiraRequest<{ issueTypes?: JiraIssueType[] }>(credentials, {
    method: "GET",
    apiPath: `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`
  });
  return response.issueTypes ?? [];
}

export async function getJiraCreateFieldMetadata(
  credentials: JiraCredentials,
  projectKey: string,
  issueTypeId: string
): Promise<Record<string, JiraFieldMetadata>> {
  const response = await jiraRequest<{ fields?: Record<string, JiraFieldMetadata> }>(credentials, {
    method: "GET",
    apiPath: `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`
  });
  return response.fields ?? {};
}

export async function createJiraIssue(
  credentials: JiraCredentials,
  details: JiraIssueDetails
): Promise<{ id: string; key: string; self: string }> {
  const issueTypes = await getJiraIssueTypes(credentials, details.projectKey);
  const issueType = issueTypes.find(
    (candidate) => candidate.name.toLowerCase() === details.issueTypeName.toLowerCase()
  );

  if (!issueType) {
    throw new Error(
      `Issue type "${details.issueTypeName}" is not available in Jira project ${details.projectKey}.`
    );
  }

  const fields: Record<string, unknown> = {
    project: { key: details.projectKey },
    issuetype: { id: issueType.id },
    summary: details.summary.trim(),
    description: toAdfDocument(details.description)
  };

  const metadata = await getJiraCreateFieldMetadata(credentials, details.projectKey, issueType.id);
  const unsupportedRequiredFields = Object.entries(metadata)
    .filter(([fieldKey, field]) => {
      if (!field.required) return false;
      if (["summary", "description", "project", "issuetype"].includes(fieldKey)) return false;
      const fieldName = (field.name ?? "").toLowerCase();
      if (fieldName === "epic name") return false;
      return true;
    })
    .map(([, field]) => field.name || "Unknown field");

  if (unsupportedRequiredFields.length > 0) {
    throw new Error(
      `Jira requires additional fields for this issue type: ${unsupportedRequiredFields.join(", ")}.`
    );
  }

  for (const [fieldKey, field] of Object.entries(metadata)) {
    const fieldName = (field.name ?? "").toLowerCase();
    if (fieldName !== "epic name" || !field.required) continue;
    fields[fieldKey] = details.summary.trim();
  }

  return jiraRequest<{ id: string; key: string; self: string }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/issue",
    body: { fields }
  });
}
