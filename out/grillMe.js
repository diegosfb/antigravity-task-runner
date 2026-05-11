"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRILL_ME_SKILL_NAME = void 0;
exports.buildFeatureGrillMePrompt = buildFeatureGrillMePrompt;
exports.buildJiraDraftFeatureDetails = buildJiraDraftFeatureDetails;
exports.copyGrillMeSkill = copyGrillMeSkill;
const bundledProjectSkill_1 = require("./bundledProjectSkill");
exports.GRILL_ME_SKILL_NAME = "grill-me";
function buildFeatureGrillMePrompt(featureDetails) {
    return `use skill grill-me to review the feature ${featureDetails.trim()}`;
}
function buildJiraDraftFeatureDetails(projectKey, issueType, summary, description) {
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
async function copyGrillMeSkill(extensionRoot, projectRoot, resourceProvider) {
    return (0, bundledProjectSkill_1.copyBundledSkillToProject)(extensionRoot, projectRoot, exports.GRILL_ME_SKILL_NAME, exports.GRILL_ME_SKILL_NAME, resourceProvider);
}
//# sourceMappingURL=grillMe.js.map