# The `.agent/` Directory

## Skills & Agent Definitions

Most tools automatically discover skills and agent definitions placed in `.agent/skills/`. The Antigravity community strongly recommends using symbolic links for installation so that when you update your definitions repository via `git pull`, all tools automatically sync the latest content.

**Recommended workflow:**

```bash
# Point .agent/skills to your shared definitions folder
mkdir -p .agent/skills
ln -s ~/my-custom-agents/skills/* .agent/skills/
```

Skills and agent definitions placed in `<workspace-root>/.agent/skills/` are workspace-scoped — available only within that specific project. This is ideal for project-specific configurations like deployment scripts or proprietary framework boilerplate.

The symlink approach is preferred over copying files because it keeps everything in sync — a `git pull` on your definitions repo is immediately reflected in every project that symlinks to it.

---

## Symlinks to Other AI Tools' Config Folders

### What happens when Antigravity's `.agent/` directory contains symlinks pointing to global config folders of other AI tools

Antigravity traverses the `.agent/` directory looking for agent/skill definitions and might pick up those symlinked configs as additional context/rules — effectively giving it visibility into your cross-tool preferences and instructions. For some workflows this could be intentional and useful.

### Risks

- **Context pollution** — instructions written for Claude Code or Codex are not necessarily compatible with Antigravity/Gemini. Conflicting rules could confuse the agent or cause unpredictable behavior.
- **Symlink traversal depth** — if Antigravity's directory walker follows symlinks recursively without depth limits, it could end up reading far more than expected from those config trees.
- **Credential leakage** — traversing unintended config trees increases the risk of exposing sensitive data.

This setup would almost certainly not produce a useful cross-tool "unified agent config". The more likely outcome is credential leakage risk combined with context noise.

---

## Recommendation

Only place custom skills and agents specific to your workflow in `.agent/` — do not symlink entire config folders from other AI agent platforms.
