export interface MergeReviewPromptOptions {
  currentBranch: string;
  baseBranch?: string;
  projectTestingCommand?: string;
}

function normalizeBranchName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function buildMergeReviewPrompt(options: MergeReviewPromptOptions): string {
  const currentBranch = normalizeBranchName(options.currentBranch, "current branch");
  const baseBranch = normalizeBranchName(options.baseBranch, "main");
  const projectTestingCommand = options.projectTestingCommand?.trim();

  const testingInstruction =
    projectTestingCommand && projectTestingCommand.length > 0
      ? `Run this configured project testing command if it helps validate the merge: ${projectTestingCommand}.`
      : "No project testing command is configured in settings, so call out any validation you could not run.";

  return [
    `Review the current branch after merging the latest ${baseBranch} branch into it.`,
    `The active feature branch is ${currentBranch}.`,
    `Assume this review is for the most recent merge of ${baseBranch} into ${currentBranch}.`,
    `Use local git inspection commands such as status, diff, and log as needed to understand the merge result against ${baseBranch} and origin/${baseBranch}.`,
    "Do not modify files, stage changes, create commits, or push anything.",
    "Focus on surfacing potential merge problems such as unresolved conflict markers, incorrect conflict resolutions, dropped or duplicated logic, broken imports, dependency drift, failing tests, and other integration regressions.",
    testingInstruction,
    "Return findings only.",
    "If you find issues, list them in severity order with file paths and line references when possible.",
    "If no issues are found, explicitly say the merge looks OK and mention any remaining risks or validation gaps."
  ].join(" ");
}
