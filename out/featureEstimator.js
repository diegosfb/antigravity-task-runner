"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_ESTIMATOR_SKILL_NAME = void 0;
exports.buildFeatureEstimatorPrompt = buildFeatureEstimatorPrompt;
exports.copyFeatureEstimatorSkill = copyFeatureEstimatorSkill;
const bundledProjectSkill_1 = require("./bundledProjectSkill");
exports.FEATURE_ESTIMATOR_SKILL_NAME = "estimator";
function buildFeatureEstimatorPrompt(featureDetails) {
    return `use skill estimator to estimate the complexity of this feature ${featureDetails.trim()} estimating the man hours required and the skills/profiles required. Also do a breakdown of hours per skill/profile required`;
}
async function copyFeatureEstimatorSkill(extensionRoot, projectRoot) {
    return (0, bundledProjectSkill_1.copyBundledSkillToProject)(extensionRoot, projectRoot, exports.FEATURE_ESTIMATOR_SKILL_NAME);
}
//# sourceMappingURL=featureEstimator.js.map