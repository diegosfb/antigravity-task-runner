---
name: unit-tests
description: Finds source files missing unit tests and generates complete test coverage using the project's existing test patterns (node:test, temp repos, vscode mocking). Triggers when asked to add/write/generate unit tests.
---

Run the test command (`npm test`) first to understand the current state. Then identify which `src/*.ts` files are missing corresponding `tests/*.test.js` files by listing both directories. For each missing test:

1. Read the source file thoroughly.
2. Identify pure, testable functions (no vscode dependency at import time).
3. Create a test file in `tests/` following these patterns:
   - Use `require("node:test")` and `require("node:assert/strict")`.
   - Mock `vscode` via `Module.prototype.require` override before importing.
   - Import compiled output from `../out/<name>.js`.
   - Use `fs.mkdtempSync` + `path.join(os.tmpdir(), ...)` for temp directories.
   - For git-based tests, create temp repos with `execFileSync`.
   - Cover: happy path, edge cases (empty/null/undefined), error handling.
4. Run `npm test` to verify and fix any failures.
5. Do not add comments to tests.
