import { copyBundledSkillToProject } from "./bundledProjectSkill";

export const EXPLAIN_ME_SKILL_NAME = "explain-me";
export const EXPLAIN_ME_PROMPT =
  "use skill explain-me to explain the solution of the whole project and a detailed explanation of the latest uncommited changes";

export async function copyExplainMeSkill(
  extensionRoot: string,
  projectRoot: string
): Promise<string[]> {
  return copyBundledSkillToProject(extensionRoot, projectRoot, EXPLAIN_ME_SKILL_NAME);
}
