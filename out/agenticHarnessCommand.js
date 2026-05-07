"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgenticHarnessPromptCommandForCommand = buildAgenticHarnessPromptCommandForCommand;
function quoteShellArg(value) {
    return `"${value.replace(/"/g, '\\"')}"`;
}
function getExecutableName(command) {
    const firstToken = command.trim().split(/\s+/)[0] || "";
    const normalized = firstToken.replace(/\\/g, "/");
    const basename = normalized.split("/").pop() || normalized;
    return basename.toLowerCase();
}
function buildAgenticHarnessPromptCommandForCommand(command, repoRoot, prompt, mode = "dangerous") {
    const trimmedCommand = command.trim();
    const executableName = getExecutableName(trimmedCommand);
    if (executableName === "claude") {
        if (mode === "dangerous") {
            return `${trimmedCommand} --dangerously-skip-permissions --print ${quoteShellArg(prompt)}`;
        }
        return `${trimmedCommand} ${quoteShellArg(prompt)}`;
    }
    if (executableName === "codex") {
        const codexBaseCommand = /\bcodex\s+exec\b/.test(trimmedCommand)
            ? trimmedCommand
            : trimmedCommand.replace(/\bcodex\b/, "codex exec");
        const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
        const heredocMarker = "ANTIGRAVITY_HARNESS_PROMPT_EOF";
        return `${codexBaseCommand} --full-auto -C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)} - <<'${heredocMarker}'\n${prompt}\n${heredocMarker}`;
    }
    return `${trimmedCommand} ${quoteShellArg(prompt)}`;
}
//# sourceMappingURL=agenticHarnessCommand.js.map