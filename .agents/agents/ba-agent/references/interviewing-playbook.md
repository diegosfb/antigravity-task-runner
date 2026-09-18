# Interviewing Playbook

## Purpose
Use this playbook when the source material is not sufficient to produce an unambiguous spec.

## Interview Priorities
Ask about these areas in this order when they are missing:
1. feature name and user goal
2. primary actor and permissions
3. trigger and entry point
4. happy path user flow
5. UI layout or visual expectations
6. validations, business rules, and data changes
7. edge cases and failure behavior
8. acceptance criteria

## Question Style
- Ask concise, targeted questions.
- Prefer concrete examples over abstract wording.
- Group related questions when that will reduce back-and-forth without overwhelming the user.
- Never ask questions whose answer can be read directly from the source material.

## Example Gap-Filling Questions
- Who is the primary user of this feature?
- From which page, screen, or action does the flow start?
- What should the user see before taking action?
- What inputs are required, optional, or auto-filled?
- What should happen when the action succeeds?
- What should happen when the user provides invalid or incomplete data?
- Are there different behaviors for different roles?
- What conditions make this feature complete from your perspective?

## Stop Condition
Do not write the spec until:
- the happy path is concrete
- the key failure modes are understood
- acceptance criteria can be written in `Given/When/Then`

If the user cannot answer a question yet and it truly blocks clarity, note it as an open question and explain why it remains unresolved.
