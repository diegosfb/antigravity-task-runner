const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAgenticHarnessSkillTaskPrompt,
  buildEnsureAgenticHarnessSkillInstructions,
  resolveAgenticHarnessSkillLocations
} = require("../out/agenticHarnessSkill.js");

test("resolveAgenticHarnessSkillLocations uses codex paths for codex harnesses", () => {
  assert.deepEqual(resolveAgenticHarnessSkillLocations("codex"), {
    localSkillsDir: ".codex/skills",
    globalSkillsDir: "~/.codex/skills"
  });
});

test("resolveAgenticHarnessSkillLocations defaults to claude-style paths for non-codex harnesses", () => {
  assert.deepEqual(resolveAgenticHarnessSkillLocations("opencode run"), {
    localSkillsDir: ".claude/skills",
    globalSkillsDir: "~/.claude/skills"
  });
});

test("buildEnsureAgenticHarnessSkillInstructions tells the harness to copy a missing skill", () => {
  const prompt = buildEnsureAgenticHarnessSkillInstructions({
    agenticHarnessCommand: "codex",
    skillName: "jira-project-creation",
    localSkillSourcePath: "Resources/jira-project-creation"
  }).join(" ");

  assert.match(prompt, /As the first step, check whether the skill "jira-project-creation" is already available/);
  assert.match(prompt, /\.agent\/skills\/jira-project-creation/);
  assert.match(prompt, /\.codex\/skills\/jira-project-creation/);
  assert.match(prompt, /~\/\.codex\/skills\/jira-project-creation/);
  assert.match(prompt, /do not install it and continue with the task in this same run/i);
  assert.match(prompt, /copy the entire skill folder from Resources\/jira-project-creation to \.agent\/skills\/jira-project-creation/i);
  assert.match(prompt, /If \.codex\/skills does not exist locally, create it as a symlink to \.\.\/\.agent\/skills/i);
});

test("buildAgenticHarnessSkillTaskPrompt prepends the skill preflight before the task prompt", () => {
  const prompt = buildAgenticHarnessSkillTaskPrompt({
    agenticHarnessCommand: "claude",
    skillName: "jira-project-creation",
    localSkillSourcePath: "Resources/jira-project-creation",
    taskPrompt: "Use that skill for the Jira project creation in this same run."
  });

  assert.match(prompt, /As the first step, check whether the skill "jira-project-creation" is already available/);
  assert.match(prompt, /After the skill is available, continue with this task in the same run\. Use that skill for the Jira project creation in this same run\./);
});
