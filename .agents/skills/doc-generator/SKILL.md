---
name: doc-generator
description: Generate implementation-grounded inline API comments, module READMEs, and API references from source code. Use when code documentation is missing or stale, before a public API release, or for contributor onboarding; do not use for product, architecture, or general business documents.
metadata:
  version: "1.0.0"
  library: "DSFB"
  library-url: "https://github.com/diegosfb/dsfb-sdlc-v2"
  pack: "Software Development"
---

# Doc Generator

Generate accurate technical documentation from the code that exists. Never infer behavior from names alone: read each public symbol and its callers when needed to establish behavior, errors, side effects, and units.

## Intake

Confirm or infer:

- **Scope:** file, directory, or project; default to the smallest scope matching the request.
- **Mode:** `inline`, `readme`, `api-ref`, or a combination.
- **Audience:** internal developers, external consumers, or junior developers.
- **Overwrite policy:** default to `skip-documented`; use `update-stale` or `overwrite-all` only when requested.

If more than ten files may change, perform discovery first, report the affected symbols/files, and obtain approval before writing.

## Workflow

1. Detect the project language, framework, public entry points, and established documentation style.
2. Discover undocumented exports, stale signature documentation, qualifying modules without READMEs, and undocumented API routes within scope.
3. Read the relevant implementation before documenting it. Document externally observable behavior, parameters, return values, errors, side effects, units, and meaningful edge cases.
4. Write only the selected outputs:
   - inline comments using the repository's established JSDoc, docstring, godoc, Javadoc, or rustdoc convention;
   - module READMEs for directories exposing a meaningful API;
   - an aggregated API reference at the user-requested path or `docs/API_REFERENCE.md`.
5. Validate parameter names and examples against current signatures and import paths. Run the smallest relevant documentation, type, lint, or example check available.
6. Report files changed, symbols documented, existing documentation preserved, stale mismatches found, skipped items, validation performed, and unresolved gaps.

Read [documentation guide](references/documentation-guide.md) when language-specific formats, README/API-reference templates, REST endpoint documentation, or the full report format are needed.

## Boundaries

- Do not invent behavior, schemas, examples, imports, errors, or guarantees.
- Do not modify the implementation merely to make documentation easier.
- Do not document private or intentionally internal symbols as public contracts.
- Preserve adequate existing documentation under the default policy.
- Never publish documentation or change an external documentation system without explicit authorization.
- Treat generated timestamps as regeneration metadata, not evidence that the content is current.
