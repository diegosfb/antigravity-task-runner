---
name: e2e-testing
description: Specialized skill for orchestrating automated End-to-End (E2E) testing, generating test plans, and executing tests via the TestSprite MCP server.
metadata:
  version: "1.0.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Software Development"
---

# E2E Testing Skill

## When to use this skill
- After core feature implementation but before a release.
- When validating complex, multi-component flows like multiplayer connectivity or continuous UI logic (e.g., a Tetris game loop).
- To detect regressions in core happy-paths.

## How to use it
1. **Preparation**: Ensure the local project server is running in the correct environment (preferably a production build on `localhost:8080` or equivalent).
2. **Setup TestSprite**: 
   - Verify if `.testsprite/config.json` exists. If not, use the bootstrap tool.
3. **Test Generation**:
   - For backend: Use `testsprite_generate_backend_test_plan`.
   - For frontend: Use `testsprite_generate_frontend_test_plan` (specify `needLogin` if applicable).
4. **Execution**:
   - Run `testsprite_generate_code_and_execute` against the generated test plan.
   - For specific test IDs, pass them in the parameters; otherwise run the full suite.
5. **Review**:
   - Analyze the markdown report provided by the MCP server.
   - If tests fail, use the `testsprite_open_test_result_dashboard` tool to manually review and refine the steps.
