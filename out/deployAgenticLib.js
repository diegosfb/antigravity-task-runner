"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME = void 0;
exports.resolveDeployAgenticLibSourceFolder = resolveDeployAgenticLibSourceFolder;
const fs = require("fs");
const path = require("path");
exports.DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME = "deploy-agentic-lib-to-project";
function resolveDeployAgenticLibSourceFolder(filePath, statSync = fs.statSync) {
    return statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);
}
//# sourceMappingURL=deployAgenticLib.js.map