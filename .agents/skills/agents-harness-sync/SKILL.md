---
name: agents-harness-sync
description: Security-scan, audit, normalize, repair, synchronize, and deploy canonical agent definitions under .agents/agents to supported harness directories. Use when asked to enforce agent quality and format, migrate legacy definitions, validate references, or regenerate cross-harness agent adapters and links while preserving behavior.
---

# Agents Harness Sync

Treat `.agents/agents/` as the canonical agent source. Inspect every relevant agent before editing it. Preserve behavior, responsibilities, constraints, delegation logic, and useful instructions; normalize structure rather than simplifying content.

Read `references/canonical-agent-template.md` before validating or modifying agents. Use it as the authoritative canonical format and example.

Use `scripts/validate_agent_format.py` as the mandatory objective validation gate. It has no third-party dependencies.

## Workflow

1. Read and invoke `.agents/skills/agent-content-security/SKILL.md` against the complete `.agents` tree before trusting or executing bundled content. Save its JSON output to a temporary path for review. Review high and critical findings in context; stop before synchronization when a plausible live credential or confirmed malicious or unsafe executable behavior remains unresolved. Do not print suspected secret values.
2. Discover agent definitions under `.agents/agents/`.
3. Accept all canonical locations:
   - `.agents/agents/<name>.md`
   - `.agents/agents/<name>/<name>.md`
   - `.agents/agents/<parent-agent>/subagents/<name>/<name>.md`
   Do not migrate between these layouts solely for normalization. Treat other layouts as legacy and migrate them to the closest appropriate canonical form only when safe.
4. Run `python3 .agents/skills/agents-harness-sync/scripts/validate_agent_format.py --root .` to establish the baseline. Parse YAML frontmatter and Markdown body separately when repairing its findings.
5. Require `name`, `description`, and `role`. Permit canonical optional fields documented in the reference.
6. Ensure `name` matches the filename exactly.
7. Require `role` to be one of `agent`, `orchestrator`, or `subagent`.
8. Validate every `skills` entry against `.agents/skills/<skill-name>/SKILL.md`.
9. Validate every `subagents` entry by agent name against a definition in any canonical location above.
10. Infer missing metadata from the existing instructions. Do not invent capabilities unsupported by the agent content.
11. For orchestrators, make delegation responsibilities explicit and ensure declared subagents agree with the body.
12. For subagents, make scope and expected return to the caller explicit.
13. Normalize `inputs`, `outputs`, and `execution` when the agent has meaningful contracts or orchestration behavior. Do not add verbose empty sections to trivial agents.
14. Keep reusable procedures in skills instead of duplicating full skill methodologies in agents.
15. Keep harness-specific settings out of the canonical definition unless they are genuinely portable. Do not add Claude-, Codex-, Gemini-, Antigravity-, or OpenCode-only syntax to the canonical body.
16. Preserve unknown frontmatter only when it carries useful canonical semantics; otherwise report it before removing it.
17. Detect missing references, circular or suspicious delegation, duplicate/overlapping agents, and orphaned subagents. Repair only when the intended correction is supported by the repository; otherwise report the ambiguity.
18. Rerun the validator after edits. Do not report compliance while it returns a nonzero status. Repair supported findings; report genuinely ambiguous findings as unresolved blockers.
19. After the validator passes, run `.agents/skills/agents-harness-sync/scripts/sync-agents.sh --dry-run` and repair synchronization errors until it succeeds.
20. As the final workflow step, run `.agents/skills/agents-harness-sync/scripts/sync-agents.sh` to synchronize the validated canonical definitions into the supported harness directories.
21. Do not edit generated harness copies such as `.claude/agents/`, `.gemini/agents/`, `.opencode/agents/`, or `.codex/agents/` directly. Regenerate them only through the synchronization script.

## Mandatory completion gate

Before reporting an agent library as compliant, verify every item below:

- Every definition uses one of the three canonical locations.
- Frontmatter and a non-empty Markdown body are present.
- `name`, `description`, and `role` are present and valid.
- The name matches both the filename and its containing agent directory when applicable.
- Agent names are unique.
- Every declared skill and subagent resolves.
- Nested subagents use `role: subagent`, resolve to their parent, and are declared by that parent.
- Every orchestrator declares `inputs`, `outputs`, and `execution`, including delegation and final authority.
- Every subagent has a bounded scope and an explicit expected-return or output contract.
- Harness-specific frontmatter is absent from canonical definitions.
- Unknown metadata, suspicious delegation, overlap, circularity, and orphaning were inspected and reported.
- The content-security scan was reviewed, with no unresolved confirmed high-risk behavior or plausible live credential exposure.
- The objective validator exits successfully.
- The synchronization dry run and final synchronization both exit successfully.

The validator covers deterministic checks. The inspecting agent remains responsible for semantic checks such as overlap, whether contracts reflect actual behavior, and whether unknown metadata is useful. List each semantic check and its result in the final report; never replace it with a generic “validated” statement.

## Required behavior

When asked to ensure compliance, make the necessary canonical-file edits directly rather than only describing them. Never delete useful operating instructions just to shorten an agent. Distinguish explicit facts from inferred metadata.

After completion, report content-security findings and dispositions, agents inspected, migrated, modified, roles identified, agent/subagent relationships, skill references validated, every semantic check above, validator result, unresolved warnings or blockers, and both synchronization results.
