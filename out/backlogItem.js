"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBacklogFileSegment = normalizeBacklogFileSegment;
exports.buildBacklogItemFileName = buildBacklogItemFileName;
exports.buildBacklogItemTemplate = buildBacklogItemTemplate;
exports.resolveBacklogItemFilePath = resolveBacklogItemFilePath;
const path = require("path");
function normalizeBacklogFileSegment(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}
function buildBacklogItemFileName(issueType, summary) {
    const typeSegment = normalizeBacklogFileSegment(issueType);
    const summarySegment = normalizeBacklogFileSegment(summary);
    if (!typeSegment || !summarySegment) {
        return undefined;
    }
    return `${typeSegment}-${summarySegment}.md`;
}
function buildBacklogItemTemplate({ issueType, summary }) {
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
function resolveBacklogItemFilePath(backlogDir, issueType, summary) {
    const fileName = buildBacklogItemFileName(issueType, summary);
    if (!fileName) {
        return undefined;
    }
    return path.join(backlogDir, fileName);
}
//# sourceMappingURL=backlogItem.js.map