"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBacklogFileSegment = normalizeBacklogFileSegment;
exports.buildBacklogItemFileName = buildBacklogItemFileName;
exports.extractAcceptanceCriteria = extractAcceptanceCriteria;
exports.deriveBacklogSummary = deriveBacklogSummary;
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
function trimSectionContent(value) {
    return value?.trim() ?? "";
}
function truncateSentence(value, maxLength = 160) {
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
function extractAcceptanceCriteria(description) {
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
function stripAcceptanceCriteria(description) {
    const trimmedDescription = trimSectionContent(description);
    if (!trimmedDescription) {
        return "";
    }
    const lines = trimmedDescription.split(/\r?\n/);
    const acceptanceCriteriaIndex = lines.findIndex((line) => /^(?:#+\s*)?acceptance criteria(?:\s*:.*)?\s*$/i.test(line.trim()));
    if (acceptanceCriteriaIndex === -1) {
        return trimmedDescription;
    }
    return lines.slice(0, acceptanceCriteriaIndex).join("\n").trim();
}
function deriveBacklogSummary(description) {
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
function renderMarkdownSection(title, content) {
    const trimmedContent = trimSectionContent(content);
    if (!trimmedContent) {
        return `## ${title}\n`;
    }
    return `## ${title}\n${trimmedContent}\n`;
}
function buildBacklogItemTemplate({ issueType, summary, description }) {
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
function resolveBacklogItemFilePath(backlogDir, issueType, summary) {
    const fileName = buildBacklogItemFileName(issueType, summary);
    if (!fileName) {
        return undefined;
    }
    return path.join(backlogDir, fileName);
}
//# sourceMappingURL=backlogItem.js.map