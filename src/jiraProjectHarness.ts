export const JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME =
  "DSFB: Software Simplified Workflow Scheme";

export type JiraProjectHarnessRequest = {
  projectName: string;
  projectKey: string;
  description?: string;
};

export function buildCreateJiraProjectAgenticHarnessPrompt(
  details: JiraProjectHarnessRequest
): string {
  const description = details.description?.trim();
  const instructions = [
    "Use the Jira tools available in this harness to create a Jira Software project.",
    `Project name: ${details.projectName}.`,
    `Project key: ${details.projectKey}.`,
    "Create it as a company-managed project, not a team-managed project.",
    `Select the workflow scheme "${JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME}".`,
    description
      ? `Use this project description: ${description}.`
      : "Leave the project description blank unless Jira requires one.",
    "If Jira creates the project before the workflow scheme can be changed, open Project settings, go to Workflows, choose Switch Scheme, select the required workflow scheme, and complete the association.",
    "Do not tell the user to create the project manually unless you are blocked by missing access or permissions.",
    "When the project is ready, stop and report the created project key."
  ];
  return instructions.join(" ");
}
