import { copyBundledSkillToProject } from "./bundledProjectSkill";

export const GRILL_ME_SKILL_NAME = "grill-me";

export function buildFeatureGrillMePrompt(featureDetails: string): string {
  return `use skill grill-me to review the feature ${featureDetails.trim()}`;
}

export async function copyGrillMeSkill(
  extensionRoot: string,
  projectRoot: string
): Promise<string[]> {
  return copyBundledSkillToProject(extensionRoot, projectRoot, GRILL_ME_SKILL_NAME);
}
