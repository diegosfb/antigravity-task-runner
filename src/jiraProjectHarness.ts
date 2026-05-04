export const JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME =
  "DSFB: Software Simplified Workflow Scheme";
export const JIRA_PROJECT_CREATION_SKILL_NAME = "jira-project-creation";

export type JiraProjectHarnessRequest = {
  projectName: string;
  projectKey: string;
  description?: string;
};

export type JiraProjectHarnessCredentials = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

export function buildCreateJiraProjectAgenticHarnessEnvironment(
  credentials: JiraProjectHarnessCredentials
): Record<string, string> {
  return {
    JIRA_BASE_URL: credentials.baseUrl,
    JIRA_EMAIL: credentials.email,
    JIRA_API_TOKEN: credentials.apiToken
  };
}

export function buildEnsureJiraProjectCreationSkillPrompt(skillSourcePath: string): string {
  const instructions = [
    `Check whether the project skill "${JIRA_PROJECT_CREATION_SKILL_NAME}" is already available in this repository.`,
    `Look for it in .agent/skills/${JIRA_PROJECT_CREATION_SKILL_NAME} and .claude/skills/${JIRA_PROJECT_CREATION_SKILL_NAME}.`,
    `If it is missing, install it from ${skillSourcePath}.`,
    `Create .agent/skills if needed, then symlink or copy ${skillSourcePath} to .agent/skills/${JIRA_PROJECT_CREATION_SKILL_NAME}.`,
    "If .claude/skills does not exist, create it as a symlink to ../.agent/skills so future agent runs can use the project skills.",
    `Verify that .agent/skills/${JIRA_PROJECT_CREATION_SKILL_NAME}/SKILL.md exists after the install.`,
    "Do not create the Jira project in this run. Stop after the skill is confirmed available."
  ];
  return instructions.join(" ");
}

export function buildCreateJiraProjectAgenticHarnessPrompt(
  details: JiraProjectHarnessRequest
): string {
  const description = details.description?.trim();
  const instructions = [
    `Use the installed project skill "${JIRA_PROJECT_CREATION_SKILL_NAME}" for this task.`,
    "Use the Jira tools available in this harness to create a Jira Software project.",
    "Use the Jira account already configured in the terminal environment via JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN from the extension Settings.",
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
