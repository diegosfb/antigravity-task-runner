import * as fs from "fs";
import * as path from "path";

export const DEPLOY_AGENTIC_LIB_TO_PROJECT_SCRIPT_NAME = "deploy-agentic-lib-to-project";

export function resolveDeployAgenticLibSourceFolder(
  filePath: string,
  statSync: typeof fs.statSync = fs.statSync
): string {
  return statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);
}
