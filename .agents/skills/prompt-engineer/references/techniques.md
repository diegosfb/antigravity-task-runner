# Prompt Engineering Techniques Catalogue

A comprehensive reference of prompting techniques with examples. Use these when rewriting or diagnosing prompts.

---

## 1. Persona / Role Framing

**What:** Assign the LLM a specific expert identity to anchor tone, depth, and domain knowledge.

**When to use:** Always — especially for technical tasks where domain expertise matters.

**Example:**
```
Act as a senior backend engineer with 10 years of experience in Node.js, PostgreSQL, and AWS infrastructure. You specialise in performance-critical REST APIs.
```

**Anti-pattern:** Generic "You are a helpful assistant" or no role at all.

---

## 2. Specificity & Precision

**What:** Replace vague language with exact, measurable requirements.

**When to use:** Always. Vagueness is the #1 cause of poor outputs.

| Vague ❌ | Specific ✅ |
|---|---|
| "Write some tests" | "Write 5 Jest unit tests for the `calculateScore()` function covering edge cases: empty input, negative values, overflow, null, and a valid happy path." |
| "Make it faster" | "Reduce the p95 latency of the `/api/scores` endpoint from 450ms to under 100ms. Profile the N+1 query in `ScoreRepository.getAll()`." |
| "Fix the bug" | "The `useEffect` in `GameBoard.tsx:L42` fires on every render instead of only when `level` changes. Add `[level]` to the dependency array." |

---

## 3. Few-Shot Examples

**What:** Provide 2–3 concrete input→output pairs so the model learns the desired pattern.

**When to use:**
- Output format is non-obvious
- Classification or transformation tasks
- When "show, don't tell" is more efficient than describing rules

**Example:**
```
Convert the following function names from camelCase to snake_case:

Input: getUserName → Output: get_user_name
Input: calculateTotalScore → Output: calculate_total_score
Input: setPlayerPosition → Output: set_player_position

Now convert: handleGameOver →
```

**Tip:** Include at least one edge case in your examples.

---

## 4. Chain-of-Thought (CoT) Reasoning

**What:** Ask the model to show its reasoning step-by-step before giving a final answer.

**When to use:**
- Debugging complex issues
- Architectural decisions with trade-offs
- Multi-step logic, algorithms, or math
- Any task where the model might "jump to conclusions"

**Trigger phrases:**
- "Think step by step."
- "Before answering, reason through each option and its trade-offs."
- "Walk me through your analysis before proposing a solution."

**Example:**
```
Debug this WebSocket disconnection issue. Think step by step:
1. First, identify what triggers the disconnect (timeout? error? client-side?)
2. Then, trace the connection lifecycle in the code
3. Finally, propose a fix with rationale for why it addresses the root cause
```

---

## 5. XML / Structured Delimiters

**What:** Use XML-style tags to clearly separate logical sections of a complex prompt.

**When to use:** Prompts longer than ~5 lines, or when mixing context, instructions, and constraints.

**Standard tags:**
```xml
<role>       — persona definition
<context>    — background, stack, project info
<task>       — numbered instructions
<examples>   — input/output pairs
<output_format> — exact output structure
<constraints>   — negative rules, limits
<reference>     — code snippets, docs, or schemas to ground the task
```

**Why it works:** Models parse XML-delimited sections more reliably than free-form prose, reducing section-bleed and improving instruction adherence.

---

## 6. Output Format Specification

**What:** Define the exact structure, format, and style of the expected output.

**When to use:** Always when the output is not free-form prose.

**Spectrum of specificity:**
```
Weak:    "Return the results"
Better:  "Return the results as JSON"
Best:    "Return a JSON object matching this TypeScript interface:
          interface Result { status: 'pass' | 'fail'; message: string; line: number; }"
```

**Common formats:**
- JSON with a schema or TypeScript interface
- Markdown with heading hierarchy
- Code-only (no explanations, no markdown fences)
- Diff format (`+ added`, `- removed`)
- Table with specified columns

---

## 7. Negative Constraints

**What:** Explicitly state what the model should NOT do.

**When to use:**
- The model tends to over-generate (explanations, imports, boilerplate)
- Security-sensitive contexts (no hardcoded secrets, no eval)
- When you need concise output

**Example:**
```
<constraints>
- Do NOT add comments or docstrings to the code.
- Do NOT import modules that are not already imported in the file.
- Do NOT change the function signature.
- Do NOT wrap the output in markdown code fences.
- Limit the response to the changed function only.
</constraints>
```

**Tip:** Pair negatives with positives: "Do X instead of Y."

---

## 8. Context Grounding

**What:** Supply the model with real code, schemas, docs, or error messages so it reasons from facts rather than guessing.

**When to use:**
- Debugging (include the actual error stack trace)
- Refactoring (include the actual code, not a summary)
- API integration (include the actual endpoint docs or schema)
- Any task where hallucination risk is high

**Example:**
```
<reference>
// Current implementation — GameBoard.tsx:L38-55
useEffect(() => {
  const interval = setInterval(tick, speed);
  return () => clearInterval(interval);
}); // BUG: missing dependency array
</reference>

<task>
Fix the useEffect so it only re-creates the interval when `speed` changes.
</task>
```

---

## 9. Iterative Decomposition

**What:** Break a complex task into sequential sub-tasks, each with its own clear instruction.

**When to use:**
- The task has more than 3 distinct steps
- Different steps require different expertise
- You want to review intermediate output before proceeding

**Example:**
```
Complete these steps in order:

Step 1: Analyse the current database schema in <reference> and identify normalisation violations.
Step 2: Propose a revised schema that reaches 3NF. Present as a CREATE TABLE migration.
Step 3: Write a data migration script that preserves existing records.
Step 4: Update the Prisma schema to match.
```

---

## 10. Visual & Artefact Requests

**What:** Ask the user for screenshots, diagrams, mockups, or screen recordings when the task involves UI, layout, or visual behaviour.

**When to use:**
- UI bugs ("it looks wrong" — wrong how?)
- Design implementation (what does "like the Figma" mean without the Figma?)
- Responsive layout issues (which breakpoint? which device?)
- Animation or interaction behaviour (timing, easing, triggers)

**Clarification prompts:**
- "Can you share a screenshot of the current behaviour?"
- "Do you have a mockup or Figma link for the desired design?"
- "Can you screen-record the interaction so I can see the timing?"

---

## 11. Temperature & Model Selection Guidance

| Task type | Recommended temperature | Suggested models |
|---|---|---|
| Code generation | 0.0–0.2 | Claude Sonnet 4, GPT-4o |
| Creative writing | 0.7–1.0 | Claude Sonnet 4, GPT-4o |
| Classification / extraction | 0.0 | Any capable model |
| Brainstorming | 0.8–1.0 | Claude Sonnet 4, GPT-4o |
| Debugging | 0.0–0.1 | Claude Sonnet 4, GPT-4o |
| Architecture decisions | 0.3–0.5 | Claude Opus 4, o3 |

---

## 12. Meta-Prompting

**What:** Use a prompt to generate or improve other prompts.

**When to use:**
- Building reusable prompt templates
- Optimising prompts for specific models
- Creating prompt libraries for teams

**Example:**
```
You are an expert prompt engineer. I will give you a task description.
Generate three candidate prompts for that task, each using a different technique
(few-shot, CoT, structured output). Then evaluate which is best for accuracy
and explain why.
```
