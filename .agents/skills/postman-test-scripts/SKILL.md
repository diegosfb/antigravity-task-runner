---
name: postman-test-scripts
description: Create Postman collections and test scripts for API testing and use-case coverage. Use when you need Postman JSON collections, environment files, or request test scripts for endpoints, auth flows, regression testing, or API contract validation.
tools: Read, Write
metadata:
  version: "1.0.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Software Development"
---


# Postman Test Scripts

## Overview

Generate Postman collection JSON (v2.1) and per-request test scripts that cover happy-path, edge-case, and negative scenarios for the project API.

## Intake Checklist

- Base URL and environments (dev/stage/prod)
- Auth method (API key, bearer token, OAuth, session cookie)
- Endpoint list with methods, paths, and required headers
- Sample request bodies and required query parameters
- Expected responses, status codes, and error cases
- Data dependencies and test data setup/teardown needs

If any are missing, ask concise follow-up questions before generating artifacts.

## Output Requirements

Provide both:
- A Postman collection JSON (v2.1) with requests, folders, and event scripts
- Per-request test scripts (Postman "Tests" tab) when the user wants snippets

Optionally include:
- Environment JSON (baseUrl, tokens, tenant IDs)
- Pre-request scripts for auth token acquisition

## Workflow

1. Map use cases to concrete requests
   - Name each request and group by feature folder
   - Include method, path, headers, query, and body
2. Define test coverage per request
   - Success checks (status, response time)
   - Contract checks (required fields, types)
   - Error checks (missing fields, unauthorized, invalid input)
3. Parameterize
   - Use `{{baseUrl}}` and environment variables
   - Avoid hardcoding secrets or tokens
4. Emit artifacts
   - Collection JSON with `event` scripts
   - Snippet tests for each request if needed
5. Provide import and run guidance

## Test Script Patterns

Use these common assertions:
- Status code
- Response time
- Required fields and types
- Error message on invalid input

Example tests:

```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
pm.test("response time < 500ms", () => pm.expect(pm.response.responseTime).to.be.below(500));
pm.test("has id", () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property("id");
});
```

## Output Format

- Collection JSON in a fenced code block labeled `json`
- Tests in fenced `javascript` blocks (per request or grouped)
- Environment JSON in a fenced `json` block when applicable

Include a short note on how to import the collection into Postman and how to set the environment.

---

## Version Information

- **Library:** `dsfb-sdlc`
- **Description:** Diego Fernandez Brihuega Software Development Life Cycle library
- **Version:** `1.0.0`

## Version History

- **v1.0.0** (2026-05-14): Standardized version metadata for the dsfb-sdlc agents and skills library.

## Last Updated

**Date:** 2026-05-14
