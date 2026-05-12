"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgenticHarnessPromptCommandForCommand = buildAgenticHarnessPromptCommandForCommand;
exports.buildAgenticHarnessFileCommandForCommand = buildAgenticHarnessFileCommandForCommand;
function quoteShellArg(value) {
    return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}
function buildCodexTrustArgs(repoRoot) {
    const trustOverride = `projects.${JSON.stringify(repoRoot)}.trust_level="trusted"`;
    return `-C ${quoteShellArg(repoRoot)} -c "trust_level=\\"trusted\\"" -c ${quoteShellArg(trustOverride)}`;
}
function buildCodexExecBaseCommand(command) {
    return /\bcodex\s+exec\b/.test(command)
        ? command
        : command.replace(/\bcodex\b/, "codex exec");
}
function buildCodexPromptBaseCommand(command) {
    return command.replace(/\bcodex\s+exec\b/, "codex").trim();
}
function buildOpenCodeUnattendedBaseCommand(command) {
    return /\bopencode\s+run\b/.test(command)
        ? command
        : command.replace(/\bopencode\b/, "opencode run");
}
function buildOpenCodePromptBaseCommand(command) {
    return command.replace(/\bopencode\s+run\b/, "opencode").trim();
}
function buildGeminiUnattendedBaseCommand(command) {
    return /(?:^|\s)--yolo(?:\s|$)/.test(command)
        ? command
        : command.replace(/\bgemini\b/, "gemini --yolo");
}
function getExecutableName(command) {
    const firstToken = command.trim().split(/\s+/)[0] || "";
    const normalized = firstToken.replace(/\\/g, "/");
    const basename = normalized.split("/").pop() || normalized;
    return basename.toLowerCase();
}
const HARNESS_BASE_COMMAND_BUILDERS = {
    claude(command, _repoRoot, mode) {
        if (mode === "unattended") {
            return `${command} --dangerously-skip-permissions --print`;
        }
        return command;
    },
    codex(command, repoRoot, mode) {
        const codexTrustArgs = buildCodexTrustArgs(repoRoot);
        if (mode === "unattended") {
            return `${buildCodexExecBaseCommand(command)} --full-auto ${codexTrustArgs}`;
        }
        return `${buildCodexPromptBaseCommand(command)} ${codexTrustArgs}`;
    },
    opencode(command, _repoRoot, mode) {
        return mode === "unattended"
            ? buildOpenCodeUnattendedBaseCommand(command)
            : buildOpenCodePromptBaseCommand(command);
    },
    gemini(command, _repoRoot, mode) {
        return mode === "unattended"
            ? buildGeminiUnattendedBaseCommand(command)
            : command;
    }
};
function buildAgenticHarnessBaseCommand(command, repoRoot, mode) {
    const trimmedCommand = command.trim();
    const executableName = getExecutableName(trimmedCommand);
    const buildBaseCommand = HARNESS_BASE_COMMAND_BUILDERS[executableName];
    return buildBaseCommand ? buildBaseCommand(trimmedCommand, repoRoot, mode) : trimmedCommand;
}
function buildAgenticHarnessCommandForArgument(command, repoRoot, promptArgument, mode) {
    const baseCommand = buildAgenticHarnessBaseCommand(command, repoRoot, mode);
    return `${baseCommand} ${promptArgument}`;
}
function buildPromptArgumentFromFile(promptFilePath) {
    const quotedFile = quoteShellArg(promptFilePath);
    return `"$(cat ${quotedFile})"`;
}
function buildAgenticHarnessPromptCommandForCommand(command, repoRoot, prompt, mode = "unattended") {
    return buildAgenticHarnessCommandForArgument(command, repoRoot, quoteShellArg(prompt), mode);
}
/**
 * Builds the agentic harness command using a prompt stored in a file.
 * This mirrors the normal prompt builder but injects `$(cat <file>)` as the
 * prompt argument so long, multi-line prompts do not need to be shell-escaped
 * inline by the caller.
 */
function buildAgenticHarnessFileCommandForCommand(command, repoRoot, promptFilePath, mode = "unattended") {
    return buildAgenticHarnessCommandForArgument(command, repoRoot, buildPromptArgumentFromFile(promptFilePath), mode);
}
//# sourceMappingURL=agenticHarnessCommand.js.map