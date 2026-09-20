# Prompt Templates for Common Dev Tasks

Copy-paste starter templates for frequent software development prompting scenarios. Customise the `[bracketed]` placeholders.

---

## 1. Code Generation

```xml
<role>
Act as a senior [language/framework] engineer specialising in [domain].
</role>

<context>
Project: [project name and brief description]
Stack: [language version, framework, key dependencies]
Architecture: [monolith/microservices, relevant patterns]
Related code: [paste relevant snippets or file references]
</context>

<task>
Implement [specific feature/function/component]:
1. [First requirement with measurable criteria]
2. [Second requirement]
3. [Third requirement]
</task>

<output_format>
- Language: [TypeScript/Python/etc.]
- Style: [functional/OOP/etc.]
- Format: [code only / code + explanation / diff]
</output_format>

<constraints>
- Do NOT modify existing function signatures.
- Do NOT add dependencies not already in the project.
- Keep the implementation under [N] lines.
- Follow [coding standard / style guide].
</constraints>
```

---

## 2. Debugging / Bug Fix

```xml
<role>
Act as a senior debugger and [language] expert.
</role>

<context>
Project: [project name]
Stack: [language, framework, runtime environment]
</context>

<reference>
[Paste the problematic code — file path and line numbers]
</reference>

<error>
[Paste the exact error message, stack trace, or describe the incorrect behaviour]
</error>

<expected_behaviour>
[What should happen instead?]
</expected_behaviour>

<task>
1. Diagnose the root cause. Think step by step.
2. Explain why the current code produces the error.
3. Provide a minimal fix that resolves the issue without side effects.
</task>

<constraints>
- Do NOT refactor unrelated code.
- Preserve the existing API/interface.
- Show only the changed lines in diff format.
</constraints>
```

---

## 3. Code Review

```xml
<role>
Act as a principal engineer conducting a thorough code review for a [language/framework] project.
</role>

<context>
Project: [project name]
Standards: [link to or description of coding standards]
PR description: [what this change is supposed to do]
</context>

<reference>
[Paste the code diff or changed files]
</reference>

<task>
Review the code for:
1. Correctness — does it do what the PR description claims?
2. Security — any vulnerabilities (injection, auth bypass, data leaks)?
3. Performance — any obvious bottlenecks or unnecessary computations?
4. Maintainability — naming, structure, readability, test coverage
5. Edge cases — what inputs or states could break this?
</task>

<output_format>
For each finding:
- **File:Line** — location
- **Severity** — 🔴 Critical / 🟡 Suggestion / 🟢 Nit
- **Issue** — what's wrong
- **Fix** — proposed correction (code snippet if applicable)
</output_format>

<constraints>
- Do NOT rewrite the entire file — focus on the diff.
- If the code is correct, say so explicitly.
- Limit to the 10 most impactful findings.
</constraints>
```

---

## 4. Architecture / Design Decision

```xml
<role>
Act as a software architect with expertise in [domain] and experience designing [type of system].
</role>

<context>
Project: [project description]
Current architecture: [describe current state]
Scale: [users, requests/sec, data volume]
Constraints: [budget, team size, timeline, compliance]
</context>

<task>
[Describe the architectural question or decision to make]

Evaluate the following options:
1. [Option A]
2. [Option B]
3. [Option C — or ask the model to propose alternatives]

For each option, analyse:
- Pros and cons
- Implementation complexity (days/weeks estimate)
- Operational cost implications
- Risk factors
</task>

<output_format>
Comparison table followed by a recommended approach with rationale.
</output_format>

<constraints>
- Ground recommendations in the stated constraints.
- Flag any assumptions you're making.
- If you lack information to make a recommendation, list what you need.
</constraints>
```

---

## 5. Test Generation

```xml
<role>
Act as a QA engineer specialising in [testing framework] for [language/framework].
</role>

<context>
Project: [project name]
Testing framework: [Jest/Pytest/Vitest/etc.]  
File under test: [file path]
</context>

<reference>
[Paste the code to be tested]
</reference>

<task>
Write [N] unit tests covering:
1. Happy path — normal expected inputs
2. Edge cases — [list specific edges: empty input, null, overflow, etc.]
3. Error handling — [list error scenarios]
4. [Any additional specific scenarios]
</task>

<output_format>
- One test file using [testing framework] conventions
- Descriptive test names using "should [expected behaviour] when [condition]" pattern
- Use [mocking approach] for external dependencies
</output_format>

<constraints>
- Do NOT test private/internal methods directly.
- Each test should be independent — no shared mutable state.
- Mock external services; do NOT make real network calls.
</constraints>
```

---

## 6. Documentation Generation

```xml
<role>
Act as a technical writer specialising in developer documentation for [language/framework] projects.
</role>

<context>
Project: [project name and description]
Audience: [junior devs / senior devs / external API consumers]
Existing docs: [link or description of current documentation state]
</context>

<reference>
[Paste the code, API surface, or module to document]
</reference>

<task>
Generate documentation covering:
1. Overview — what this module/API does and why it exists
2. Installation / Setup — prerequisites and getting started
3. API Reference — every public function/method with params, return types, and examples
4. Usage Examples — 2–3 real-world usage scenarios
5. Gotchas — common mistakes and how to avoid them
</task>

<output_format>
Markdown with:
- H2 for major sections
- Code blocks with language tags
- Tables for parameter descriptions
</output_format>

<constraints>
- Write for the specified audience level.
- Do NOT document private/internal APIs.
- Every code example must be runnable as-is.
</constraints>
```

---

## 7. UI / Frontend Implementation

```xml
<role>
Act as a senior frontend engineer specialising in [framework] with strong UI/UX sensibility.
</role>

<context>
Project: [project name]
Stack: [React/Vue/Svelte + version, CSS approach, design system]
Design reference: [Figma link, screenshot, or description]
</context>

<visual_reference>
[Attach or describe the mockup, screenshot, or desired visual outcome]
</visual_reference>

<task>
Implement [component/page/feature]:
1. [Layout requirements]
2. [Interactive behaviour — hover, click, animations]
3. [Responsive behaviour — breakpoints, mobile adaptation]
4. [Accessibility — ARIA labels, keyboard navigation, contrast]
</task>

<output_format>
- Component file(s) in [TypeScript/JavaScript]
- Styling in [CSS Modules / styled-components / Tailwind / vanilla CSS]
- No placeholder images — use [approach for real assets]
</output_format>

<constraints>
- Match the design reference pixel-for-pixel where specified.
- Support [minimum breakpoints: 320px, 768px, 1024px].
- Achieve Lighthouse accessibility score ≥ 90.
- Do NOT use external UI component libraries unless already in the project.
</constraints>
```

---

## 8. Refactoring

```xml
<role>
Act as a senior [language] engineer focused on code quality and maintainability.
</role>

<context>
Project: [project name]
Motivation: [why refactor — tech debt, performance, readability, pattern change]
</context>

<reference>
[Paste the code to refactor — include file paths]
</reference>

<task>
Refactor the code to:
1. [Specific improvement — e.g., extract into smaller functions]
2. [Specific improvement — e.g., replace callbacks with async/await]
3. [Specific improvement — e.g., apply Strategy pattern]

Preserve all existing behaviour — this is a pure refactor, not a feature change.
</task>

<output_format>
Show changes in diff format (- removed, + added).
After the diff, list every behavioural guarantee that is preserved.
</output_format>

<constraints>
- Zero behaviour changes — all existing tests must still pass.
- Do NOT rename public API surfaces.
- Do NOT change file structure unless explicitly requested.
</constraints>
```

---

## Usage Tips

1. **Don't use every section** — pick the ones relevant to your task
2. **Add real code** in `<reference>` — the model performs dramatically better with grounding
3. **Start simple, iterate** — use the template as a starting point, then refine based on output quality
4. **Attach visuals** for UI tasks — a screenshot is worth a thousand words of description
5. **Score your prompt** with `references/scoring-rubric.md` before sending — aim for 15+/20
