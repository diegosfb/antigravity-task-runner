"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteShellArg = quoteShellArg;
exports.getExecutableName = getExecutableName;
function quoteShellArg(value) {
    return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}
function getExecutableName(command) {
    const firstToken = command.trim().split(/\s+/)[0] ?? "";
    const normalized = firstToken.replace(/\\/g, "/");
    return (normalized.split("/").pop() || normalized).toLowerCase();
}
//# sourceMappingURL=shellUtils.js.map