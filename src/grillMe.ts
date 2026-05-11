import { copyBundledSkillToProject } from "./bundledProjectSkill";
import type { ResourceProvider } from "./resourceProvider";

export const GRILL_ME_SKILL_NAME = "grill-me";

export function buildFeatureGrillMePrompt(featureDetails: string): string {
  return `use skill grill-me to review the feature ${featureDetails.trim()}`;
}

export function buildJiraDraftFeatureDetails(
  projectKey: string,
  issueType: string,
  summary: string,
  description?: string
): string {
  const lines = [
    `Jira item draft for project ${projectKey.trim()}.`,
    `Item type: ${issueType.trim()}.`,
    `Summary: ${summary.trim()}.`
  ];
  const trimmedDescription = description?.trim();
  if (trimmedDescription) {
    lines.push(`Description: ${trimmedDescription}`);
  }
  return lines.join(" ");
}

export async function copyGrillMeSkill(
  extensionRoot: string,
  projectRoot: string,
  resourceProvider?: ResourceProvider
): Promise<string[]> {
  return copyBundledSkillToProject(
    extensionRoot,
    projectRoot,
    GRILL_ME_SKILL_NAME,
    GRILL_ME_SKILL_NAME,
    resourceProvider
  );
}
