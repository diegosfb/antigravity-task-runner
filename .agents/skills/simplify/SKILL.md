---
name: simplify
description: Build, fix, or refactor code with the smallest safe solution that satisfies the request. Use for implementation, bug fixes, cleanup, simplification, reducing overengineering, removing unnecessary abstractions or dependencies, and reviewing a diff for avoidable complexity. Preserve required behavior, validation, security, accessibility, and real edge cases.
metadata:
  version: "1.0.0"
  library: "Dietrich Gebert / Daniel Ilin / Anthropic"
  library-url: "https://github.com/DietrichGebert/ponytail"
  pack: "Software Development"
---

# Simplify

Act like an efficient senior developer. The best code is the code never written. Avoid overengineering and ask whether a senior engineer would call the solution overcomplicated; if so, simplify it.

## Understand first

Read the task and the code it touches, then trace the real flow end to end. Small code without understanding is not simplicity.

For a bug, find the root cause rather than patching the reported symptom. Search every caller of the function or contract you may change. Prefer one correction at the shared seam over repeated guards in individual callers.

## Stop at the first rung that holds

1. Does this need to exist? If not, skip it.
2. Does it already exist in the codebase? Reuse the established helper, utility, or pattern.
3. Does the standard library solve it? Use that.
4. Does the native platform solve it? Use that.
5. Does an installed dependency already solve it? Reuse it.
6. Can a clear, edge-case-correct one-liner solve it? Use it.
7. Only then write the minimum new code that works.

For example, prefer native `<input type="date">` when it meets the actual date-input requirements; do not add a picker library, wrapper, and stylesheet speculatively.

## Decision rules

- No unrequested abstractions, dependencies, options, compatibility layers, or scaffolding.
- Prefer deletion to addition, boring code to clever code, and fewer files to broader structure.
- The shortest working diff wins only after the correct change seam is understood.
- Preserve exact behavior during a refactor unless the user requests a behavior change.
- Follow existing project conventions when they are relevant; do not import conventions from unrelated ecosystems.
- Choose clarity over code golf. A dense expression is not simpler when it is harder to verify, debug, or maintain.
- When two equally small standard approaches exist, choose the one that handles real edge cases correctly.
- Do not simplify outside the requested or recently changed scope unless a shared root-cause fix requires it.

## Never cut

Do not remove required validation, error handling, security, accessibility, data-loss protection, hardware calibration, or demonstrated edge cases. Simplicity reduces accidental complexity, not necessary safeguards.

Non-trivial logic leaves one runnable check at the highest useful seam. Prefer an existing test seam; do not introduce a framework or fixture stack for one check. A genuinely trivial one-liner needs no new test.

## Handoff

State what was implemented and what unnecessary work was skipped. For a complex request where a smaller solution satisfies the stated need, ship the smaller version and say what a fuller version would add. If the user explicitly insists on the fuller version, implement it without reopening the argument.

## Provenance

Adapted from [Ponytail](https://github.com/DietrichGebert/ponytail), [Ponytail Lite](https://github.com/ilindaniel/ponytail-lite), and the retired local adaptation of [Anthropic's code-simplifier](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier). Ponytail was version 4.9.0 when this adaptation was created. See [the bundled license notice](LICENSE).

Discovery metadata is in [agents/openai.yaml](agents/openai.yaml).
