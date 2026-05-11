import { copyBundledSkillToProject } from "./bundledProjectSkill";
import type { ResourceProvider } from "./resourceProvider";

export const FEATURE_ESTIMATOR_SKILL_NAME = "estimator";

export function buildFeatureEstimatorPrompt(featureDetails: string): string {
  return `use skill estimator to estimate the complexity of this feature ${featureDetails.trim()} estimating the man hours required and the skills/profiles required. Also do a breakdown of hours per skill/profile required`;
}

export async function copyFeatureEstimatorSkill(
  extensionRoot: string,
  projectRoot: string,
  resourceProvider?: ResourceProvider
): Promise<string[]> {
  return copyBundledSkillToProject(
    extensionRoot,
    projectRoot,
    FEATURE_ESTIMATOR_SKILL_NAME,
    FEATURE_ESTIMATOR_SKILL_NAME,
    resourceProvider
  );
}
