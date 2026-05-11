"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JIRA_PROJECT_CREATION_SKILL_NAME = exports.JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME = void 0;
exports.buildCreateJiraProjectAgenticHarnessEnvironment = buildCreateJiraProjectAgenticHarnessEnvironment;
exports.buildCreateJiraProjectAgenticHarnessPrompt = buildCreateJiraProjectAgenticHarnessPrompt;
exports.copyJiraProjectCreationSkill = copyJiraProjectCreationSkill;
const bundledProjectSkill_1 = require("./bundledProjectSkill");
exports.JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME = "DSFB: Software Simplified Workflow Scheme";
exports.JIRA_PROJECT_CREATION_SKILL_NAME = "jira-project-creation";
function buildCreateJiraProjectAgenticHarnessEnvironment(credentials) {
    return {
        JIRA_BASE_URL: credentials.baseUrl,
        JIRA_EMAIL: credentials.email,
        JIRA_API_TOKEN: credentials.apiToken
    };
}
function buildCreateJiraProjectAgenticHarnessPrompt(details) {
    const description = details.description?.trim();
    const instructions = [
        `Use skill ${exports.JIRA_PROJECT_CREATION_SKILL_NAME} for the Jira project creation in this same run.`,
        "Use the Jira tools available in this harness to create a Jira Software project.",
        "Use the Jira account already configured in the terminal environment via JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN from the extension Settings.",
        `Project name: ${details.projectName}.`,
        `Project key: ${details.projectKey}.`,
        "Create it as a company-managed project, not a team-managed project.",
        `Select the workflow scheme "${exports.JIRA_COMPANY_MANAGED_WORKFLOW_SCHEME}".`,
        description
            ? `Use this project description: ${description}.`
            : "Leave the project description blank unless Jira requires one.",
        "If Jira creates the project before the workflow scheme can be changed, open Project settings, go to Workflows, choose Switch Scheme, select the required workflow scheme, and complete the association.",
        "Do not tell the user to create the project manually unless you are blocked by missing access or permissions.",
        "When the project is ready, stop and report the created project key."
    ];
    return instructions.join(" ");
}
async function copyJiraProjectCreationSkill(extensionRoot, projectRoot) {
    return (0, bundledProjectSkill_1.copyBundledSkillToProject)(extensionRoot, projectRoot, exports.JIRA_PROJECT_CREATION_SKILL_NAME);
}
//# sourceMappingURL=jiraProjectHarness.js.map