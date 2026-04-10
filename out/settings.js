"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_LITELLM_READY_URL = void 0;
exports.isLocalLiteLLMBaseUrl = isLocalLiteLLMBaseUrl;
exports.readClaudeAnthropicBaseUrl = readClaudeAnthropicBaseUrl;
exports.normalizeStringArray = normalizeStringArray;
exports.getToolRunCommand = getToolRunCommand;
exports.getRouterSettings = getRouterSettings;
exports.loadOpenRouterConfig = loadOpenRouterConfig;
exports.loadClaudeSettings = loadClaudeSettings;
exports.renderAntigravitySettingsHtml = renderAntigravitySettingsHtml;
exports.renderClaudeModelConfigHtml = renderClaudeModelConfigHtml;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
exports.LOCAL_LITELLM_READY_URL = "http://localhost:4000/health";
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
        void vscode.window.showErrorMessage(`routerconfig.json not found at ${filePath}`);
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
function getExtensionSettingsFields() {
    const config = vscode.workspace.getConfiguration("antigravity");
    return [
        {
            key: "rootPath",
            label: "Antigravity Root Path",
            description: "Path to the antigravity directory that contains agents/ and workflows/.",
            placeholder: "./.agent/antigravity",
            value: config.get("rootPath") || ""
        },
        {
            key: "terminalName",
            label: "Workflow Terminal Name",
            description: "Terminal name used when running workflow scripts.",
            placeholder: "Antigravity Workflow",
            value: config.get("terminalName") || ""
        },
        {
            key: "agentTerminalName",
            label: "Agent Terminal Name",
            description: "Terminal name used when running agents.",
            placeholder: "Antigravity Agent",
            value: config.get("agentTerminalName") || ""
        },
        {
            key: "antigravityPath",
            label: "Antigravity Executable",
            description: "Path to the Antigravity executable for running agents.",
            placeholder: "antigravity",
            value: config.get("antigravityPath") || ""
        },
        {
            key: "antigravityArgs",
            label: "Antigravity Arguments",
            description: 'Arguments template for Antigravity. Supports {agent} and {agentFile} placeholders.',
            placeholder: '--agent "{agent}"',
            value: config.get("antigravityArgs") || ""
        },
        {
            key: "scriptFallbackBaseUrl",
            label: "Script Fallback Base URL",
            description: "Base URL used to download missing scripts when ./scripts/<name>.sh is not present.",
            placeholder: "https://raw.githubusercontent.com/diegosfb/antigravity-workspace/main/scripts",
            value: config.get("scriptFallbackBaseUrl") || ""
        },
        {
            key: "configFallbackBaseUrl",
            label: "Config Fallback Base URL",
            description: "Base URL used to download missing config files (e.g. DEV-settings.yaml, .env).",
            placeholder: "https://raw.githubusercontent.com/diegosfb/antigravity-workspace/main/config",
            value: config.get("configFallbackBaseUrl") || ""
        },
        {
            key: "autoUpdateClaudeMd",
            label: "Auto-update CLAUDE.md on autocommit start",
            description: "When enabled, autocommit start will also run Claude to update CLAUDE.md.",
            placeholder: "",
            value: "",
            type: "checkbox",
            checked: config.get("autoUpdateClaudeMd") ?? false
        }
    ];
}
function renderAntigravitySettingsHtml(webview) {
    const nonce = getNonce();
    const fields = getExtensionSettingsFields();
    const canUseWorkspace = !!(vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length);
    const payload = {
        fields,
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
    <title>Antigravity Settings</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { margin: 0 0 16px; color: var(--vscode-descriptionForeground); font-size: 12px; }
      .targets { display: flex; gap: 16px; margin-bottom: 18px; font-size: 12px; }
      .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .field-checkbox { flex-direction: row; align-items: center; gap: 8px; }
      label { font-size: 12px; color: var(--vscode-descriptionForeground); }
      input[type="text"] { padding: 8px 10px; border-radius: 6px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 13px; }
      .description { font-size: 11px; color: var(--vscode-descriptionForeground); }
      .actions { margin-top: 18px; display: flex; justify-content: flex-end; }
      button { padding: 8px 14px; border-radius: 6px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <h1>Antigravity Settings</h1>
    <p>Update extension settings and apply them to your workspace or user profile.</p>
    <div class="targets" id="targets">
      <label><input type="radio" name="target" value="workspace" id="target-workspace" /> Workspace</label>
      <label><input type="radio" name="target" value="user" id="target-user" /> User</label>
    </div>
    <div id="fields"></div>
    <div class="actions">
      <button id="apply">Apply</button>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const data = ${JSON.stringify(payload)};
      const fieldsEl = document.getElementById("fields");
      const targetWorkspace = document.getElementById("target-workspace");
      const targetUser = document.getElementById("target-user");
      const applyBtn = document.getElementById("apply");

      function createField(field) {
        const wrapper = document.createElement("div");
        if (field.type === "checkbox") {
          wrapper.className = "field field-checkbox";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.id = "field-" + field.key;
          cb.checked = !!field.checked;
          const label = document.createElement("label");
          label.textContent = field.label;
          label.setAttribute("for", "field-" + field.key);
          wrapper.appendChild(cb);
          wrapper.appendChild(label);
        } else {
          wrapper.className = "field";
          const label = document.createElement("label");
          label.textContent = field.label;
          label.setAttribute("for", "field-" + field.key);
          const input = document.createElement("input");
          input.id = "field-" + field.key;
          input.type = "text";
          input.value = field.value || "";
          if (field.placeholder) input.placeholder = field.placeholder;
          const desc = document.createElement("div");
          desc.className = "description";
          desc.textContent = field.description || "";
          wrapper.appendChild(label);
          wrapper.appendChild(input);
          wrapper.appendChild(desc);
        }
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

      applyBtn.addEventListener("click", () => {
        const values = {};
        (data.fields || []).forEach((field) => {
          const el = document.getElementById("field-" + field.key);
          if (!el) return;
          if (field.type === "checkbox") {
            values[field.key] = el.checked;
          } else {
            values[field.key] = el.value;
          }
        });
        const target = targetWorkspace && targetWorkspace.checked ? "workspace" : "user";
        vscode.postMessage({ type: "applySettings", payload: { target, values } });
      });
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