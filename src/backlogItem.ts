import * as path from "path";

export type BacklogItemDraft = {
  issueType: string;
  summary: string;
  description?: string;
};

export function normalizeBacklogFileSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildBacklogItemFileName(issueType: string, summary: string): string | undefined {
  const typeSegment = normalizeBacklogFileSegment(issueType);
  const summarySegment = normalizeBacklogFileSegment(summary);
  if (!typeSegment || !summarySegment) {
    return undefined;
  }
  return `${typeSegment}-${summarySegment}.md`;
}

function trimSectionContent(value?: string): string {
  return value?.trim() ?? "";
}

function truncateSentence(value: string, maxLength = 160): string {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

export function extractAcceptanceCriteria(description?: string): string {
  const trimmedDescription = trimSectionContent(description);
  if (!trimmedDescription) {
    return "";
  }

  const lines = trimmedDescription.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const inlineMatch = line.match(/^(?:#+\s*)?acceptance criteria\s*:\s*(.+)$/i);
    if (inlineMatch) {
      const remainingLines = [inlineMatch[1], ...lines.slice(index + 1)];
      return remainingLines.join("\n").trim();
    }

    if (/^(?:#+\s*)?acceptance criteria\s*:?\s*$/i.test(line)) {
      return lines.slice(index + 1).join("\n").trim();
    }
  }

  return "";
}

function stripAcceptanceCriteria(description?: string): string {
  const trimmedDescription = trimSectionContent(description);
  if (!trimmedDescription) {
    return "";
  }

  const lines = trimmedDescription.split(/\r?\n/);
  const acceptanceCriteriaIndex = lines.findIndex((line) =>
    /^(?:#+\s*)?acceptance criteria(?:\s*:.*)?\s*$/i.test(line.trim())
  );

  if (acceptanceCriteriaIndex === -1) {
    return trimmedDescription;
  }

  return lines.slice(0, acceptanceCriteriaIndex).join("\n").trim();
}

export function deriveBacklogSummary(description?: string): string {
  const summarySource = stripAcceptanceCriteria(description)
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:[-*+]\s*|\d+\.\s+)/, "")
    .trim();

  if (!summarySource) {
    return "";
  }

  const sentenceMatch = summarySource.match(/^(.+?[.!?])(?=\s|$)/);
  const firstSentence = sentenceMatch ? sentenceMatch[1].trim() : summarySource;
  return truncateSentence(firstSentence);
}

function renderMarkdownSection(title: string, content?: string): string {
  const trimmedContent = trimSectionContent(content);
  if (!trimmedContent) {
    return `## ${title}\n`;
  }

  return `## ${title}\n${trimmedContent}\n`;
}

export function buildBacklogItemTemplate({ issueType, summary, description }: BacklogItemDraft): string {
  const normalizedIssueType = issueType.trim();
  const normalizedSummary = summary.trim();
  const normalizedDescription = trimSectionContent(description);
  const generatedSummary = deriveBacklogSummary(normalizedDescription);
  const acceptanceCriteria = extractAcceptanceCriteria(normalizedDescription);

  return [
    `# ${normalizedIssueType}: ${normalizedSummary}\n`,
    renderMarkdownSection("Summary", generatedSummary),
    renderMarkdownSection("Epic Reference"),
    renderMarkdownSection("Specification Reference (optional)"),
    renderMarkdownSection("Description", normalizedDescription),
    renderMarkdownSection("Acceptance Criteria", acceptanceCriteria),
    renderMarkdownSection("Dependencies"),
    renderMarkdownSection("Notes"),
    renderMarkdownSection("Estimation")
  ].join("\n");
}

export function resolveBacklogItemFilePath(
  backlogDir: string,
  issueType: string,
  summary: string
): string | undefined {
  const fileName = buildBacklogItemFileName(issueType, summary);
  if (!fileName) {
    return undefined;
  }
  return path.join(backlogDir, fileName);
}
