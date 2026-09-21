"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROJECT_STRUCTURE_AND_AGENTS_REPOSITORY = exports.DEFAULT_GITHUB_CODE_REVIEWER = exports.LOCAL_LITELLM_READY_URL = void 0;
exports.isLocalLiteLLMBaseUrl = isLocalLiteLLMBaseUrl;
exports.readClaudeAnthropicBaseUrl = readClaudeAnthropicBaseUrl;
exports.normalizeStringArray = normalizeStringArray;
exports.getToolRunCommand = getToolRunCommand;
exports.getRouterSettings = getRouterSettings;
exports.loadOpenRouterConfig = loadOpenRouterConfig;
exports.loadClaudeSettings = loadClaudeSettings;
exports.getNonce = getNonce;
exports.getAgenticHarnessExecutionCommand = getAgenticHarnessExecutionCommand;
exports.getLightAgenticHarnessExecutionCommand = getLightAgenticHarnessExecutionCommand;
exports.getDefaultGithubCodeReviewer = getDefaultGithubCodeReviewer;
exports.getBuildCommand = getBuildCommand;
exports.getProjectTestingCommand = getProjectTestingCommand;
exports.getUseAgentForGithubRepositoryManagement = getUseAgentForGithubRepositoryManagement;
exports.getUseExternalTerminal = getUseExternalTerminal;
exports.getSdlcSettingsPath = getSdlcSettingsPath;
exports.writeSdlcWorkflowSettings = writeSdlcWorkflowSettings;
exports.renderAntigravitySettingsHtml = renderAntigravitySettingsHtml;
exports.renderAgenticSetupHtml = renderAgenticSetupHtml;
exports.renderClaudeModelConfigHtml = renderClaudeModelConfigHtml;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
exports.LOCAL_LITELLM_READY_URL = "http://localhost:4000/health";
exports.DEFAULT_GITHUB_CODE_REVIEWER = "";
exports.DEFAULT_PROJECT_STRUCTURE_AND_AGENTS_REPOSITORY = "https://github.com/diegosfb/antigravity-task-runner";
function isLocalLiteLLMBaseUrl(baseUrl) {
    if (!baseUrl)
        return false;
    return (baseUrl.startsWith("http://localhost") || baseUrl.startsWith("http://127.0.0.1"));
}
async function readClaudeAnthropicBaseUrl(repoRoot) {
    // Check project-level override first
    const projectSettings = path.join(repoRoot, ".agent", "claude", "settings.json");
    if (fs.existsSync(projectSettings)) {
        try {
            const raw = await fs.promises.readFile(projectSettings, "utf8");
            const data = JSON.parse(raw);
            const envRaw = typeof data["env"] === "object" && data["env"] ? data["env"] : {};
            const env = envRaw;
            if (typeof env["ANTHROPIC_BASE_URL"] === "string")
                return env["ANTHROPIC_BASE_URL"];
        }
        catch {
            // fall through
        }
    }
    // Fall back to global claude settings
    const globalSettings = path.join(os.homedir(), ".claude", "settings.json");
    if (fs.existsSync(globalSettings)) {
        try {
            const raw = await fs.promises.readFile(globalSettings, "utf8");
            const data = JSON.parse(raw);
            const envRaw = typeof data["env"] === "object" && data["env"] ? data["env"] : {};
            const env = envRaw;
            if (typeof env["ANTHROPIC_BASE_URL"] === "string")
                return env["ANTHROPIC_BASE_URL"];
        }
        catch {
            // fall through
        }
    }
    return undefined;
}
function parseOptionalString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}
function mergeUniqueStrings(...groups) {
    const merged = [];
    for (const group of groups) {
        for (const value of normalizeStringArray(group)) {
            const normalized = value.trim();
            if (normalized.length === 0 || merged.includes(normalized))
                continue;
            merged.push(normalized);
        }
    }
    return merged;
}
function getToolRunCommand(config, name) {
    const raw = config["tool-run"];
    if (!raw || typeof raw !== "object")
        return undefined;
    const data = raw;
    return typeof data[name] === "string" ? data[name].trim() : undefined;
}
function getRouterSettings(config, router) {
    const key = `${router}-settings`;
    const raw = config[key];
    if (!raw || typeof raw !== "object")
        return undefined;
    const data = raw;
    return {
        baseurl: typeof data["baseurl"] === "string" ? data["baseurl"] : "",
        auth_token: typeof data["auth_token"] === "string" ? data["auth_token"] : "",
        apikey: typeof data["apikey"] === "string" ? data["apikey"] : "",
        models: normalizeStringArray(data["models"]),
        post_run: parseOptionalString(data["post_run"]),
        mandatory_params: normalizeStringArray(data["mandatory_params"])
    };
}
async function loadOpenRouterConfig() {
    const filePath = path.join(os.homedir(), ".claude", "routerconfig.json");
    if (!fs.existsSync(filePath)) {
        void vscode.window.showErrorMessage("routerconfig.json not found at ~/.claude/routerconfig.json");
        return null;
    }
    try {
        const raw = await fs.promises.readFile(filePath, "utf8");
        return JSON.parse(raw);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to read routerconfig.json: ${message}`);
        return null;
    }
}
async function loadClaudeSettings() {
    const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
    if (!fs.existsSync(settingsPath))
        return null;
    try {
        const raw = await fs.promises.readFile(settingsPath, "utf8");
        const data = JSON.parse(raw);
        const envRaw = typeof data["env"] === "object" && data["env"] ? data["env"] : {};
        return {
            env: {
                ANTHROPIC_MODEL: parseOptionalString(envRaw["ANTHROPIC_MODEL"]),
                ANTHROPIC_BASE_URL: parseOptionalString(envRaw["ANTHROPIC_BASE_URL"]),
                ANTHROPIC_AUTH_TOKEN: parseOptionalString(envRaw["ANTHROPIC_AUTH_TOKEN"]),
                ANTHROPIC_API_KEY: parseOptionalString(envRaw["ANTHROPIC_API_KEY"])
            },
            effortLevel: parseOptionalString(data["effortLevel"]),
            model: parseOptionalString(data["model"])
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        void vscode.window.showErrorMessage(`Failed to read ~/.claude/settings.json: ${message}`);
        return null;
    }
}
function getNonce() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 32; i += 1) {
        nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
}
const DEFAULT_AGENTIC_HARNESS_EXECUTION_COMMANDS = [
    "claude",
    "claude --model claude-haiku-4-5-20251001",
    "codex",
    "opencode run",
    "opencode run -m ollama/qwen3-coder:30b",
    "opencode run -m ollama/qwen3-coder:480b-cloud",
    "opencode run -m ollama/gpt-oss:20-cloud"
];
const DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS = [
    "claude --model claude-haiku-4-5-20251001",
    "opencode run -m ollama/qwen3-coder:30b",
    "gemini"
];
const APPROVAL_GATE_OPTIONS = [
    {
        value: "required",
        description: "Validate the artifact, show it to the user, and wait for explicit approval before moving forward."
    },
    {
        value: "skip",
        description: "Validate the artifact and record that review was skipped, then continue without asking for user approval."
    }
];
const BOOLEAN_OPTIONS = {
    true: "Enabled.",
    false: "Disabled."
};
const SDLC_WRITABLE_PATHS = new Set([
    "spoken_plan.enabled",
    "spoken_plan.interrupted_by_next_command",
    "user_approval_gates.configurable.prd",
    "user_approval_gates.configurable.specifications",
    "user_approval_gates.configurable.ux_ui_design",
    "user_approval_gates.configurable.architecture",
    "user_approval_gates.configurable.backlog_plan",
    "user_approval_gates.configurable.test_plan",
    "user_approval_gates.configurable.pull_request_creation",
    "product_pre_mortem.enabled",
    "llm_judge.trigger_mode",
    "llm_judge.judge_provider",
    "llm_judge.judge_command",
    "spec_validation.drift_check_mode",
    "spec_validation.red_team_mode",
    "security_check.pre_commit",
    "security_check.pre_pr",
    "test_red_team.trigger_mode",
    "developer_git_workflow.mode",
    "developer_git_workflow.run_pre_commit_hooks",
    "developer_git_workflow.run_pre_pr_hooks",
    "developer_git_workflow.post_pr_branch",
    "test_failure_tracking.track_in_backlog",
    "obsidian_vault.enabled",
    "obsidian_vault.vault_path",
    "obsidian_vault.link_mode"
]);
function getAgenticHarnessExecutionCommand() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return ((config.get("agenticHarnessExecutionCommand") || "").trim() ||
        DEFAULT_AGENTIC_HARNESS_EXECUTION_COMMANDS[0]);
}
function getLightAgenticHarnessExecutionCommand() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return ((config.get("lightAgenticHarnessExecutionCommand") || "").trim() ||
        DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS[0]);
}
function getDefaultGithubCodeReviewer() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return ((config.get("defaultGithubCodeReviewer") || "").trim() ||
        exports.DEFAULT_GITHUB_CODE_REVIEWER);
}
function getBuildCommand() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return (config.get("buildCommand") || "").trim();
}
function getProjectTestingCommand() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return (config.get("projectTestingCommand") || "").trim();
}
function getUseAgentForGithubRepositoryManagement() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return config.get("useAgentForGithubRepositoryManagement") ?? true;
}
function getUseExternalTerminal() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return config.get("useExternalTerminal") ?? true;
}
function getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    return folders[0].uri.fsPath;
}
function getBundledSdlcSettingsPath() {
    return path.resolve(__dirname, "..", "ADLC_workflow_settings.json");
}
function getSdlcSettingsPath(repoRoot) {
    return path.join(repoRoot, "ADLC_workflow_settings.json");
}
function readJsonFile(filePath) {
    if (!fs.existsSync(filePath))
        return undefined;
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : undefined;
    }
    catch {
        return undefined;
    }
}
function loadSdlcSettingsData(repoRoot) {
    if (repoRoot) {
        const projectSettings = readJsonFile(getSdlcSettingsPath(repoRoot));
        if (projectSettings)
            return projectSettings;
    }
    return readJsonFile(getBundledSdlcSettingsPath()) || {};
}
function getNestedValue(data, dottedPath) {
    let current = data;
    for (const part of dottedPath.split(".")) {
        if (!current || typeof current !== "object" || Array.isArray(current))
            return undefined;
        current = current[part];
    }
    return current;
}
function setNestedValue(data, dottedPath, value) {
    const parts = dottedPath.split(".");
    let current = data;
    for (const part of parts.slice(0, -1)) {
        const next = current[part];
        if (!next || typeof next !== "object" || Array.isArray(next)) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
function optionList(options) {
    if (!options)
        return [];
    return Object.entries(options).map(([value, description]) => ({ value, description }));
}
function booleanOptionDescription(data, optionsPath, trueKey = "true", falseKey = "false") {
    const options = getNestedValue(data, optionsPath);
    if (!options || typeof options !== "object" || Array.isArray(options)) {
        return `True: ${BOOLEAN_OPTIONS.true}\nFalse: ${BOOLEAN_OPTIONS.false}`;
    }
    const typedOptions = options;
    const trueDescription = typeof typedOptions[trueKey] === "string" ? typedOptions[trueKey] : BOOLEAN_OPTIONS.true;
    const falseDescription = typeof typedOptions[falseKey] === "string" ? typedOptions[falseKey] : BOOLEAN_OPTIONS.false;
    return `True: ${trueDescription}\nFalse: ${falseDescription}`;
}
function stringValue(data, dottedPath, fallback = "") {
    const value = getNestedValue(data, dottedPath);
    return typeof value === "string" ? value : fallback;
}
function booleanValue(data, dottedPath, fallback) {
    const value = getNestedValue(data, dottedPath);
    return typeof value === "boolean" ? value : fallback;
}
function selectOptions(data, dottedPath) {
    const value = getNestedValue(data, dottedPath);
    return value && typeof value === "object" && !Array.isArray(value)
        ? optionList(value)
        : [];
}
function getSdlcSettingsGroups(repoRoot) {
    const data = loadSdlcSettingsData(repoRoot);
    const gateField = (key, label) => ({
        path: `user_approval_gates.configurable.${key}`,
        label,
        description: "Controls whether Task Runner asks for explicit user approval after validating this artifact.",
        note: stringValue(data, "user_approval_gates._notes"),
        type: "select",
        value: stringValue(data, `user_approval_gates.configurable.${key}`, "required"),
        options: APPROVAL_GATE_OPTIONS
    });
    const mandatoryGateField = (key, label) => ({
        path: `user_approval_gates.mandatory.${key}`,
        label,
        description: "Policy-locked approval gate. It is shown for visibility and cannot be changed here.",
        note: stringValue(data, "user_approval_gates._notes"),
        type: "select",
        value: stringValue(data, `user_approval_gates.mandatory.${key}`, "required"),
        options: APPROVAL_GATE_OPTIONS,
        readonly: true
    });
    return [
        {
            title: "Plan Narration",
            description: "Audio narration settings for implementation plans. These never replace written plans or approval gates.",
            fields: [
                {
                    path: "spoken_plan.enabled",
                    label: "Spoken Plan",
                    description: "Play a safe conversational audio explanation of an implementation plan before approval.",
                    note: booleanOptionDescription(data, "spoken_plan._options"),
                    type: "checkbox",
                    value: booleanValue(data, "spoken_plan.enabled", false)
                },
                {
                    path: "spoken_plan.interrupted_by_next_command",
                    label: "Interrupt Narration On Next Command",
                    description: "Stop any active plan narration before processing the next user message.",
                    note: booleanOptionDescription(data, "spoken_plan._options", "interrupted_by_next_command_true", "interrupted_by_next_command_false"),
                    type: "checkbox",
                    value: booleanValue(data, "spoken_plan.interrupted_by_next_command", false)
                }
            ]
        },
        {
            title: "User Approval Gates",
            description: "Configurable artifact review gates. Validation always runs; this controls whether user approval is requested.",
            fields: [
                gateField("prd", "PRD Approval"),
                gateField("specifications", "Specifications Approval"),
                gateField("ux_ui_design", "UX/UI Design Approval"),
                gateField("architecture", "Architecture Approval"),
                gateField("backlog_plan", "Backlog Plan Approval"),
                gateField("test_plan", "Test Plan Approval"),
                gateField("pull_request_creation", "Pull Request Creation Approval"),
                mandatoryGateField("implementation_plan", "Implementation Plan Approval"),
                mandatoryGateField("pull_request_merge", "Pull Request Merge Approval"),
                mandatoryGateField("production_release", "Production Release Approval")
            ]
        },
        {
            title: "Review And Risk Agents",
            description: "Optional product, architecture, specification, security, and red-team review automation.",
            fields: [
                {
                    path: "product_pre_mortem.enabled",
                    label: "Product Pre-Mortem",
                    description: "Run pre-mortem risk analysis before PRD handoff.",
                    note: booleanOptionDescription(data, "product_pre_mortem._options"),
                    type: "checkbox",
                    value: booleanValue(data, "product_pre_mortem.enabled", false)
                },
                {
                    path: "llm_judge.trigger_mode",
                    label: "LLM Judge Trigger Mode",
                    description: "Controls when llm-judge-agent is invoked for a second opinion.",
                    note: stringValue(data, "llm_judge._notes"),
                    type: "select",
                    value: stringValue(data, "llm_judge.trigger_mode", "on-demand"),
                    options: selectOptions(data, "llm_judge._options")
                },
                {
                    path: "llm_judge.judge_provider",
                    label: "LLM Judge Provider",
                    description: "Optional provider name for the judge model, such as google, openai, or anthropic.",
                    note: stringValue(data, "llm_judge._cross_model"),
                    type: "text",
                    value: stringValue(data, "llm_judge.judge_provider"),
                    placeholder: "google"
                },
                {
                    path: "llm_judge.judge_command",
                    label: "LLM Judge Command",
                    description: "Optional command used to reach a different judge model.",
                    note: stringValue(data, "llm_judge._cross_model"),
                    type: "text",
                    value: stringValue(data, "llm_judge.judge_command"),
                    placeholder: "gemini"
                },
                {
                    path: "spec_validation.drift_check_mode",
                    label: "Spec Drift Check Mode",
                    description: "Controls when spec-validation-agent checks implementation drift against specifications.",
                    note: stringValue(data, "spec_validation._notes"),
                    type: "select",
                    value: stringValue(data, "spec_validation.drift_check_mode", "on-demand"),
                    options: selectOptions(data, "spec_validation._drift_check_options")
                },
                {
                    path: "spec_validation.red_team_mode",
                    label: "Spec Red-Team Mode",
                    description: "Controls when a spec red-team pass runs.",
                    note: stringValue(data, "spec_validation._notes"),
                    type: "select",
                    value: stringValue(data, "spec_validation.red_team_mode", "on-demand"),
                    options: selectOptions(data, "spec_validation._red_team_options")
                },
                {
                    path: "security_check.pre_commit",
                    label: "Security Check Before Commit",
                    description: "Require security-check-agent pass on the staged diff before developer-agent managed commits.",
                    note: stringValue(data, "security_check._options.pre_commit"),
                    type: "checkbox",
                    value: booleanValue(data, "security_check.pre_commit", true)
                },
                {
                    path: "security_check.pre_pr",
                    label: "Security Check Before PR",
                    description: "Require security-check-agent pass on the complete branch diff before developer-agent managed PRs.",
                    note: stringValue(data, "security_check._options.pre_pr"),
                    type: "checkbox",
                    value: booleanValue(data, "security_check.pre_pr", true)
                },
                {
                    path: "test_red_team.trigger_mode",
                    label: "Test Red-Team Trigger Mode",
                    description: "Controls when test-agent's red-team-agent runs automatically.",
                    note: stringValue(data, "test_red_team._notes"),
                    type: "select",
                    value: stringValue(data, "test_red_team.trigger_mode", "every-pr"),
                    options: selectOptions(data, "test_red_team._options")
                }
            ]
        },
        {
            title: "Developer Git Workflow",
            description: "Branch, pull request, and hook behavior for developer-agent managed work.",
            fields: [
                {
                    path: "developer_git_workflow.mode",
                    label: "Workflow Mode",
                    description: "Controls whether developer-agent creates branches and pull requests automatically.",
                    note: stringValue(data, "developer_git_workflow._notes"),
                    type: "select",
                    value: stringValue(data, "developer_git_workflow.mode", "always-branch-and-pr"),
                    options: selectOptions(data, "developer_git_workflow._options")
                },
                {
                    path: "developer_git_workflow.run_pre_commit_hooks",
                    label: "Run Pre-Commit Hooks",
                    description: "Run configured repository pre-commit hooks before commit.",
                    note: stringValue(data, "developer_git_workflow._hook_options.run_pre_commit_hooks"),
                    type: "checkbox",
                    value: booleanValue(data, "developer_git_workflow.run_pre_commit_hooks", true)
                },
                {
                    path: "developer_git_workflow.run_pre_pr_hooks",
                    label: "Run Pre-PR Hooks",
                    description: "Run configured repository pre-PR hooks before push or PR creation.",
                    note: stringValue(data, "developer_git_workflow._hook_options.run_pre_pr_hooks"),
                    type: "checkbox",
                    value: booleanValue(data, "developer_git_workflow.run_pre_pr_hooks", true)
                },
                {
                    path: "developer_git_workflow.post_pr_branch",
                    label: "After PR Branch Behavior",
                    description: "Controls which branch remains checked out after PR creation.",
                    note: stringValue(data, "developer_git_workflow._notes"),
                    type: "select",
                    value: stringValue(data, "developer_git_workflow.post_pr_branch", "stay-on-task-branch"),
                    options: selectOptions(data, "developer_git_workflow._post_pr_branch_options")
                }
            ]
        },
        {
            title: "Failure Tracking And Vault",
            description: "Backlog tracking for test failures and Obsidian vault recording behavior.",
            fields: [
                {
                    path: "test_failure_tracking.track_in_backlog",
                    label: "Track Test Failures In Backlog",
                    description: "Ask project-planner-agent to create or update linked backlog items for actionable test failures.",
                    note: booleanOptionDescription(data, "test_failure_tracking._options"),
                    type: "checkbox",
                    value: booleanValue(data, "test_failure_tracking.track_in_backlog", true)
                },
                {
                    path: "obsidian_vault.enabled",
                    label: "Enable Obsidian Vault Recording",
                    description: "Allow obsidian-vault-agent to mirror artifacts and action summaries into the configured vault.",
                    note: stringValue(data, "obsidian_vault._options.enabled"),
                    type: "checkbox",
                    value: booleanValue(data, "obsidian_vault.enabled", false)
                },
                {
                    path: "obsidian_vault.vault_path",
                    label: "Vault Path",
                    description: "Folder the vault agent writes into. Relative paths resolve from the project root.",
                    note: stringValue(data, "obsidian_vault._options.vault_path"),
                    type: "text",
                    value: stringValue(data, "obsidian_vault.vault_path", "./docs/vault"),
                    placeholder: "./docs/vault"
                },
                {
                    path: "obsidian_vault.link_mode",
                    label: "Vault Link Mode",
                    description: "Controls whether canonical docs are symlinked or copied into the vault.",
                    note: stringValue(data, "obsidian_vault._options.link_mode"),
                    type: "select",
                    value: stringValue(data, "obsidian_vault.link_mode", "symlink"),
                    options: [
                        { value: "symlink", description: "Symlink canonical docs into the vault so content is not duplicated." },
                        { value: "copy", description: "Copy or link via relative paths for portable vaults where symlinks do not travel." }
                    ]
                }
            ]
        }
    ];
}
function writeSdlcWorkflowSettings(repoRoot, values) {
    const data = loadSdlcSettingsData(repoRoot);
    for (const [dottedPath, rawValue] of Object.entries(values)) {
        if (!SDLC_WRITABLE_PATHS.has(dottedPath))
            continue;
        if (typeof rawValue === "boolean") {
            setNestedValue(data, dottedPath, rawValue);
            continue;
        }
        if (typeof rawValue === "string") {
            setNestedValue(data, dottedPath, rawValue.trim());
        }
    }
    fs.writeFileSync(getSdlcSettingsPath(repoRoot), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function getExtensionSettingsFields() {
    const config = vscode.workspace.getConfiguration("antigravity");
    const savedAgenticHarnessExecutionCommands = mergeUniqueStrings(DEFAULT_AGENTIC_HARNESS_EXECUTION_COMMANDS, config.get("agenticHarnessExecutionCommands"));
    const selectedAgenticHarnessExecutionCommand = getAgenticHarnessExecutionCommand();
    const agenticHarnessExecutionCommands = mergeUniqueStrings(savedAgenticHarnessExecutionCommands, [selectedAgenticHarnessExecutionCommand]);
    const savedLightAgenticHarnessExecutionCommands = mergeUniqueStrings(DEFAULT_LIGHT_AGENTIC_HARNESS_EXECUTION_COMMANDS, config.get("lightAgenticHarnessExecutionCommands"));
    const selectedLightAgenticHarnessExecutionCommand = getLightAgenticHarnessExecutionCommand();
    const lightAgenticHarnessExecutionCommands = mergeUniqueStrings(savedLightAgenticHarnessExecutionCommands, [selectedLightAgenticHarnessExecutionCommand]);
    return [
        {
            key: "workspaceProjectPath",
            label: "Workspace Project Path",
            description: "Path where workspace files are extracted and downloaded to. Relative paths are resolved from the project root.",
            placeholder: "./",
            value: config.get("workspaceProjectPath") || ""
        },
        {
            key: "terminalName",
            label: "Workflow Terminal Name",
            description: "Terminal name used when running workflow scripts.",
            placeholder: "TaskRunner Workflow",
            value: config.get("terminalName") || ""
        },
        {
            key: "agentTerminalName",
            label: "Agent Terminal Name",
            description: "Terminal name used when running agents.",
            placeholder: "TaskRunner Agent",
            value: config.get("agentTerminalName") || ""
        },
        {
            key: "defaultGithubCodeReviewer",
            label: "Default GitHub Code Reviewer",
            description: "Suggested reviewer when creating a pull request. You can still override it per PR.",
            placeholder: "@diegosfb",
            value: getDefaultGithubCodeReviewer()
        },
        {
            key: "buildCommand",
            label: "Build Command",
            description: "Command used to build the solution (e.g. npm run build, make, ./gradlew build).",
            placeholder: "npm run build",
            value: config.get("buildCommand") || ""
        },
        {
            key: "projectTestingCommand",
            label: "Project Testing Command",
            description: "Command used to run the project's test suite (e.g. npm test, pytest, go test ./...).",
            placeholder: "npm test",
            value: config.get("projectTestingCommand") || ""
        },
        {
            key: "jiraBaseUrl",
            label: "Jira Base URL",
            description: "Jira base URL used for all Jira actions.",
            placeholder: "https://your-company.atlassian.net",
            value: config.get("jiraBaseUrl") || ""
        },
        {
            key: "jiraEmail",
            label: "Jira Email",
            description: "Jira email used for all Jira actions.",
            placeholder: "name@example.com",
            value: config.get("jiraEmail") || ""
        },
        {
            key: "jiraApiToken",
            label: "Jira API Token",
            description: "Jira API token used for all Jira actions.",
            placeholder: "jira-api-token",
            value: config.get("jiraApiToken") || ""
        },
        {
            key: "useAgentForGithubRepositoryManagement",
            label: "Use Agent for Github Repository Management",
            description: "When enabled, agent-driven flows are preferred for GitHub repository management tasks.",
            placeholder: "",
            value: "",
            type: "checkbox",
            checked: config.get("useAgentForGithubRepositoryManagement") ?? true
        },
        {
            key: "useExternalTerminal",
            label: "Launch terminals in external terminal app",
            description: "When enabled, Claude, Codex, Opencode, Ollama and Agent Monitor terminals open in a separate terminal window outside VS Code. When disabled, they use the VS Code integrated terminal.",
            placeholder: "",
            value: "",
            type: "checkbox",
            checked: config.get("useExternalTerminal") ?? true
        },
        {
            key: "agenticHarnessExecutionCommand",
            label: "Agentic Harness Execution Command",
            description: "Primary agent command used for Jira assignments, feature work, setup helpers, and other full agent runs. Pick a saved command or type a custom one.",
            placeholder: "claude",
            value: selectedAgenticHarnessExecutionCommand,
            type: "command-list",
            options: agenticHarnessExecutionCommands,
            optionsKey: "agenticHarnessExecutionCommands"
        },
        {
            key: "lightAgenticHarnessExecutionCommand",
            label: "Light Agentic Harness Execution Command",
            description: "Lightweight agent command used for short unattended tasks such as commit messages and Jira text. Pick a saved command or type a custom one.",
            note: "Note: This is used for light command usage like generating commit messages, Jira messages, etc. This command should run in an unattended way and close the session once it is done.",
            placeholder: "claude --model claude-haiku-4-5-20251001",
            value: selectedLightAgenticHarnessExecutionCommand,
            type: "command-list",
            options: lightAgenticHarnessExecutionCommands,
            optionsKey: "lightAgenticHarnessExecutionCommands"
        },
        {
            key: "customAgenticPlatformAddons",
            label: "Custom Agentic Platform Addons",
            description: "Path to a custom agentic platform addons directory shown in the folder section.",
            placeholder: "~/my-addons",
            value: config.get("customAgenticPlatformAddons") || ""
        },
        {
            key: "projectStructureAndAgentsRepository",
            label: "Project Structure & Agents Repository",
            description: "GitHub repository URL used by scripts/deploy-project-structure.sh as the source for project structure and agents.",
            placeholder: exports.DEFAULT_PROJECT_STRUCTURE_AND_AGENTS_REPOSITORY,
            value: config.get("projectStructureAndAgentsRepository") || exports.DEFAULT_PROJECT_STRUCTURE_AND_AGENTS_REPOSITORY
        }
    ];
}
function renderAntigravitySettingsHtml(webview) {
    const nonce = getNonce();
    const fields = getExtensionSettingsFields();
    const repoRoot = getWorkspaceRoot();
    const sdlcSettingsPath = repoRoot ? getSdlcSettingsPath(repoRoot) : undefined;
    const canUseWorkspace = !!(vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length);
    const payload = {
        fields,
        sdlc: {
            groups: getSdlcSettingsGroups(repoRoot),
            path: sdlcSettingsPath,
            canSave: !!repoRoot
        },
        canUseWorkspace,
        defaultTarget: canUseWorkspace ? "workspace" : "user"
    };
    const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskRunner Settings</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      h2 { font-size: 15px; margin: 22px 0 6px; }
      p { margin: 0 0 16px; color: var(--vscode-descriptionForeground); font-size: 12px; }
      .tabs { display: flex; gap: 8px; margin: 16px 0; border-bottom: 1px solid var(--vscode-panel-border); }
      .tab { border-radius: 6px 6px 0 0; background: transparent; color: var(--vscode-foreground); border: 1px solid transparent; border-bottom: none; }
      .tab[aria-selected="true"] { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
      .panel[hidden] { display: none; }
      .targets { display: flex; gap: 16px; margin-bottom: 18px; font-size: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .field-checkbox { display: flex; align-items: center; gap: 8px; }
      label { font-size: 12px; color: var(--vscode-descriptionForeground); }
      input[type="text"], select { padding: 8px 10px; border-radius: 6px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 13px; }
      input:disabled, select:disabled { opacity: 0.75; }
      .description { font-size: 11px; color: var(--vscode-descriptionForeground); }
      .note { font-size: 11px; color: var(--vscode-descriptionForeground); white-space: pre-wrap; }
      .group { margin: 18px 0 24px; padding-bottom: 4px; border-bottom: 1px solid var(--vscode-panel-border); }
      .group:last-child { border-bottom: none; }
      .option-help { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: -2px; white-space: pre-wrap; }
      .command-list-controls { display: flex; flex-direction: column; gap: 8px; }
      .actions { margin-top: 18px; display: flex; justify-content: flex-end; }
      button { padding: 8px 14px; border-radius: 6px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <h1>TaskRunner Settings</h1>
    <p>Update extension settings and apply them to your workspace or user profile.</p>
    <div class="tabs" role="tablist" aria-label="TaskRunner settings sections">
      <button class="tab" id="tab-general" role="tab" aria-selected="true" aria-controls="panel-general">General Settings</button>
      <button class="tab" id="tab-sdlc" role="tab" aria-selected="false" aria-controls="panel-sdlc">SDLC Settings</button>
    </div>
    <div id="panel-general" class="panel" role="tabpanel" aria-labelledby="tab-general">
      <div class="targets" id="targets">
        <label><input type="radio" name="target" value="workspace" id="target-workspace" /> Workspace</label>
        <label><input type="radio" name="target" value="user" id="target-user" /> User</label>
      </div>
      <div id="fields"></div>
      <div class="actions">
        <button id="apply">Apply General Settings</button>
      </div>
    </div>
    <div id="panel-sdlc" class="panel" role="tabpanel" aria-labelledby="tab-sdlc" hidden>
      <p id="sdlc-summary"></p>
      <div id="sdlc-fields"></div>
      <div class="actions">
        <button id="apply-sdlc">Apply SDLC Settings</button>
      </div>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const data = ${JSON.stringify(payload)};
      const fieldsEl = document.getElementById("fields");
      const sdlcFieldsEl = document.getElementById("sdlc-fields");
      const sdlcSummary = document.getElementById("sdlc-summary");
      const targetWorkspace = document.getElementById("target-workspace");
      const targetUser = document.getElementById("target-user");
      const applyBtn = document.getElementById("apply");
      const applySdlcBtn = document.getElementById("apply-sdlc");
      const tabs = [
        { tab: document.getElementById("tab-general"), panel: document.getElementById("panel-general") },
        { tab: document.getElementById("tab-sdlc"), panel: document.getElementById("panel-sdlc") }
      ];

      function selectTab(selectedTab) {
        tabs.forEach(({ tab, panel }) => {
          const selected = tab === selectedTab;
          tab.setAttribute("aria-selected", selected ? "true" : "false");
          panel.hidden = !selected;
          if (selected) tab.focus();
        });
      }

      tabs.forEach(({ tab }) => {
        tab.addEventListener("click", () => selectTab(tab));
        tab.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const index = tabs.findIndex((entry) => entry.tab === tab);
          const nextIndex = event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;
          selectTab(tabs[nextIndex].tab);
        });
      });

      function createField(field) {
        const wrapper = document.createElement("div");
        const helpText = field.description || field.label;
        const descriptionId = "description-" + field.key;
        const appendDescription = () => {
          const desc = document.createElement("div");
          desc.id = descriptionId;
          desc.className = "description";
          desc.textContent = field.description || "";
          desc.title = helpText;
          wrapper.appendChild(desc);
        };
        const appendNote = () => {
          if (!field.note) return;
          const note = document.createElement("div");
          note.className = "note";
          note.textContent = field.note;
          note.title = field.note;
          wrapper.appendChild(note);
        };
        if (field.type === "checkbox") {
          wrapper.className = "field";
          const checkboxRow = document.createElement("div");
          checkboxRow.className = "field-checkbox";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.id = "field-" + field.key;
          cb.checked = !!field.checked;
          cb.title = helpText;
          cb.setAttribute("aria-describedby", descriptionId);
          const label = document.createElement("label");
          label.textContent = field.label;
          label.setAttribute("for", "field-" + field.key);
          label.title = helpText;
          checkboxRow.appendChild(cb);
          checkboxRow.appendChild(label);
          wrapper.appendChild(checkboxRow);
          appendDescription();
          appendNote();
        } else if (field.type === "command-list") {
          wrapper.className = "field";
          const label = document.createElement("label");
          label.textContent = field.label;
          label.setAttribute("for", "field-" + field.key);
          label.title = helpText;
          const controls = document.createElement("div");
          controls.className = "command-list-controls";
          const select = document.createElement("select");
          select.id = "field-preset-" + field.key;
          select.title = helpText;
          select.setAttribute("aria-label", field.label + " preset");
          const customOption = document.createElement("option");
          customOption.value = "__custom__";
          customOption.textContent = "Custom value";
          select.appendChild(customOption);
          (field.options || []).forEach((optionValue) => {
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = optionValue;
            select.appendChild(option);
          });
          const input = document.createElement("input");
          input.id = "field-" + field.key;
          input.type = "text";
          input.value = field.value || "";
          if (field.placeholder) input.placeholder = field.placeholder;
          input.title = helpText;
          input.setAttribute("aria-describedby", descriptionId);
          const syncPresetFromInput = () => {
            const selectedPreset = (field.options || []).find((optionValue) => optionValue === input.value);
            select.value = selectedPreset || "__custom__";
          };
          select.addEventListener("change", () => {
            if (select.value !== "__custom__") input.value = select.value;
            syncPresetFromInput();
          });
          input.addEventListener("input", syncPresetFromInput);
          syncPresetFromInput();
          wrapper.appendChild(label);
          controls.appendChild(select);
          controls.appendChild(input);
          wrapper.appendChild(controls);
          appendDescription();
          appendNote();
        } else {
          wrapper.className = "field";
          const label = document.createElement("label");
          label.textContent = field.label;
          label.setAttribute("for", "field-" + field.key);
          label.title = helpText;
          const input = document.createElement("input");
          input.id = "field-" + field.key;
          input.type = "text";
          input.value = field.value || "";
          if (field.placeholder) input.placeholder = field.placeholder;
          input.title = helpText;
          input.setAttribute("aria-describedby", descriptionId);
          wrapper.appendChild(label);
          wrapper.appendChild(input);
          appendDescription();
          appendNote();
        }
        return wrapper;
      }

      function createSdlcField(field) {
        const wrapper = document.createElement("div");
        wrapper.className = "field";
        const helpText = [field.description, field.note].filter(Boolean).join("\\n\\n");
        const descriptionId = "sdlc-description-" + field.path.replace(/[^a-z0-9_-]/gi, "-");
        const label = document.createElement("label");
        label.textContent = field.label;
        label.setAttribute("for", "sdlc-field-" + field.path);
        label.title = helpText;
        wrapper.appendChild(label);

        let control;
        if (field.type === "checkbox") {
          const checkboxRow = document.createElement("div");
          checkboxRow.className = "field-checkbox";
          control = document.createElement("input");
          control.type = "checkbox";
          control.checked = field.value === true;
          checkboxRow.appendChild(control);
          wrapper.appendChild(checkboxRow);
        } else if (field.type === "select") {
          control = document.createElement("select");
          (field.options || []).forEach((optionValue) => {
            const option = document.createElement("option");
            option.value = optionValue.value;
            option.textContent = optionValue.value;
            option.title = optionValue.description;
            control.appendChild(option);
          });
          control.value = String(field.value || "");
          const optionHelp = document.createElement("div");
          optionHelp.className = "option-help";
          const updateOptionHelp = () => {
            const selected = (field.options || []).find((optionValue) => optionValue.value === control.value);
            optionHelp.textContent = selected ? selected.description : "";
          };
          control.addEventListener("change", updateOptionHelp);
          updateOptionHelp();
          wrapper.appendChild(control);
          wrapper.appendChild(optionHelp);
        } else {
          control = document.createElement("input");
          control.type = "text";
          control.value = String(field.value || "");
          if (field.placeholder) control.placeholder = field.placeholder;
          wrapper.appendChild(control);
        }

        control.id = "sdlc-field-" + field.path;
        control.dataset.path = field.path;
        control.dataset.type = field.type;
        control.disabled = !!field.readonly;
        control.title = helpText;
        control.setAttribute("aria-describedby", descriptionId);

        const desc = document.createElement("div");
        desc.id = descriptionId;
        desc.className = "description";
        desc.textContent = field.description || "";
        desc.title = helpText;
        wrapper.appendChild(desc);
        if (field.note) {
          const note = document.createElement("div");
          note.className = "note";
          note.textContent = field.note;
          note.title = field.note;
          wrapper.appendChild(note);
        }
        return wrapper;
      }

      function createSdlcGroup(group) {
        const wrapper = document.createElement("section");
        wrapper.className = "group";
        const heading = document.createElement("h2");
        heading.textContent = group.title;
        wrapper.appendChild(heading);
        const description = document.createElement("p");
        description.textContent = group.description;
        wrapper.appendChild(description);
        (group.fields || []).forEach((field) => wrapper.appendChild(createSdlcField(field)));
        return wrapper;
      }

      if (!data.canUseWorkspace) {
        targetWorkspace.disabled = true;
        targetWorkspace.parentElement.classList.add("hidden");
        targetUser.checked = true;
      } else if (data.defaultTarget === "workspace") {
        targetWorkspace.checked = true;
      } else {
        targetUser.checked = true;
      }

      (data.fields || []).forEach((field) => { fieldsEl.appendChild(createField(field)); });
      sdlcSummary.textContent = data.sdlc && data.sdlc.canSave
        ? "These project-level settings are saved to " + data.sdlc.path + "."
        : "Open a workspace folder to edit SDLC settings.";
      applySdlcBtn.disabled = !(data.sdlc && data.sdlc.canSave);
      ((data.sdlc && data.sdlc.groups) || []).forEach((group) => {
        sdlcFieldsEl.appendChild(createSdlcGroup(group));
      });

      applyBtn.addEventListener("click", () => {
        const values = {};
        (data.fields || []).forEach((field) => {
          const el = document.getElementById("field-" + field.key);
          if (!el) return;
          if (field.type === "checkbox") {
            values[field.key] = el.checked;
          } else if (field.type === "command-list") {
            const selected = (el.value || "").trim();
            const nextOptions = Array.from(new Set([...(field.options || []), selected].map((item) => (item || "").trim()).filter(Boolean)));
            values[field.key] = selected;
            if (field.optionsKey) values[field.optionsKey] = nextOptions;
          } else {
            values[field.key] = el.value;
          }
        });
        const target = targetWorkspace && targetWorkspace.checked ? "workspace" : "user";
        vscode.postMessage({ type: "applySettings", payload: { target, values } });
      });

      applySdlcBtn.addEventListener("click", () => {
        const values = {};
        const controls = sdlcFieldsEl.querySelectorAll("[data-path]");
        controls.forEach((control) => {
          if (control.disabled) return;
          if (control.dataset.type === "checkbox") {
            values[control.dataset.path] = control.checked;
          } else {
            values[control.dataset.path] = control.value;
          }
        });
        vscode.postMessage({ type: "applySdlcSettings", payload: { values } });
      });
    </script>
  </body>
</html>`;
}
function renderAgenticSetupHtml(webview, initialValues) {
    const nonce = getNonce();
    const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    const payload = JSON.stringify(initialValues);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Update Agentic Setup</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 20px; }
      .row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .row label { font-size: 12px; color: var(--vscode-descriptionForeground); width: 220px; flex-shrink: 0; }
      .row input { flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 13px; }
      button { padding: 8px 14px; border-radius: 6px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; white-space: nowrap; }
      button:hover { background: var(--vscode-button-hoverBackground); }
    </style>
  </head>
  <body>
    <h1>Update Agentic Setup</h1>
    <div class="row">
      <label>Claude Setup GitHub</label>
      <input id="claudeGithub" type="text" placeholder="https://github.com/..." />
      <button id="claudeUpdate">Update</button>
    </div>
    <div class="row">
      <label>Gemini-Antigravity Setup GitHub</label>
      <input id="geminiGithub" type="text" placeholder="https://github.com/..." />
      <button id="geminiUpdate">Update</button>
    </div>
    <div class="row">
      <label>Codex Setup GitHub</label>
      <input id="codexGithub" type="text" placeholder="https://github.com/..." />
      <button id="codexUpdate">Update</button>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const init = ${payload};
      document.getElementById("claudeGithub").value = init.claudeGithub || "";
      document.getElementById("geminiGithub").value = init.geminiGithub || "";
      document.getElementById("codexGithub").value = init.codexGithub || "";
      function getAllValues() {
        return {
          claudeGithub: document.getElementById("claudeGithub").value.trim(),
          geminiGithub: document.getElementById("geminiGithub").value.trim(),
          codexGithub: document.getElementById("codexGithub").value.trim()
        };
      }
      function sendUpdate(tool) {
        const all = getAllValues();
        vscode.postMessage({ type: "agenticSetupUpdate", tool, url: all[tool + "Github"], all });
      }
      document.getElementById("claudeUpdate").addEventListener("click", () => sendUpdate("claude"));
      document.getElementById("geminiUpdate").addEventListener("click", () => sendUpdate("gemini"));
      document.getElementById("codexUpdate").addEventListener("click", () => sendUpdate("codex"));
    </script>
  </body>
</html>`;
}
function renderClaudeModelConfigHtml(webview, config, claudeSettings) {
    const nonce = getNonce();
    const routers = normalizeStringArray(config["routers"]);
    const effortLevels = normalizeStringArray(config["claude-effort-levels"]);
    const internalBehaviours = normalizeStringArray(config["claude-internalbehaviour"]);
    const routerSettings = {};
    for (const router of routers) {
        const settings = getRouterSettings(config, router);
        if (settings)
            routerSettings[router] = settings;
    }
    const payload = {
        routers,
        effortLevels,
        internalBehaviours,
        routerSettings,
        initialValues: {
            model: claudeSettings?.env?.ANTHROPIC_MODEL,
            effortLevel: claudeSettings?.effortLevel,
            internalBehaviour: claudeSettings?.model,
            baseurl: claudeSettings?.env?.ANTHROPIC_BASE_URL,
            apiKey: claudeSettings?.env?.ANTHROPIC_API_KEY
        }
    };
    const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Set Claude Model</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .field { display: flex; flex-direction: column; gap: 6px; }
      label { font-size: 12px; color: var(--vscode-descriptionForeground); }
      select, input { padding: 8px 10px; border-radius: 6px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 13px; }
      input[readonly] { color: var(--vscode-disabledForeground); }
      .actions { margin-top: 20px; display: flex; justify-content: flex-end; }
      button { padding: 8px 14px; border-radius: 6px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      .error { color: var(--vscode-errorForeground); font-size: 12px; margin-top: 8px; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <h1>Set Claude Model</h1>
    <div class="grid">
      <div class="field"><label for="router">Select Model Router</label><select id="router"></select></div>
      <div class="field"><label for="model">Select Model</label><select id="model"></select></div>
      <div class="field"><label for="effort">Effort Level</label><select id="effort"></select></div>
      <div class="field hidden"><label for="internal">Claude Internal Behaviour</label><select id="internal"></select></div>
      <div class="field"><label for="baseurl">Base URL</label><input id="baseurl" type="text" readonly /></div>
      <div class="field"><label for="authToken">Auth Token</label><input id="authToken" type="password" readonly /></div>
      <div class="field"><label for="apiKey">API Key</label><input id="apiKey" type="password" readonly /></div>
    </div>
    <div class="actions"><button id="apply">Apply</button></div>
    <div class="error" id="error"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const data = ${JSON.stringify(payload)};
      const routerSelect = document.getElementById("router");
      const modelSelect = document.getElementById("model");
      const effortSelect = document.getElementById("effort");
      const internalSelect = document.getElementById("internal");
      const baseUrlInput = document.getElementById("baseurl");
      const authTokenInput = document.getElementById("authToken");
      const apiKeyInput = document.getElementById("apiKey");
      const errorEl = document.getElementById("error");
      const applyBtn = document.getElementById("apply");
      const initialValues = data.initialValues || {};

      function fillSelect(select, items, colorizer) {
        select.innerHTML = "";
        items.forEach((item) => {
          const option = document.createElement("option");
          option.value = item; option.textContent = item;
          if (colorizer) { const color = colorizer(item); if (color) option.style.color = color; }
          select.appendChild(option);
        });
      }

      function selectByValue(select, value) {
        if (!value) return false;
        const index = Array.from(select.options).findIndex((o) => o.value === value);
        if (index >= 0) { select.selectedIndex = index; return true; }
        return false;
      }

      function findInitialRouter() {
        const routers = Object.keys(data.routerSettings || {});
        if (initialValues.router && data.routerSettings[initialValues.router]) return initialValues.router;
        if (initialValues.baseurl) {
          const byBaseUrl = routers.find((r) => data.routerSettings[r]?.baseurl === initialValues.baseurl);
          if (byBaseUrl) return byBaseUrl;
        }
        if (initialValues.model) {
          const byModel = routers.find((r) => (data.routerSettings[r]?.models || []).includes(initialValues.model));
          if (byModel) return byModel;
        }
        return routers[0];
      }

      function updateRouterFields() {
        const router = routerSelect.value;
        const settings = data.routerSettings[router];
        if (!settings) { errorEl.textContent = "Missing " + router + "-settings in routerconfig.json"; applyBtn.disabled = true; return; }
        errorEl.textContent = ""; applyBtn.disabled = false;
        baseUrlInput.value = settings.baseurl || "";
        authTokenInput.value = settings.auth_token || "";
        apiKeyInput.value = settings.apikey || "";
        const routerLower = (router || "").toLowerCase();
        const modelColorizer = routerLower === "openrouter"
          ? (v) => (v.toLowerCase().includes("free") ? "#3fb950" : "#ffffff")
          : routerLower === "ollama"
            ? (v) => (v.toLowerCase().includes("cloud") ? "#3fb950" : "#58a6ff")
            : undefined;
        fillSelect(modelSelect, settings.models || [], modelColorizer);
      }

      fillSelect(routerSelect, data.routers || []);
      fillSelect(effortSelect, data.effortLevels || []);
      fillSelect(internalSelect, data.internalBehaviours || []);

      if (routerSelect.options.length > 0) {
        const initialRouter = findInitialRouter();
        if (initialRouter) selectByValue(routerSelect, initialRouter);
        else routerSelect.selectedIndex = 0;
        updateRouterFields();
        selectByValue(modelSelect, initialValues.model);
        selectByValue(effortSelect, initialValues.effortLevel);
        selectByValue(internalSelect, initialValues.internalBehaviour);
      } else {
        errorEl.textContent = "No routers found in routerconfig.json.";
        applyBtn.disabled = true;
      }

      routerSelect.addEventListener("change", updateRouterFields);

      applyBtn.addEventListener("click", () => {
        if (!routerSelect.value || !modelSelect.value || !effortSelect.value || !internalSelect.value) {
          errorEl.textContent = "All fields are required."; return;
        }
        vscode.postMessage({ type: "applyClaudeModel", payload: { router: routerSelect.value, model: modelSelect.value, effortLevel: effortSelect.value, internalBehaviour: internalSelect.value } });
      });
    </script>
  </body>
</html>`;
}
//# sourceMappingURL=settings.js.map