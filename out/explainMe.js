"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPLAIN_ME_PROMPT = exports.EXPLAIN_ME_SKILL_NAME = void 0;
exports.copyExplainMeSkill = copyExplainMeSkill;
const bundledProjectSkill_1 = require("./bundledProjectSkill");
exports.EXPLAIN_ME_SKILL_NAME = "explain-me";
exports.EXPLAIN_ME_PROMPT = "use skill explain-me to explain the solution of the whole project and a detailed explanation of the latest uncommited changes";
async function copyExplainMeSkill(extensionRoot, projectRoot) {
    return (0, bundledProjectSkill_1.copyBundledSkillToProject)(extensionRoot, projectRoot, exports.EXPLAIN_ME_SKILL_NAME);
}
//# sourceMappingURL=explainMe.js.map