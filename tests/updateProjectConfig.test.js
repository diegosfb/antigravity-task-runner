const test = require("node:test");
const assert = require("node:assert/strict");

const {
  UPDATE_GITHUB_ACTIONS_PROMPT,
  UPDATE_TESTS_PROMPT
} = require("../out/updateProjectConfig.js");

test("UPDATE_GITHUB_ACTIONS_PROMPT keeps the requested GitHub Actions prompt text", () => {
  assert.equal(
    UPDATE_GITHUB_ACTIONS_PROMPT,
    "Update the project Github actions to match the project setup"
  );
});

test("UPDATE_TESTS_PROMPT keeps the requested test update prompt text", () => {
  assert.equal(
    UPDATE_TESTS_PROMPT,
    "Update the project unit tests, integration tests and postman scripts"
  );
});
