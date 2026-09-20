# Prompt Scoring Rubric

Use this rubric to diagnose a prompt's quality before rewriting. Score each dimension 0–2. A prompt scoring **≤ 8 / 20** should be rewritten; **9–14** needs targeted fixes; **15+** is production-ready.

---

## Scoring Dimensions

| # | Dimension | 0 — Missing | 1 — Partial | 2 — Strong |
|---|---|---|---|---|
| 1 | **Role / Persona** | No role defined; model defaults to generic assistant | Role mentioned but vague ("you are a developer") | Specific expert persona with domain, seniority, and specialisation |
| 2 | **Task Clarity** | Ambiguous or multi-interpretation ("help me with this code") | Task is identifiable but lacks precision or boundaries | Single, precise, measurable task with clear success criteria |
| 3 | **Context / Grounding** | No project context, no code, no environment details | Some context but key info missing (e.g., framework mentioned, version omitted) | Full context: language, framework, version, relevant code snippets, error messages |
| 4 | **Output Format** | No format specified; model guesses | Format hinted ("give me JSON") but no schema or structure | Exact format defined: schema, interface, heading hierarchy, or annotated example |
| 5 | **Constraints / Negatives** | No boundaries; model may over-generate or hallucinate | Some constraints but incomplete (e.g., "keep it short") | Explicit positive and negative constraints covering scope, length, style, and exclusions |
| 6 | **Examples (Few-Shot)** | No examples provided | 1 example, or examples that don't cover edge cases | 2–3 examples including at least one edge case, showing input→output mapping |
| 7 | **Reasoning Trigger (CoT)** | No reasoning requested; model may skip analysis | Implicit reasoning ("explain your thinking") | Explicit CoT: "Think step by step", numbered reasoning stages, or structured analysis |
| 8 | **Structure / Delimiters** | Wall of text; sections bleed into each other | Some structure (paragraphs, bullets) but no clear section boundaries | XML tags or clear markdown sections separating role, context, task, format, constraints |
| 9 | **Specificity** | Vague language throughout ("make it better", "fix this") | Mix of specific and vague instructions | Every instruction is precise, measurable, and unambiguous |
| 10 | **Iteration Readiness** | One-shot with no path to refine | Acknowledges iteration but no mechanism | Built-in feedback loop: "After generating, I will review and provide corrections" |

---

## Quick Scoring Template

Use this when diagnosing a user's prompt:

```
### Prompt Score: [X] / 20

| Dimension | Score | Notes |
|---|---|---|
| Role / Persona | _ / 2 | |
| Task Clarity | _ / 2 | |
| Context / Grounding | _ / 2 | |
| Output Format | _ / 2 | |
| Constraints / Negatives | _ / 2 | |
| Examples (Few-Shot) | _ / 2 | |
| Reasoning Trigger (CoT) | _ / 2 | |
| Structure / Delimiters | _ / 2 | |
| Specificity | _ / 2 | |
| Iteration Readiness | _ / 2 | |

**Verdict:** [Rewrite needed ≤8 | Targeted fixes 9–14 | Production-ready 15+]
```

---

## Severity Classification

After scoring, classify each weak dimension by impact:

| Severity | Criteria | Action |
|---|---|---|
| 🔴 **Critical** | Score 0 on Task Clarity, Context, or Output Format | Must fix — prompt will produce unreliable results |
| 🟡 **Important** | Score 0–1 on Role, Constraints, or Specificity | Should fix — output quality will be inconsistent |
| 🟢 **Nice-to-have** | Score 0–1 on Examples, CoT, Structure, or Iteration | Fix if time allows — improves edge-case handling and maintainability |

---

## Red Flags (Automatic Fail)

These patterns indicate the prompt needs a full rewrite regardless of score:

- **"Do everything"** — prompt asks for multiple unrelated tasks in one shot
- **"Make it good"** — no success criteria, purely subjective
- **Hardcoded secrets** — API keys, passwords, or tokens in the prompt
- **Conflicting instructions** — e.g., "be concise" + "explain every detail"
- **No grounding for factual claims** — asks model to state facts about APIs, libraries, or services without providing documentation
- **Copy-paste of entire codebase** — no focus, model gets lost in noise

---

## Scoring Examples

### Example A — Weak Prompt (Score: 3/20)

> "Write a React component for my app"

| Dimension | Score | Notes |
|---|---|---|
| Role | 0 | No persona |
| Task Clarity | 0 | What component? What does it do? |
| Context | 0 | What app? What framework version? |
| Output Format | 1 | Implied: code |
| Constraints | 0 | None |
| Examples | 0 | None |
| CoT | 0 | Not needed but not harmful |
| Structure | 0 | Single sentence |
| Specificity | 0 | Completely vague |
| Iteration | 0 | One-shot |

### Example B — Strong Prompt (Score: 17/20)

> Act as a senior React/TypeScript engineer specialising in game UIs.
>
> **Context:** BattleTris is a Tetris clone built with React 18, TypeScript 5, and Vite. The game board is a 10×20 grid rendered via Canvas.
>
> **Task:** Create a `ScoreDisplay` component that:
> 1. Shows current score, level, and lines cleared
> 2. Animates score changes with a counting-up effect
> 3. Uses the existing `useGameState()` hook for data
>
> **Output:** TypeScript React functional component. No class components. Use CSS modules for styling.
>
> **Constraints:**
> - Do not modify existing files
> - No external animation libraries — use CSS transitions or requestAnimationFrame
> - Component must be under 80 lines

| Dimension | Score | Notes |
|---|---|---|
| Role | 2 | Specific persona |
| Task Clarity | 2 | Three numbered requirements |
| Context | 2 | Stack, project, and architecture described |
| Output Format | 2 | TypeScript + CSS modules specified |
| Constraints | 2 | Scope, library, and size limits |
| Examples | 0 | None provided |
| CoT | 0 | Not needed for this task |
| Structure | 2 | Clear sections |
| Specificity | 2 | Every requirement is precise |
| Iteration | 1 | Implicit (could add explicit feedback loop) |
