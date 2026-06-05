import * as path from "path";

export type BacklogItemDraft = {
  issueType: string;
  summary: string;
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

export function buildBacklogItemTemplate({ issueType, summary }: BacklogItemDraft): string {
  const normalizedIssueType = issueType.trim();
  const normalizedSummary = summary.trim();

  return `# ${normalizedIssueType}: ${normalizedSummary}

## Summary

## Epic Reference

## Specification Reference (optional)

## Description

## Acceptance Criteria

## Dependencies

## Notes

## Estimation
`;
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
