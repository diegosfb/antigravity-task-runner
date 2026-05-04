export type EnsureAgenticHarnessSkillRequest = {
  agenticHarnessCommand: string;
  skillName: string;
  localSkillSourcePath: string;
};

export type AgenticHarnessSkillTaskPromptRequest = EnsureAgenticHarnessSkillRequest & {
  taskPrompt: string;
};

export type AgenticHarnessSkillLocations = {
  localSkillsDir: string;
  globalSkillsDir: string;
};

export function resolveAgenticHarnessSkillLocations(
  agenticHarnessCommand: string
): AgenticHarnessSkillLocations {
  const normalizedCommand = agenticHarnessCommand.trim().toLowerCase();
  if (normalizedCommand.startsWith("codex")) {
    return {
      localSkillsDir: ".codex/skills",
      globalSkillsDir: "~/.codex/skills"
    };
  }

  // Claude, OpenCode, and Qwen flows currently share the Claude-style skill layout.
  return {
    localSkillsDir: ".claude/skills",
    globalSkillsDir: "~/.claude/skills"
  };
}

export function buildEnsureAgenticHarnessSkillInstructions(
  details: EnsureAgenticHarnessSkillRequest
): string[] {
  const { localSkillsDir, globalSkillsDir } = resolveAgenticHarnessSkillLocations(
    details.agenticHarnessCommand
  );
  const projectSkillsDir = ".agent/skills";
  const projectSkillPath = `${projectSkillsDir}/${details.skillName}`;
  const localHarnessSkillPath = `${localSkillsDir}/${details.skillName}`;
  const globalHarnessSkillPath = `${globalSkillsDir}/${details.skillName}`;

  return [
    `As the first step, check whether the skill "${details.skillName}" is already available for the selected agent harness either locally or globally.`,
    `Check ${projectSkillPath}, ${localHarnessSkillPath}, and ${globalHarnessSkillPath}.`,
    "If the skill exists in any of those locations, do not install it and continue with the task in this same run.",
    `If the skill is missing everywhere, create ${projectSkillsDir} if needed, then copy the entire skill folder from ${details.localSkillSourcePath} to ${projectSkillPath}.`,
    `If ${localSkillsDir} does not exist locally, create it as a symlink to ../.agent/skills so the copied skill is available to the selected agent harness.`,
    `If ${localSkillsDir} already exists locally as a normal folder and ${localHarnessSkillPath} is still missing after copying to ${projectSkillPath}, copy the same skill folder there as well.`,
    `Verify that the skill "${details.skillName}" is available before continuing.`
  ];
}

export function buildAgenticHarnessSkillTaskPrompt(
  details: AgenticHarnessSkillTaskPromptRequest
): string {
  return [
    ...buildEnsureAgenticHarnessSkillInstructions(details),
    `After the skill is available, continue with this task in the same run. ${details.taskPrompt}`
  ].join(" ");
}
