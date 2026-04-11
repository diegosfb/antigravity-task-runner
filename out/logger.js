"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLogger = initLogger;
exports.log = log;
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
//# sourceMappingURL=logger.js.map