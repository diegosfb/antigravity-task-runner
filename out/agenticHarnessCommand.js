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
        const codexTrustArgs = buildCodexTrustArgs(repoRoot);
        if (mode === "prompt") {
            return `${buildCodexPromptBaseCommand(trimmedCommand)} ${codexTrustArgs} ${quoteShellArg(prompt)}`;
        }
        return `${buildCodexExecBaseCommand(trimmedCommand)} --full-auto ${codexTrustArgs} ${quoteShellArg(prompt)}`;
    }
    if (executableName === "opencode") {
        return `${trimmedCommand} ${quoteShellArg(prompt)}`;
    }
    return `${trimmedCommand} ${quoteShellArg(prompt)}`;
}
/**
 * Builds the agentic harness command using a prompt stored in a file.
 * This avoids shell-escaping issues with long, multi-line prompts and allows
 * the prompt to be edited without recompiling the extension.
 *
 * For claude: uses --print "$(cat <file>)"
 * For codex dangerous mode: uses file redirect (- < <file>)
 * For codex prompt mode: passes "$(cat <file>)" as the prompt argument
 * For opencode: passes "$(cat <file>)" as the prompt argument
 * For others: falls back to "$(cat <file>)" command substitution
 */
function buildAgenticHarnessFileCommandForCommand(command, repoRoot, promptFilePath, mode = "dangerous") {
    const trimmedCommand = command.trim();
    const executableName = getExecutableName(trimmedCommand);
    const quotedFile = quoteShellArg(promptFilePath);
    if (executableName === "claude") {
        if (mode === "dangerous") {
            return `${trimmedCommand} --dangerously-skip-permissions --print "$(cat ${quotedFile})"`;
        }
        return `${trimmedCommand} "$(cat ${quotedFile})"`;
    }
    if (executableName === "codex") {
        const codexTrustArgs = buildCodexTrustArgs(repoRoot);
        if (mode === "prompt") {
            return `${buildCodexPromptBaseCommand(trimmedCommand)} ${codexTrustArgs} "$(cat ${quotedFile})"`;
        }
        return `${buildCodexExecBaseCommand(trimmedCommand)} --full-auto ${codexTrustArgs} - < ${quotedFile}`;
    }
    if (executableName === "opencode") {
        return `${trimmedCommand} "$(cat ${quotedFile})"`;
    }
    // Generic fallback: inject file contents via command substitution
    return `${trimmedCommand} "$(cat ${quotedFile})"`;
}
//# sourceMappingURL=agenticHarnessCommand.js.map