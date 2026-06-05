const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBacklogFileSegment,
  buildBacklogItemFileName,
  buildBacklogItemTemplate,
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
