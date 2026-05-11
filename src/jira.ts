import { randomUUID } from "crypto";
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

export interface JiraProjectCreationResult {
  id: string;
  key: string;
  warnings: string[];
}

const JIRA_SOFTWARE_PROJECT_TEMPLATE_KEY =
  "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban";
const JIRA_SOFTWARE_PROJECT_TYPE_KEY = "software";
const JIRA_STATUS_TO_DO = "To Do";
const JIRA_STATUS_IN_PROGRESS = "In Progress";
const JIRA_STATUS_IN_REVIEW = "In Review";
const JIRA_STATUS_DONE = "Done";
const TEAM_MANAGED_MEMBER_GROUPS = ["jira-users-diegosfb"];
const TEAM_MANAGED_ADMIN_GROUPS = ["site-admins"];
const TEAM_MANAGED_ACCESS_WARNING =
  "Jira still requires a manual access-level check so the project is limited to jira-users-diegosfb, Diego Fernandez, and site-admins.";
const TEAM_MANAGED_BOARD_WARNING_PREFIX =
  'The Jira project was created, but the extension could not automatically configure the board columns so "In Review" appears between "In Progress" and "Done"';

export interface JiraIssueType {
  id: string;
  name: string;
}

export interface JiraProjectSummary {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssueDetails {
  projectKey: string;
  issueTypeName: string;
  summary: string;
  description?: string;
}

export interface JiraIssueSummary {
  id: string;
  key: string;
  summary: string;
  projectKey: string;
  projectName: string;
  issueTypeName: string;
  statusName: string;
}

type JiraIssueLinkType = {
  inward?: string;
  name?: string;
  outward?: string;
};

type JiraLinkedIssueReference = {
  fields?: {
    status?: { name?: string };
  };
  id?: string;
  key?: string;
};

type JiraIssueLink = {
  inwardIssue?: JiraLinkedIssueReference;
  outwardIssue?: JiraLinkedIssueReference;
  type?: JiraIssueLinkType;
};

type JiraIssueSearchResult = {
  id?: string;
  key?: string;
  fields?: {
    assignee?: { accountId?: string };
    issuelinks?: JiraIssueLink[];
    issuetype?: { name?: string };
    project?: { key?: string; name?: string };
    status?: { name?: string };
    summary?: string;
  };
};

export interface JiraCompletionTransitionResult {
  statusName: typeof JIRA_STATUS_DONE | typeof JIRA_STATUS_IN_REVIEW;
  fallbackReason?: string;
}

interface JiraRequestOptions {
  method: "DELETE" | "GET" | "POST" | "PUT";
  apiPath: string;
  body?: unknown;
}

type JiraRequestError = Error & {
  statusCode?: number;
};

type JiraFieldMetadata = {
  key: string;
  name?: string;
  required?: boolean;
  schema?: {
    type?: string;
  };
};

type JiraProjectRoleDetails = {
  id?: number | string;
  name?: string;
  translatedName?: string;
  admin?: boolean;
  default?: boolean;
  roleConfigurable?: boolean;
};

type JiraProjectRoleActor = {
  type?: string;
  name?: string;
  actorGroup?: {
    name?: string;
    groupId?: string;
  };
  actorUser?: {
    accountId?: string;
  };
};

type JiraProjectRole = {
  id?: number | string;
  name?: string;
  actors?: JiraProjectRoleActor[];
};

type JiraBoardSummary = {
  id?: number | string;
  name?: string;
  type?: string;
};

type JiraBoardStatusReference = {
  id?: string;
};

type JiraBoardColumnConfiguration = {
  max?: number;
  min?: number;
  name?: string;
  statuses?: JiraBoardStatusReference[];
};

type JiraBoardConfiguration = {
  columnConfig?: {
    columns?: JiraBoardColumnConfiguration[];
  };
  estimation?: {
    field?: {
      fieldId?: string;
    };
  };
};

type JiraProjectIssueTypeStatuses = Array<{
  id?: string;
  name?: string;
  statuses?: Array<{
    id?: string;
    name?: string;
  }>;
}>;

type JiraRapidViewStatisticsField = {
  id?: string;
};

type JiraRapidViewMappedStatus = {
  id?: string;
};

type JiraRapidViewMappedColumn = {
  isKanPlanColumn?: boolean;
  mappedStatuses?: JiraRapidViewMappedStatus[];
  max?: number;
  min?: number;
  name?: string;
};

type JiraRapidViewEditModel = {
  currentStatisticsField?: JiraRapidViewStatisticsField;
  mappedColumns?: JiraRapidViewMappedColumn[];
  rapidViewId?: number | string;
};

type JiraWorkflowScope = {
  type?: string;
  project?: {
    id?: string;
  };
};

type JiraWorkflowStatusDocument = {
  description?: string;
  id?: string;
  name?: string;
  rawName?: string;
  scope?: JiraWorkflowScope;
  statusCategory?: string;
  statusReference?: string;
};

type JiraWorkflowStatusLayout = {
  deprecated?: boolean;
  layout?: {
    x?: number;
    y?: number;
  } | null;
  properties?: Record<string, string>;
  statusReference?: string;
};

type JiraWorkflowTransitionLink = {
  fromPort?: number | null;
  fromStatusReference?: string | null;
  toPort?: number | null;
};

type JiraWorkflowTransitionDocument = {
  actions?: unknown[];
  description?: string;
  id?: string;
  links?: JiraWorkflowTransitionLink[] | null;
  name?: string;
  properties?: Record<string, string>;
  toStatusReference?: string;
  triggers?: unknown[];
  type?: "INITIAL" | "GLOBAL" | "DIRECTED" | string;
  validators?: unknown[];
};

type JiraWorkflowVersion = {
  id?: string;
  versionNumber?: number;
};

type JiraWorkflowDocument = {
  description?: string;
  id?: string;
  isEditable?: boolean;
  loopedTransitionContainerLayout?: {
    x?: number;
    y?: number;
  };
  name?: string;
  queryContext?: Array<{
    issueTypes?: string[];
    project?: string;
  }>;
  scope?: JiraWorkflowScope;
  startPointLayout?: {
    x?: number;
    y?: number;
  };
  statuses?: JiraWorkflowStatusLayout[];
  transitions?: JiraWorkflowTransitionDocument[];
  version?: JiraWorkflowVersion;
};

type JiraWorkflowReadResponse = {
  statuses?: JiraWorkflowStatusDocument[];
  workflows?: JiraWorkflowDocument[];
};

function normalizeFieldName(fieldKey: string, field?: JiraFieldMetadata): string {
  return (field?.name || fieldKey).trim().toLowerCase();
}

function normalizeJiraText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

const ASSIGNABLE_BLOCKER_DONE_STATUSES = new Set([
  normalizeJiraText(JIRA_STATUS_IN_REVIEW),
  normalizeJiraText(JIRA_STATUS_DONE)
]);

type BlockingDependencyReference = {
  issueKey: string;
  statusName: string;
};

function matchesJiraName(
  value: { name?: string; rawName?: string } | undefined,
  target: string
): boolean {
  const normalizedTarget = normalizeJiraText(target);
  if (!value || !normalizedTarget) return false;
  return [value.name, value.rawName].some(
    (candidate) => normalizeJiraText(candidate) === normalizedTarget
  );
}

function uniqueWarnings(warnings: string[]): string[] {
  return Array.from(
    new Set(
      warnings
        .map((warning) => warning.trim())
        .filter(Boolean)
    )
  );
}

function buildTeamManagedBoardWarning(detail?: string): string {
  return detail
    ? `${TEAM_MANAGED_BOARD_WARNING_PREFIX}: ${detail}`
    : `${TEAM_MANAGED_BOARD_WARNING_PREFIX}.`;
}

function isProvidedJiraField(fieldKey: string, field?: JiraFieldMetadata): boolean {
  const normalizedKey = fieldKey.trim().toLowerCase();
  const normalizedName = normalizeFieldName(fieldKey, field);
  return (
    ["summary", "description", "project", "issuetype"].includes(normalizedKey) ||
    ["summary", "description", "project", "issue type"].includes(normalizedName)
  );
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function createJiraRequestError(statusCode: number, message: string): JiraRequestError {
  const error = new Error(message) as JiraRequestError;
  error.statusCode = statusCode;
  return error;
}

function getJiraRequestStatusCode(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const { statusCode } = error as JiraRequestError;
  return typeof statusCode === "number" ? statusCode : undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthHeader(credentials: JiraCredentials): string {
  return `Basic ${Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString("base64")}`;
}

export const INVALID_JIRA_TOKEN_MESSAGE =
  "The configured Jira API Token is invalid or expired. Update Antigravity Settings > Jira API Token and try again.";

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
          reject(createJiraRequestError(status, message));
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

export async function validateJiraCredentials(credentials: JiraCredentials): Promise<void> {
  try {
    await getJiraCurrentUserAccountId(credentials);
  } catch (error) {
    const statusCode = getJiraRequestStatusCode(error);
    if (statusCode === 401 || statusCode === 403) {
      throw new Error(INVALID_JIRA_TOKEN_MESSAGE, { cause: error });
    }
    throw error;
  }
}

export async function createJiraProject(
  credentials: JiraCredentials,
  details: JiraProjectDetails
): Promise<JiraProjectCreationResult> {
  const leadAccountId = await getJiraCurrentUserAccountId(credentials);
  const createdProject = await jiraRequest<{ id: string; key: string }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/project",
    body: {
      assigneeType: "PROJECT_LEAD",
      description: details.description?.trim() || undefined,
      key: details.key,
      leadAccountId,
      name: details.name,
      projectTemplateKey: JIRA_SOFTWARE_PROJECT_TEMPLATE_KEY,
      projectTypeKey: JIRA_SOFTWARE_PROJECT_TYPE_KEY
    }
  });

  const warnings = [
    ...(await syncTeamManagedProjectActors(credentials, createdProject.key, leadAccountId)),
    ...(await ensureTeamManagedProjectWorkflow(
      credentials,
      createdProject.id,
      createdProject.key
    )),
    ...(await ensureTeamManagedProjectBoardColumns(credentials, createdProject.key)),
    TEAM_MANAGED_ACCESS_WARNING,
  ];

  return {
    ...createdProject,
    warnings: uniqueWarnings(warnings)
  };
}

export async function getJiraProjects(
  credentials: JiraCredentials
): Promise<JiraProjectSummary[]> {
  const response = await jiraRequest<{ values?: JiraProjectSummary[] }>(credentials, {
    method: "GET",
    apiPath: "/rest/api/3/project/search?maxResults=100&orderBy=name"
  });
  return (response.values ?? []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchOpenUnassignedJiraIssues(
  credentials: JiraCredentials
): Promise<JiraIssueSummary[]> {
  const response = await jiraRequest<{ issues?: JiraIssueSearchResult[] }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/search/jql",
    body: {
      fields: ["summary", "issuetype", "project", "status"],
      jql: "assignee IS EMPTY AND statusCategory != Done ORDER BY updated DESC",
      maxResults: 100
    }
  });

  return (response.issues ?? [])
    .map(mapJiraIssueSearchResultToSummary)
    .filter((issue) => issue.id && issue.key && issue.summary);
}

async function searchOpenUnassignedTodoJiraIssueSearchResultsForProject(
  credentials: JiraCredentials,
  projectKey: string
): Promise<{ issues: JiraIssueSearchResult[]; normalizedProjectKey: string }> {
  const normalizedProjectKey = projectKey.trim().toUpperCase();
  const response = await jiraRequest<{ issues?: JiraIssueSearchResult[] }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/search/jql",
    body: {
      fields: ["summary", "issuetype", "project", "status", "issuelinks"],
      jql:
        `project = "${normalizedProjectKey}" AND assignee IS EMPTY AND statusCategory = "To Do" ORDER BY updated DESC`,
      maxResults: 100
    }
  });

  return {
    issues: response.issues ?? [],
    normalizedProjectKey
  };
}

export async function searchOpenTodoJiraIssuesForProject(
  credentials: JiraCredentials,
  projectKey: string
): Promise<JiraIssueSummary[]> {
  const normalizedProjectKey = projectKey.trim().toUpperCase();
  const response = await jiraRequest<{ issues?: JiraIssueSearchResult[] }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/search/jql",
    body: {
      fields: ["summary", "issuetype", "project", "status"],
      jql: `project = "${normalizedProjectKey}" AND statusCategory = "To Do" ORDER BY updated DESC`,
      maxResults: 100
    }
  });

  return (response.issues ?? [])
    .map(mapJiraIssueSearchResultToSummary)
    .filter((issue) => isProjectIssueSummaryValid(issue, normalizedProjectKey));
}

function mapJiraIssueSearchResultToSummary(issue: JiraIssueSearchResult): JiraIssueSummary {
  return {
    id: (issue.id ?? "").trim(),
    key: (issue.key ?? "").trim(),
    summary: (issue.fields?.summary ?? "").trim(),
    projectKey: (issue.fields?.project?.key ?? "").trim(),
    projectName: (issue.fields?.project?.name ?? "").trim(),
    issueTypeName: (issue.fields?.issuetype?.name ?? "").trim(),
    statusName: (issue.fields?.status?.name ?? "").trim()
  };
}

function isProjectIssueSummaryValid(issue: JiraIssueSummary, normalizedProjectKey: string): boolean {
  return Boolean(
    issue.id &&
    issue.key &&
    issue.summary &&
    issue.projectKey === normalizedProjectKey
  );
}

function getBlockingDependencyReference(
  link: JiraIssueLink
): BlockingDependencyReference | undefined {
  const inwardLabel = normalizeJiraText(link.type?.inward);
  if (link.inwardIssue && inwardLabel.includes("blocked by")) {
    return {
      issueKey: (link.inwardIssue.key ?? "").trim(),
      statusName: (link.inwardIssue.fields?.status?.name ?? "").trim()
    };
  }

  const outwardLabel = normalizeJiraText(link.type?.outward);
  if (link.outwardIssue && outwardLabel.includes("blocked by")) {
    return {
      issueKey: (link.outwardIssue.key ?? "").trim(),
      statusName: (link.outwardIssue.fields?.status?.name ?? "").trim()
    };
  }

  return undefined;
}

async function loadBlockingDependencyStatuses(
  credentials: JiraCredentials,
  issues: JiraIssueSearchResult[]
): Promise<Map<string, string>> {
  const missingIssueKeys = Array.from(
    new Set(
      issues
        .flatMap((issue) =>
          (issue.fields?.issuelinks ?? [])
            .map((link) => getBlockingDependencyReference(link))
            .filter((reference): reference is BlockingDependencyReference => Boolean(reference))
            .filter((reference) => reference.issueKey.length > 0 && reference.statusName.length === 0)
            .map((reference) => reference.issueKey)
        )
    )
  );

  if (missingIssueKeys.length === 0) {
    return new Map();
  }

  const response = await jiraRequest<{ issues?: JiraIssueSearchResult[] }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/search/jql",
    body: {
      fields: ["status"],
      jql: `key in (${missingIssueKeys.map((issueKey) => `"${issueKey}"`).join(", ")})`,
      maxResults: missingIssueKeys.length
    }
  });

  return new Map(
    (response.issues ?? [])
      .map((issue) => [
        (issue.key ?? "").trim(),
        (issue.fields?.status?.name ?? "").trim()
      ] as const)
      .filter(([issueKey]) => issueKey.length > 0)
  );
}

function hasIncompleteBlockingDependency(
  issue: JiraIssueSearchResult,
  blockingStatusesByKey: Map<string, string>
): boolean {
  return (issue.fields?.issuelinks ?? []).some((link) => {
    const reference = getBlockingDependencyReference(link);
    if (!reference) return false;

    const blockerStatus = normalizeJiraText(
      reference.statusName || blockingStatusesByKey.get(reference.issueKey)
    );
    return !ASSIGNABLE_BLOCKER_DONE_STATUSES.has(blockerStatus);
  });
}

export async function searchOpenUnassignedTodoJiraIssuesForProject(
  credentials: JiraCredentials,
  projectKey: string
): Promise<JiraIssueSummary[]> {
  const { issues, normalizedProjectKey } =
    await searchOpenUnassignedTodoJiraIssueSearchResultsForProject(credentials, projectKey);

  return issues
    .map(mapJiraIssueSearchResultToSummary)
    .filter((issue) => isProjectIssueSummaryValid(issue, normalizedProjectKey));
}

export async function searchOpenUnassignedTodoJiraIssuesForAssignment(
  credentials: JiraCredentials,
  projectKey: string
): Promise<JiraIssueSummary[]> {
  const { issues, normalizedProjectKey } =
    await searchOpenUnassignedTodoJiraIssueSearchResultsForProject(credentials, projectKey);
  const blockingStatusesByKey = await loadBlockingDependencyStatuses(credentials, issues);

  return issues
    .filter((issue) => !hasIncompleteBlockingDependency(issue, blockingStatusesByKey))
    .map(mapJiraIssueSearchResultToSummary)
    .filter((issue) => isProjectIssueSummaryValid(issue, normalizedProjectKey));
}

export async function searchOpenAssignedJiraIssuesForCurrentUser(
  credentials: JiraCredentials,
  projectKey: string
): Promise<JiraIssueSummary[]> {
  const currentUserAccountId = await getJiraCurrentUserAccountId(credentials);
  const normalizedProjectKey = projectKey.trim().toUpperCase();
  const response = await jiraRequest<{ issues?: JiraIssueSearchResult[] }>(credentials, {
    method: "POST",
    apiPath: "/rest/api/3/search/jql",
    body: {
      fields: ["summary", "issuetype", "project", "status", "assignee"],
      jql:
        `project = "${normalizedProjectKey}" AND assignee = currentUser() AND assignee IS NOT EMPTY AND status in ("To Do", "In Progress") ORDER BY updated DESC`,
      maxResults: 100
    }
  });

  return (response.issues ?? [])
    .filter((issue) => (issue.fields?.assignee?.accountId ?? "").trim() === currentUserAccountId)
    .map(mapJiraIssueSearchResultToSummary)
    .filter(
      (issue) =>
        isProjectIssueSummaryValid(issue, normalizedProjectKey) &&
        ["To Do", "In Progress"].includes(issue.statusName)
    );
}

export async function assignJiraIssueToCurrentUser(
  credentials: JiraCredentials,
  issueKey: string
): Promise<void> {
  const accountId = await getJiraCurrentUserAccountId(credentials);
  await jiraRequest(credentials, {
    method: "PUT",
    apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`,
    body: {
      accountId
    }
  });
}

export async function updateJiraIssueSummary(
  credentials: JiraCredentials,
  issueKey: string,
  summary: string
): Promise<void> {
  await updateJiraIssueSummaryAndLabels(credentials, issueKey, summary);
}

export async function updateJiraIssueSummaryAndLabels(
  credentials: JiraCredentials,
  issueKey: string,
  summary: string,
  labels?: string[]
): Promise<void> {
  await jiraRequest(credentials, {
    method: "PUT",
    apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}`,
    body: {
      fields: {
        summary: summary.trim(),
        ...(labels ? { labels } : {})
      }
    }
  });
}

async function clearJiraIssueAssignee(
  credentials: JiraCredentials,
  issueKey: string
): Promise<void> {
  await jiraRequest(credentials, {
    method: "PUT",
    apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`,
    body: {
      accountId: null
    }
  });
}

export async function transitionJiraIssueToStatus(
  credentials: JiraCredentials,
  issueKey: string,
  targetStatusName: string
): Promise<void> {
  const response = await jiraRequest<{
    transitions?: Array<{ id?: string; name?: string; to?: { name?: string; rawName?: string } }>;
  }>(credentials, {
    method: "GET",
    apiPath: `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`
  });

  const transitions = response.transitions ?? [];
  const normalizedTargetStatusName = normalizeJiraText(targetStatusName);
  const transition = transitions.find(
    (candidate) =>
      normalizeJiraText(candidate.name) === normalizedTargetStatusName ||
      matchesJiraName(candidate.to, targetStatusName)
  );

  if (!transition?.id) {
    const available = transitions
      .map((candidate) => {
        const transitionName = (candidate.name ?? "").trim();
        const targetName = (candidate.to?.name ?? candidate.to?.rawName ?? "").trim();
        if (transitionName && targetName && normalizeJiraText(transitionName) !== normalizeJiraText(targetName)) {
          return `${transitionName} -> ${targetName}`;
        }
        return transitionName || targetName;
      })
      .filter(Boolean)
      .join(", ");
    throw new Error(
      available
        ? `Transition "${targetStatusName}" is not available. Available transitions: ${available}.`
        : `Transition "${targetStatusName}" is not available for ${issueKey}.`
    );
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

export async function transitionJiraIssueToReviewOrDone(
  credentials: JiraCredentials,
  projectKey: string,
  issueKey: string
): Promise<JiraCompletionTransitionResult> {
  const isInReviewVisibleOnBoard = await isJiraBoardColumnVisible(
    credentials,
    projectKey,
    JIRA_STATUS_IN_REVIEW
  );

  if (isInReviewVisibleOnBoard === false) {
    try {
      await transitionJiraIssueToStatus(credentials, issueKey, JIRA_STATUS_DONE);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `"${JIRA_STATUS_IN_REVIEW}" is not visible on the Jira board, and moving ${issueKey} to "${JIRA_STATUS_DONE}" failed: ${message}`,
        { cause: error }
      );
    }

    return {
      fallbackReason: `"${JIRA_STATUS_IN_REVIEW}" is not visible on the Jira board.`,
      statusName: JIRA_STATUS_DONE
    };
  }

  try {
    await transitionJiraIssueToStatus(credentials, issueKey, JIRA_STATUS_IN_REVIEW);
    return { statusName: JIRA_STATUS_IN_REVIEW };
  } catch (reviewError) {
    const reviewMessage = reviewError instanceof Error ? reviewError.message : String(reviewError);

    try {
      await transitionJiraIssueToStatus(credentials, issueKey, JIRA_STATUS_DONE);
    } catch (doneError) {
      const doneMessage = doneError instanceof Error ? doneError.message : String(doneError);
      throw new Error(
        `Failed to move ${issueKey} to "${JIRA_STATUS_IN_REVIEW}" (${reviewMessage}) and fallback to "${JIRA_STATUS_DONE}" (${doneMessage}).`,
        { cause: doneError }
      );
    }

    return {
      fallbackReason: `moving to "${JIRA_STATUS_IN_REVIEW}" failed: ${reviewMessage}`,
      statusName: JIRA_STATUS_DONE
    };
  }
}

async function syncTeamManagedProjectActors(
  credentials: JiraCredentials,
  projectKey: string,
  currentUserAccountId: string
): Promise<string[]> {
  try {
    const roles = await jiraRequest<JiraProjectRoleDetails[]>(credentials, {
      method: "GET",
      apiPath:
        `/rest/api/3/project/${encodeURIComponent(projectKey)}/roledetails?excludeConnectAddons=true&excludeOtherServiceRoles=true`
    });
    const configurableRoles = roles.filter((role) => role.roleConfigurable !== false);

    if (configurableRoles.length === 0) {
      return [
        "Jira did not return any configurable team-managed roles, so the extension could not fully limit project actors automatically."
      ];
    }

    const adminRole =
      configurableRoles.find((role) => role.admin) ||
      configurableRoles.find((role) => {
        const label = normalizeJiraText(role.translatedName || role.name);
        return label.includes("administrator") || label.includes("admin");
      });

    const memberRoleCandidates = configurableRoles.filter(
      (role) => String(role.id ?? "") !== String(adminRole?.id ?? "")
    );
    const memberRole =
      memberRoleCandidates.find((role) =>
        normalizeJiraText(role.translatedName || role.name).includes("member")
      ) ||
      memberRoleCandidates.find((role) => role.default) ||
      memberRoleCandidates[0];

    const warnings: string[] = [];
    if (!adminRole) {
      warnings.push(
        "Jira did not expose an administrator role for the new project, so Diego Fernandez and site-admins could not be pinned to the expected admin role automatically."
      );
    }
    if (!memberRole) {
      warnings.push(
        "Jira did not expose a member role for the new project, so jira-users-diegosfb could not be pinned to the expected member role automatically."
      );
    }
    const shouldClearUnmatchedRoles = Boolean(adminRole && memberRole);

    for (const role of configurableRoles) {
      const roleId = String(role.id ?? "").trim();
      if (!roleId) continue;

      const isAdminRole = adminRole && roleId === String(adminRole.id ?? "");
      const isMemberRole = memberRole && roleId === String(memberRole.id ?? "");
      if (!isAdminRole && !isMemberRole && !shouldClearUnmatchedRoles) {
        continue;
      }

      const desiredGroups = isAdminRole
        ? TEAM_MANAGED_ADMIN_GROUPS
        : isMemberRole
          ? TEAM_MANAGED_MEMBER_GROUPS
          : [];
      const desiredUsers = isAdminRole ? [currentUserAccountId] : [];

      await replaceProjectRoleActors(credentials, projectKey, roleId, desiredGroups, desiredUsers);
    }

    return warnings;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      `The Jira project was created, but the extension could not fully sync the team-managed project actors automatically: ${message}`
    ];
  }
}

async function replaceProjectRoleActors(
  credentials: JiraCredentials,
  projectKey: string,
  roleId: string,
  desiredGroups: string[],
  desiredUsers: string[]
): Promise<void> {
  const role = await jiraRequest<JiraProjectRole>(credentials, {
    method: "GET",
    apiPath: `/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${encodeURIComponent(roleId)}`
  });
  const actors = role.actors ?? [];
  const groupActors = actors
    .map((actor) => ({
      groupId: (actor.actorGroup?.groupId ?? "").trim(),
      groupName: (actor.actorGroup?.name ?? actor.name ?? "").trim()
    }))
    .filter((actor) => actor.groupId || actor.groupName);
  const userActors = actors
    .map((actor) => (actor.actorUser?.accountId ?? "").trim())
    .filter(Boolean);

  const desiredGroupSet = new Set(desiredGroups.map((group) => group.trim()).filter(Boolean));
  const desiredUserSet = new Set(desiredUsers.map((user) => user.trim()).filter(Boolean));
  const desiredGroupNames = new Set(desiredGroupSet);
  const desiredGroupIds = new Set(
    Array.from(desiredGroupSet).filter((group) => /^[0-9a-f-]{36}$/i.test(group))
  );

  for (const actor of groupActors) {
    const isDesired =
      (actor.groupId && desiredGroupIds.has(actor.groupId)) ||
      (actor.groupName && desiredGroupNames.has(actor.groupName));
    if (isDesired) continue;

    const params = new URLSearchParams();
    if (actor.groupId) {
      params.set("groupId", actor.groupId);
    } else if (actor.groupName) {
      params.set("group", actor.groupName);
    } else {
      continue;
    }

    await jiraRequest<void>(credentials, {
      method: "DELETE",
      apiPath:
        `/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${encodeURIComponent(roleId)}?${params.toString()}`
    });
  }

  for (const accountId of userActors) {
    if (desiredUserSet.has(accountId)) continue;
    const params = new URLSearchParams({ user: accountId });
    await jiraRequest<void>(credentials, {
      method: "DELETE",
      apiPath:
        `/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${encodeURIComponent(roleId)}?${params.toString()}`
    });
  }

  const existingGroupNames = new Set(groupActors.map((actor) => actor.groupName).filter(Boolean));
  const existingGroupIds = new Set(groupActors.map((actor) => actor.groupId).filter(Boolean));
  const groupsToAdd = Array.from(desiredGroupSet).filter(
    (group) => !existingGroupNames.has(group) && !existingGroupIds.has(group)
  );
  if (groupsToAdd.length > 0) {
    await jiraRequest(credentials, {
      method: "POST",
      apiPath: `/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${encodeURIComponent(roleId)}`,
      body: {
        group: groupsToAdd
      }
    });
  }

  const existingUserIds = new Set(userActors);
  const usersToAdd = Array.from(desiredUserSet).filter((user) => !existingUserIds.has(user));
  if (usersToAdd.length > 0) {
    await jiraRequest(credentials, {
      method: "POST",
      apiPath: `/rest/api/3/project/${encodeURIComponent(projectKey)}/role/${encodeURIComponent(roleId)}`,
      body: {
        user: usersToAdd
      }
    });
  }
}

async function ensureTeamManagedProjectWorkflow(
  credentials: JiraCredentials,
  projectId: string,
  projectKey: string
): Promise<string[]> {
  try {
    const issueTypes = await getJiraIssueTypes(credentials, projectKey);
    if (issueTypes.length === 0) {
      return [
        "The Jira project was created, but Jira did not return any issue types for the new kanban board workflow setup."
      ];
    }

    const workflowResponse = await jiraRequest<JiraWorkflowReadResponse>(credentials, {
      method: "POST",
      apiPath: "/rest/api/3/workflows",
      body: {
        projectAndIssueTypes: issueTypes.map((issueType) => ({
          projectId,
          issueTypeId: issueType.id
        })),
        workflowIds: [],
        workflowNames: []
      }
    });

    const responseStatuses = workflowResponse.statuses ?? [];
    const responseWorkflows = workflowResponse.workflows ?? [];
    if (responseWorkflows.length === 0) {
      return [
        "The Jira project was created, but Jira did not return any editable workflows for the new kanban board setup."
      ];
    }

    const matchingWorkflows = responseWorkflows.filter((workflow) => isWorkflowForProject(workflow, projectId));
    const workflowsToInspect = matchingWorkflows.length > 0 ? matchingWorkflows : responseWorkflows;
    const statusByReference = new Map<string, JiraWorkflowStatusDocument>();
    for (const status of responseStatuses) {
      const reference = (status.statusReference ?? "").trim();
      if (!reference) continue;
      statusByReference.set(reference, { ...status });
    }

    const workflowsToUpdate: Array<{
      description: string;
      id: string;
      loopedTransitionContainerLayout?: { x?: number; y?: number };
      startPointLayout?: { x?: number; y?: number };
      statuses: JiraWorkflowStatusLayout[];
      transitions: JiraWorkflowTransitionDocument[];
      version: JiraWorkflowVersion;
    }> = [];
    const warnings: string[] = [];

    for (const workflow of workflowsToInspect) {
      const workflowId = (workflow.id ?? "").trim();
      const versionId = (workflow.version?.id ?? "").trim();
      if (!workflowId || !versionId) {
        warnings.push(
          `Jira skipped one of the project workflows because it did not include a stable workflow ID/version for updates.`
        );
        continue;
      }
      if (workflow.isEditable === false) {
        warnings.push(
          `Jira skipped workflow "${workflow.name ?? workflowId}" because Jira marked it as read-only.`
        );
        continue;
      }

      const workflowStatuses: JiraWorkflowStatusLayout[] = [...(workflow.statuses ?? [])];
      const workflowTransitions: JiraWorkflowTransitionDocument[] = (
        workflow.transitions ?? []
      ).map((transition) => ({
        actions: transition.actions ?? [],
        description: transition.description ?? "",
        id: transition.id ?? "",
        links: transition.links ?? [],
        name: transition.name ?? "",
        properties: transition.properties ?? {},
        toStatusReference: transition.toStatusReference,
        triggers: transition.triggers ?? [],
        type: transition.type ?? "DIRECTED",
        validators: transition.validators ?? []
      }));

      const toDoReference = findWorkflowStatusReference(
        workflowStatuses,
        statusByReference,
        JIRA_STATUS_TO_DO
      );
      const inProgressReference = findWorkflowStatusReference(
        workflowStatuses,
        statusByReference,
        JIRA_STATUS_IN_PROGRESS
      );
      const doneReference = findWorkflowStatusReference(
        workflowStatuses,
        statusByReference,
        JIRA_STATUS_DONE
      );

      if (!toDoReference || !inProgressReference || !doneReference) {
        warnings.push(
          `Jira skipped workflow "${workflow.name ?? workflowId}" because it did not expose the expected To Do, In Progress, and Done statuses.`
        );
        continue;
      }

      let changed = false;
      let inReviewReference = findWorkflowStatusReference(
        workflowStatuses,
        statusByReference,
        JIRA_STATUS_IN_REVIEW
      );

      if (!inReviewReference) {
        inReviewReference = randomUUID();
        statusByReference.set(inReviewReference, {
          description: "Work is ready for review.",
          name: JIRA_STATUS_IN_REVIEW,
          statusCategory: "IN_PROGRESS",
          statusReference: inReviewReference
        });
        workflowStatuses.push({
          layout: buildInReviewLayout(workflowStatuses, inProgressReference, doneReference),
          properties: {},
          statusReference: inReviewReference
        });
        changed = true;
      }

      if (!hasGlobalTransitionToStatus(workflowTransitions, inReviewReference)) {
        workflowTransitions.push(
          createGlobalTransition(
            nextTransitionId(workflowTransitions),
            JIRA_STATUS_IN_REVIEW,
            "Move a work item into review.",
            inReviewReference
          )
        );
        changed = true;
      }

      if (
        !hasGlobalTransitionToStatus(workflowTransitions, doneReference) &&
        !hasDirectedTransition(workflowTransitions, inReviewReference, doneReference)
      ) {
        workflowTransitions.push(
          createDirectedTransition(
            nextTransitionId(workflowTransitions),
            JIRA_STATUS_DONE,
            "Move a work item from review to done.",
            inReviewReference,
            doneReference,
            findToPortForStatus(workflowTransitions, doneReference)
          )
        );
        changed = true;
      }

      if (!changed) {
        continue;
      }

      workflowsToUpdate.push({
        description: workflow.description ?? "",
        id: workflowId,
        ...(workflow.loopedTransitionContainerLayout
          ? { loopedTransitionContainerLayout: workflow.loopedTransitionContainerLayout }
          : {}),
        ...(workflow.startPointLayout ? { startPointLayout: workflow.startPointLayout } : {}),
        statuses: workflowStatuses,
        transitions: workflowTransitions,
        version: workflow.version ?? { id: versionId }
      });
    }

    if (workflowsToUpdate.length === 0) {
      return uniqueWarnings(warnings);
    }

    const referencedStatusIds = new Set<string>();
    for (const workflow of workflowsToUpdate) {
      for (const status of workflow.statuses) {
        const reference = (status.statusReference ?? "").trim();
        if (reference) {
          referencedStatusIds.add(reference);
        }
      }
    }

    await jiraRequest(credentials, {
      method: "POST",
      apiPath: "/rest/api/3/workflows/update",
      body: {
        statuses: Array.from(referencedStatusIds)
          .map((reference) => statusByReference.get(reference))
          .filter((status): status is JiraWorkflowStatusDocument => Boolean(status))
          .map((status) => ({
            ...(status.id ? { id: status.id } : {}),
            description: status.description ?? "",
            name: status.name ?? "",
            statusCategory: status.statusCategory ?? "IN_PROGRESS",
            statusReference: status.statusReference ?? ""
          })),
        workflows: workflowsToUpdate
      }
    });

    return uniqueWarnings(warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      `The Jira project was created, but the extension could not fully add the team-managed In Review workflow state automatically: ${message}`
    ];
  }
}

function isWorkflowForProject(workflow: JiraWorkflowDocument, projectId: string): boolean {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) return false;
  if ((workflow.scope?.type ?? "").trim().toUpperCase() === "PROJECT") {
    const scopedProjectId = (workflow.scope?.project?.id ?? "").trim();
    if (!scopedProjectId || scopedProjectId === normalizedProjectId) {
      return true;
    }
  }

  return (workflow.queryContext ?? []).some(
    (queryContext) => (queryContext.project ?? "").trim() === normalizedProjectId
  );
}

function findWorkflowStatusReference(
  workflowStatuses: JiraWorkflowStatusLayout[],
  statusByReference: Map<string, JiraWorkflowStatusDocument>,
  targetStatusName: string
): string | undefined {
  for (const workflowStatus of workflowStatuses) {
    const reference = (workflowStatus.statusReference ?? "").trim();
    if (!reference) continue;
    if (matchesJiraName(statusByReference.get(reference), targetStatusName)) {
      return reference;
    }
  }
  return undefined;
}

function buildInReviewLayout(
  workflowStatuses: JiraWorkflowStatusLayout[],
  inProgressReference: string,
  doneReference: string
): { x: number; y: number } {
  const inProgressLayout = workflowStatuses.find(
    (status) => (status.statusReference ?? "").trim() === inProgressReference
  )?.layout;
  const doneLayout = workflowStatuses.find(
    (status) => (status.statusReference ?? "").trim() === doneReference
  )?.layout;
  const inProgressX = inProgressLayout?.x ?? 300;
  const doneX = doneLayout?.x ?? inProgressX + 200;
  const inProgressY = inProgressLayout?.y ?? doneLayout?.y ?? 0;

  return {
    x: Math.round((inProgressX + doneX) / 2),
    y: inProgressY
  };
}

function hasGlobalTransitionToStatus(
  transitions: JiraWorkflowTransitionDocument[],
  toStatusReference: string
): boolean {
  return transitions.some(
    (transition) =>
      normalizeJiraText(transition.type) === "global" &&
      (transition.toStatusReference ?? "").trim() === toStatusReference
  );
}

function hasDirectedTransition(
  transitions: JiraWorkflowTransitionDocument[],
  fromStatusReference: string,
  toStatusReference: string
): boolean {
  return transitions.some((transition) => {
    if (normalizeJiraText(transition.type) !== "directed") return false;
    if ((transition.toStatusReference ?? "").trim() !== toStatusReference) return false;
    return (transition.links ?? []).some(
      (link) => (link.fromStatusReference ?? "").trim() === fromStatusReference
    );
  });
}

function findToPortForStatus(
  transitions: JiraWorkflowTransitionDocument[],
  toStatusReference: string
): number {
  for (const transition of transitions) {
    if ((transition.toStatusReference ?? "").trim() !== toStatusReference) continue;
    for (const link of transition.links ?? []) {
      if (typeof link.toPort === "number") {
        return link.toPort;
      }
    }
  }
  return 0;
}

function nextTransitionId(transitions: JiraWorkflowTransitionDocument[]): string {
  const nextNumericId =
    transitions.reduce((maxId, transition) => {
      const parsedId = Number.parseInt((transition.id ?? "").trim(), 10);
      return Number.isFinite(parsedId) ? Math.max(maxId, parsedId) : maxId;
    }, 0) + 10;

  return String(nextNumericId);
}

function createGlobalTransition(
  id: string,
  name: string,
  description: string,
  toStatusReference: string
): JiraWorkflowTransitionDocument {
  return {
    actions: [],
    description,
    id,
    links: [],
    name,
    properties: {},
    toStatusReference,
    triggers: [],
    type: "GLOBAL",
    validators: []
  };
}

function createDirectedTransition(
  id: string,
  name: string,
  description: string,
  fromStatusReference: string,
  toStatusReference: string,
  toPort: number
): JiraWorkflowTransitionDocument {
  return {
    actions: [],
    description,
    id,
    links: [
      {
        fromPort: 0,
        fromStatusReference,
        toPort
      }
    ],
    name,
    properties: {},
    toStatusReference,
    triggers: [],
    type: "DIRECTED",
    validators: []
  };
}

async function ensureTeamManagedProjectBoardColumns(
  credentials: JiraCredentials,
  projectKey: string
): Promise<string[]> {
  try {
    const board = await getTeamManagedProjectBoard(credentials, projectKey);
    const boardId = String(board?.id ?? "").trim();
    if (!boardId) {
      return [
        buildTeamManagedBoardWarning(
          "Jira did not expose a kanban board for the new project."
        )
      ];
    }

    const inReviewStatusId = await getJiraProjectStatusIdByName(
      credentials,
      projectKey,
      JIRA_STATUS_IN_REVIEW
    );
    if (!inReviewStatusId) {
      return [
        buildTeamManagedBoardWarning(
          `Jira did not expose the "${JIRA_STATUS_IN_REVIEW}" status for the new project.`
        )
      ];
    }

    const rapidViewEditModel = await getRapidViewEditModel(credentials, boardId);
    const desiredMappedColumns = buildDesiredRapidViewMappedColumns(
      rapidViewEditModel.mappedColumns,
      inReviewStatusId
    );

    if (
      haveEquivalentRapidViewMappedColumns(
        rapidViewEditModel.mappedColumns,
        desiredMappedColumns
      )
    ) {
      return [];
    }

    await jiraRequest(credentials, {
      method: "PUT",
      apiPath: "/rest/greenhopper/1.0/rapidviewconfig/columns",
      body: {
        currentStatisticsField: rapidViewEditModel.currentStatisticsField,
        rapidViewId: rapidViewEditModel.rapidViewId,
        mappedColumns: desiredMappedColumns
      }
    });

    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [buildTeamManagedBoardWarning(message)];
  }
}

async function getJiraProjectBoard(
  credentials: JiraCredentials,
  projectKey: string,
  boardType?: string
): Promise<JiraBoardSummary | undefined> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const searchParams = new URLSearchParams({
      maxResults: "50",
      projectKeyOrId: projectKey
    });
    if (boardType?.trim()) {
      searchParams.set("type", boardType.trim());
    }

    const response = await jiraRequest<{ values?: JiraBoardSummary[] }>(credentials, {
      method: "GET",
      apiPath: `/rest/agile/1.0/board?${searchParams.toString()}`
    });
    const boards = (response.values ?? []).filter((board) =>
      String(board.id ?? "").trim()
    );
    if (boards.length > 0) {
      return boards[0];
    }
    if (attempt < 2) {
      await delay(500);
    }
  }

  return undefined;
}

async function getTeamManagedProjectBoard(
  credentials: JiraCredentials,
  projectKey: string
): Promise<JiraBoardSummary | undefined> {
  return getJiraProjectBoard(credentials, projectKey, "kanban");
}

async function getJiraProjectStatusIdByName(
  credentials: JiraCredentials,
  projectKey: string,
  statusName: string
): Promise<string | undefined> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await jiraRequest<JiraProjectIssueTypeStatuses>(credentials, {
      method: "GET",
      apiPath: `/rest/api/3/project/${encodeURIComponent(projectKey)}/statuses`
    });

    const matchingStatusIds = Array.from(
      new Set(
        response
          .flatMap((issueType) => issueType.statuses ?? [])
          .filter((status) => normalizeJiraText(status.name) === normalizeJiraText(statusName))
          .map((status) => (status.id ?? "").trim())
          .filter(Boolean)
      )
    );

    if (matchingStatusIds.length > 0) {
      return matchingStatusIds[0];
    }

    if (attempt < 4) {
      await delay(300);
    }
  }

  return undefined;
}

async function getRapidViewEditModel(
  credentials: JiraCredentials,
  boardId: string
): Promise<{
  currentStatisticsField: JiraRapidViewStatisticsField;
  mappedColumns: JiraRapidViewMappedColumn[];
  rapidViewId: number | string;
}> {
  try {
    const editModel = await jiraRequest<JiraRapidViewEditModel>(credentials, {
      method: "GET",
      apiPath:
        `/rest/greenhopper/1.0/rapidviewconfig/editmodel?rapidViewId=${encodeURIComponent(boardId)}`
    });

    const mappedColumns = (editModel.mappedColumns ?? []).map(sanitizeRapidViewMappedColumn);
    if (mappedColumns.length > 0) {
      return {
        currentStatisticsField: normalizeRapidViewStatisticsField(
          editModel.currentStatisticsField
        ),
        mappedColumns,
        rapidViewId: editModel.rapidViewId ?? boardId
      };
    }
  } catch {
    // Fall back to the public board configuration payload if Jira rejects editmodel.
  }

  const boardConfiguration = await jiraRequest<JiraBoardConfiguration>(credentials, {
    method: "GET",
    apiPath: `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/configuration`
  });
  const mappedColumns = (boardConfiguration.columnConfig?.columns ?? []).map((column) =>
    sanitizeRapidViewMappedColumn({
      ...(typeof column.max === "number" ? { max: column.max } : {}),
      ...(typeof column.min === "number" ? { min: column.min } : {}),
      isKanPlanColumn: false,
      mappedStatuses: (column.statuses ?? []).map((status) => ({
        id: (status.id ?? "").trim()
      })),
      name: column.name ?? ""
    })
  );

  if (mappedColumns.length === 0) {
    throw new Error("Jira did not return any editable board columns for the new project.");
  }

  return {
    currentStatisticsField: {
      id: (boardConfiguration.estimation?.field?.fieldId ?? "none_").trim() || "none_"
    },
    mappedColumns,
    rapidViewId: boardId
  };
}

async function isJiraBoardColumnVisible(
  credentials: JiraCredentials,
  projectKey: string,
  columnName: string
): Promise<boolean | undefined> {
  try {
    const board = await getJiraProjectBoard(credentials, projectKey);
    const boardId = String(board?.id ?? "").trim();
    if (!boardId) {
      return undefined;
    }

    const boardConfiguration = await jiraRequest<JiraBoardConfiguration>(credentials, {
      method: "GET",
      apiPath: `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/configuration`
    });

    const columns = boardConfiguration.columnConfig?.columns ?? [];
    return columns.some(
      (column) => normalizeJiraText(column.name) === normalizeJiraText(columnName)
    );
  } catch {
    return undefined;
  }
}

function normalizeRapidViewStatisticsField(
  field: JiraRapidViewStatisticsField | undefined
): JiraRapidViewStatisticsField {
  const id = (field?.id ?? "").trim();
  return { id: id || "none_" };
}

function sanitizeRapidViewMappedColumn(
  column: JiraRapidViewMappedColumn
): JiraRapidViewMappedColumn {
  return {
    ...(typeof column.isKanPlanColumn === "boolean"
      ? { isKanPlanColumn: column.isKanPlanColumn }
      : {}),
    ...(typeof column.max === "number" ? { max: column.max } : {}),
    ...(typeof column.min === "number" ? { min: column.min } : {}),
    mappedStatuses: uniqueRapidViewMappedStatuses(column.mappedStatuses ?? []),
    name: (column.name ?? "").trim()
  };
}

function uniqueRapidViewMappedStatuses(
  statuses: JiraRapidViewMappedStatus[]
): JiraRapidViewMappedStatus[] {
  const seenIds = new Set<string>();
  const uniqueStatuses: JiraRapidViewMappedStatus[] = [];

  for (const status of statuses) {
    const id = (status.id ?? "").trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    uniqueStatuses.push({ id });
  }

  return uniqueStatuses;
}

function buildDesiredRapidViewMappedColumns(
  mappedColumns: JiraRapidViewMappedColumn[],
  inReviewStatusId: string
): JiraRapidViewMappedColumn[] {
  const sanitizedColumns = mappedColumns.map(sanitizeRapidViewMappedColumn);
  const normalizedInReviewStatusId = inReviewStatusId.trim();
  const isReviewColumn = (column: JiraRapidViewMappedColumn): boolean =>
    normalizeJiraText(column.name) === normalizeJiraText(JIRA_STATUS_IN_REVIEW) ||
    (column.mappedStatuses ?? []).some(
      (status) => (status.id ?? "").trim() === normalizedInReviewStatusId
    );

  const reviewColumn =
    sanitizedColumns.find(isReviewColumn) ??
    sanitizeRapidViewMappedColumn({
      isKanPlanColumn: false,
      mappedStatuses: [{ id: normalizedInReviewStatusId }],
      name: JIRA_STATUS_IN_REVIEW
    });

  const baseColumns = sanitizedColumns
    .filter((column) => !isReviewColumn(column))
    .map((column) =>
      sanitizeRapidViewMappedColumn({
        ...column,
        mappedStatuses: (column.mappedStatuses ?? []).filter(
          (status) => (status.id ?? "").trim() !== normalizedInReviewStatusId
        )
      })
    );

  const normalizedReviewColumn = sanitizeRapidViewMappedColumn({
    ...reviewColumn,
    isKanPlanColumn: reviewColumn.isKanPlanColumn ?? false,
    mappedStatuses: [{ id: normalizedInReviewStatusId }],
    name: JIRA_STATUS_IN_REVIEW
  });

  const desiredColumns = [...baseColumns];
  const inProgressIndex = findRapidViewMappedColumnIndexByName(
    desiredColumns,
    JIRA_STATUS_IN_PROGRESS
  );
  const doneIndex = findRapidViewMappedDoneColumnIndex(desiredColumns);

  let insertIndex = doneIndex === -1 ? desiredColumns.length : doneIndex;
  if (inProgressIndex !== -1) {
    insertIndex = doneIndex === -1 ? inProgressIndex + 1 : Math.min(doneIndex, inProgressIndex + 1);
  }
  if (insertIndex < 0) {
    insertIndex = 0;
  }

  desiredColumns.splice(insertIndex, 0, normalizedReviewColumn);
  return desiredColumns;
}

function findRapidViewMappedColumnIndexByName(
  mappedColumns: JiraRapidViewMappedColumn[],
  statusName: string
): number {
  return mappedColumns.findIndex(
    (column) => normalizeJiraText(column.name) === normalizeJiraText(statusName)
  );
}

function findRapidViewMappedDoneColumnIndex(
  mappedColumns: JiraRapidViewMappedColumn[]
): number {
  const namedDoneIndex = findRapidViewMappedColumnIndexByName(
    mappedColumns,
    JIRA_STATUS_DONE
  );
  if (namedDoneIndex !== -1) {
    return namedDoneIndex;
  }

  return mappedColumns.length > 0 ? mappedColumns.length - 1 : -1;
}

function haveEquivalentRapidViewMappedColumns(
  left: JiraRapidViewMappedColumn[],
  right: JiraRapidViewMappedColumn[]
): boolean {
  return (
    JSON.stringify(simplifyRapidViewMappedColumns(left)) ===
    JSON.stringify(simplifyRapidViewMappedColumns(right))
  );
}

function simplifyRapidViewMappedColumns(
  mappedColumns: JiraRapidViewMappedColumn[]
): Array<{
  isKanPlanColumn: boolean;
  mappedStatusIds: string[];
  max?: number;
  min?: number;
  name: string;
}> {
  return mappedColumns.map((column) => {
    const sanitizedColumn = sanitizeRapidViewMappedColumn(column);
    return {
      ...(typeof sanitizedColumn.max === "number" ? { max: sanitizedColumn.max } : {}),
      ...(typeof sanitizedColumn.min === "number" ? { min: sanitizedColumn.min } : {}),
      isKanPlanColumn: Boolean(sanitizedColumn.isKanPlanColumn),
      mappedStatusIds: (sanitizedColumn.mappedStatuses ?? []).map(
        (status) => status.id ?? ""
      ),
      name: sanitizedColumn.name ?? ""
    };
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
  return (response.issueTypes ?? []).filter(
    (issueType) => issueType.name.trim().toLowerCase() !== "sub-task"
  );
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
  const autoPopulatedFieldKeys = new Set<string>();

  const metadata = await getJiraCreateFieldMetadata(credentials, details.projectKey, issueType.id);
  let currentUserAccountId: string | undefined;

  for (const [fieldKey, field] of Object.entries(metadata)) {
    if (!field.required) continue;
    const fieldName = normalizeFieldName(fieldKey, field);

    if (fieldName === "epic name") {
      fields[fieldKey] = details.summary.trim();
      autoPopulatedFieldKeys.add(fieldKey);
      continue;
    }

    if (fieldName === "reporter") {
      currentUserAccountId ||= await getJiraCurrentUserAccountId(credentials);
      fields[fieldKey] = { accountId: currentUserAccountId };
      autoPopulatedFieldKeys.add(fieldKey);
    }
  }

  const unsupportedRequiredFields = Object.entries(metadata)
    .filter(([fieldKey, field]) => {
      if (!field.required) return false;
      if (isProvidedJiraField(fieldKey, field)) return false;
      return fields[fieldKey] === undefined;
    })
    .map(([, field]) => field.name || "Unknown field");

  if (unsupportedRequiredFields.length > 0) {
    throw new Error(
      `Jira requires additional fields for this issue type: ${unsupportedRequiredFields.join(", ")}.`
    );
  }

  const createIssueRequest = () =>
    jiraRequest<{ id: string; key: string; self: string }>(credentials, {
      method: "POST",
      apiPath: "/rest/api/3/issue",
      body: { fields }
    });

  try {
    const createdIssue = await createIssueRequest();
    await clearJiraIssueAssignee(credentials, createdIssue.key);
    return createdIssue;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unsupportedFieldKeys = Array.from(
      message.matchAll(/Field '([^']+)' cannot be set\./g),
      (match) => match[1]
    );

    const retryableFieldKeys = unsupportedFieldKeys.filter((fieldKey) =>
      autoPopulatedFieldKeys.has(fieldKey)
    );

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
