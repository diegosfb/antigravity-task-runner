"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLogger = initLogger;
exports.log = log;
exports.logAlways = logAlways;
exports.showOutputChannel = showOutputChannel;
const vscode = require("vscode");
let outputChannel;
function initLogger(channel) {
    outputChannel = channel;
}
function log(message) {
    const config = vscode.workspace.getConfiguration("antigravity");
    if (!config.get("enableDebugLogging", false))
        return;
    const timestamp = new Date().toISOString();
    outputChannel?.appendLine(`${timestamp} ${message}`);
}
function logAlways(message) {
    const timestamp = new Date().toISOString();
    outputChannel?.appendLine(`${timestamp} ${message}`);
}
function showOutputChannel() {
    outputChannel?.show(true);
}
//# sourceMappingURL=logger.js.map