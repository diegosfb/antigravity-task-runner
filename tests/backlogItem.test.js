const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBacklogFileSegment,
  buildBacklogItemFileName,
  buildBacklogItemTemplate,
  deriveBacklogSummary,
  extractAcceptanceCriteria,
  resolveBacklogItemFilePath
} = require("../out/backlogItem.js");

test("normalizeBacklogFileSegment converts values to kebab-case", () => {
  assert.equal(normalizeBacklogFileSegment("Feature"), "feature");
  assert.equal(
    normalizeBacklogFileSegment("Add Falling Movement and Rotation"),
    "add-falling-movement-and-rotation"
  );
  assert.equal(normalizeBacklogFileSegment("  User Story!  "), "user-story");
});

test("buildBacklogItemFileName combines type and summary", () => {
  assert.equal(
    buildBacklogItemFileName("Feature", "Add Falling Movement and Rotation"),
    "feature-add-falling-movement-and-rotation.md"
  );
});

test("buildBacklogItemFileName returns undefined when the filename would be empty", () => {
  assert.equal(buildBacklogItemFileName("!!!", "***"), undefined);
});

test("buildBacklogItemTemplate matches the backlog scaffold", () => {
  assert.equal(
    buildBacklogItemTemplate({
      issueType: "Feature",
      summary: "Add Falling Movement and Rotation"
    }),
    `# Feature: Add Falling Movement and Rotation

## Summary

## Epic Reference

## Specification Reference (optional)

## Description

## Acceptance Criteria

## Dependencies

## Notes

## Estimation
`
  );
});

test("deriveBacklogSummary uses the first sentence before acceptance criteria", () => {
  assert.equal(
    deriveBacklogSummary(`Players can move active pieces left and right using the keyboard. This should feel responsive.

Acceptance Criteria
- Arrow keys move the active piece horizontally
- Input is ignored when the game is over`),
    "Players can move active pieces left and right using the keyboard."
  );
});

test("extractAcceptanceCriteria returns inline and multiline acceptance criteria text", () => {
  assert.equal(
    extractAcceptanceCriteria(`Gameplay controls need to be defined.

Acceptance Criteria:
- Left arrow moves left
- Right arrow moves right`),
    `- Left arrow moves left
- Right arrow moves right`
  );
});

test("buildBacklogItemTemplate populates summary, description, and acceptance criteria from description", () => {
  assert.equal(
    buildBacklogItemTemplate({
      issueType: "Feature",
      summary: "Add Falling Movement and Rotation",
      description: `Players can move active pieces left and right using the keyboard. This should feel responsive.

Acceptance Criteria
- Arrow keys move the active piece horizontally
- Input is ignored when the game is over`
    }),
    `# Feature: Add Falling Movement and Rotation

## Summary
Players can move active pieces left and right using the keyboard.

## Epic Reference

## Specification Reference (optional)

## Description
Players can move active pieces left and right using the keyboard. This should feel responsive.

Acceptance Criteria
- Arrow keys move the active piece horizontally
- Input is ignored when the game is over

## Acceptance Criteria
- Arrow keys move the active piece horizontally
- Input is ignored when the game is over

## Dependencies

## Notes

## Estimation
`
  );
});

test("resolveBacklogItemFilePath joins the folder and generated file name", () => {
  assert.equal(
    resolveBacklogItemFilePath(
      "/tmp/project/docs/backlog",
      "Feature",
      "Add Falling Movement and Rotation"
    ),
    "/tmp/project/docs/backlog/feature-add-falling-movement-and-rotation.md"
  );
});
