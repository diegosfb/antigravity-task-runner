I want you to refactor my AGENTS.md file to follow progressive disclosure principles. This process must run unattended; do not ask for confirmation or input. Use your best judgment to resolve ambiguities and contradictions.

Follow these steps:

1. **Resolve contradictions**: Identify any instructions that conflict with each other. For each contradiction, pick the most sensible, modern, or specific version that fits the current codebase. Merge them if they are complementary.

2. **Identify the essentials**: Extract only what belongs in the root AGENTS.md:
   - **One-sentence project description**: If missing or generic, infer a descriptive one-sentence summary from the codebase (e.g., "A reusable FastAPI service scaffold with Docker, GCP Cloud Run, Render, and Playwright e2e tests.").
   - **Actual Commands**: Identify the real build, test, and deployment commands used in this repository. Search the codebase (e.g., package.json scripts, requirements.txt, scripts/ folder, Makefile, or common framework patterns like pytest) to find them. Replace any generic or incorrect placeholder commands (like `vsce package` or `npm run compile` if they don't apply) with actual project commands.
   - **Essentials**: Include only instructions truly relevant to every single task.

3. **Ensure Required Sections**: Per the repository's maintenance rules, ensure the following sections are present and populated: `Project Description`, `Current Focus`, `Recent Changes`, and `Commands`. If any are missing (like `Current Focus` or `Recent Changes`), add them with appropriate initial content or placeholders derived from the project's git history or current state.

4. **Group the rest**: Organize remaining instructions into logical categories (e.g., TypeScript conventions, testing patterns, API design, Git workflow). For each group, create a separate markdown file.

5. **Create the file structure**: Output:
   - A minimal root AGENTS.md with markdown links to the separate files.
   - Each separate file containing its relevant instructions.
   - A suggested docs/ folder structure if appropriate.

6. **Flag for deletion**: Remove any instructions that are:
   - Redundant (the agent already knows this by default).
   - Too vague to be actionable.
   - Overly obvious (e.g., "write clean code").

