"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRILL_ME_SKILL_NAME = void 0;
exports.buildFeatureGrillMePrompt = buildFeatureGrillMePrompt;
exports.copyGrillMeSkill = copyGrillMeSkill;
const bundledProjectSkill_1 = require("./bundledProjectSkill");
exports.GRILL_ME_SKILL_NAME = "grill-me";
function buildFeatureGrillMePrompt(featureDetails) {
    return `use skill grill-me to review the feature ${featureDetails.trim()}`;
}
async function copyGrillMeSkill(extensionRoot, projectRoot) {
    return (0, bundledProjectSkill_1.copyBundledSkillToProject)(extensionRoot, projectRoot, exports.GRILL_ME_SKILL_NAME);
}
//# sourceMappingURL=grillMe.js.map